import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  InMemoryRepositories,
  IObjectStorage,
  StoragePaths,
} from '@pack-manager/database';
import { PackStatus } from '@pack-manager/shared';
import { IVerificationQueue } from '@pack-manager/worker';

export interface PacksRouteOptions {
  repos: InMemoryRepositories;
  storage: IObjectStorage;
  queue: IVerificationQueue;
}

const CreatePackBodySchema = z.object({
  unitId: z.string().min(1),
  orderId: z.string().min(1),
  packingStation: z.string().optional(),
  operatorId: z.string().optional(),
});

const UploadImageBodySchema = z.object({
  imageBase64: z.string().min(1),
  viewAngle: z.enum(['TOP_DOWN', 'ANGLED', 'DETAIL']).default('TOP_DOWN'),
});

export const packsRoutes: FastifyPluginAsync<PacksRouteOptions> = async (
  fastify: FastifyInstance,
  opts: PacksRouteOptions
) => {
  const { repos, storage, queue } = opts;

  // POST /api/v1/packs
  fastify.post('/packs', async (request, reply) => {
    const orgId = request.auth!.orgId;
    const body = CreatePackBodySchema.parse(request.body);

    // Verify order exists
    const order = await repos.getOrderById(orgId, body.orderId);
    if (!order) {
      return reply.status(404).send({
        error: 'ORDER_NOT_FOUND',
        message: `Order ${body.orderId} does not exist in this organization`,
      });
    }

    const packId = `PACK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const created = await repos.createPack({
      packId,
      orgId,
      unitId: body.unitId,
      orderId: body.orderId,
      packingStation: body.packingStation || 'STATION-01',
      operatorId: body.operatorId || request.auth!.userId,
      status: PackStatus.RECEIVED,
      images: [],
      analyses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return reply.status(201).send(created);
  });

  // GET /api/v1/packs/:packId
  fastify.get('/packs/:packId', async (request, reply) => {
    const orgId = request.auth!.orgId;
    const { packId } = request.params as { packId: string };

    const pack = await repos.getPackById(orgId, packId);
    if (!pack) {
      return reply.status(404).send({ error: 'PACK_NOT_FOUND', message: `Pack ${packId} not found` });
    }

    const order = await repos.getOrderById(orgId, pack.orderId);
    const analyses = await repos.listAnalysesForPack(orgId, packId);

    // Attach presigned URLs to images
    const imagesWithUrls = await Promise.all(
      pack.images.map(async img => ({
        ...img,
        url: await storage.getPresignedUrl(img.storagePath),
      }))
    );

    return reply.send({
      ...pack,
      images: imagesWithUrls,
      order,
      analysisCount: analyses.length,
    });
  });

  // POST /api/v1/packs/:packId/images
  fastify.post('/packs/:packId/images', { bodyLimit: 12 * 1024 * 1024 }, async (request, reply) => {
    const orgId = request.auth!.orgId;
    const { packId } = request.params as { packId: string };
    const body = UploadImageBodySchema.parse(request.body);

    const pack = await repos.getPackById(orgId, packId);
    if (!pack) {
      return reply.status(404).send({ error: 'PACK_NOT_FOUND', message: `Pack ${packId} not found` });
    }

    const imageId = `IMG-${Date.now()}`;
    const key = StoragePaths.packOriginal(orgId, packId, imageId);
    const buffer = Buffer.from(body.imageBase64, 'base64');

    await storage.upload(key, buffer, 'image/jpeg');

    const packImage = {
      packImageId: imageId,
      packId,
      storagePath: key,
      viewAngle: body.viewAngle,
      isValid: true,
      capturedAt: new Date(),
    };

    await repos.addPackImage(orgId, packId, packImage);

    const presignedUrl = await storage.getPresignedUrl(key);

    return reply.status(201).send({
      ...packImage,
      url: presignedUrl,
    });
  });

  // POST /api/v1/packs/:packId/analyze (Asynchronous, Section 21)
  fastify.post('/packs/:packId/analyze', async (request, reply) => {
    const orgId = request.auth!.orgId;
    const { packId } = request.params as { packId: string };
    const idempotencyKey = request.idempotencyKey || `idem_${Date.now()}`;

    const pack = await repos.getPackById(orgId, packId);
    if (!pack) {
      return reply.status(404).send({ error: 'PACK_NOT_FOUND', message: `Pack ${packId} not found` });
    }

    // Idempotency check: if job exists for this key, return it
    const existingJob = await repos.getJobByIdempotencyKey(orgId, idempotencyKey);
    if (existingJob) {
      return reply.status(200).send(existingJob);
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const job = await repos.createJob({
      jobId,
      orgId,
      packId,
      idempotencyKey,
      status: 'PENDING',
      attempt: 1,
      maxAttempts: 3,
      createdAt: new Date(),
    });

    // Enqueue job for background worker
    await queue.enqueue({
      orgId,
      packId,
      jobId,
      idempotencyKey,
      actorId: request.auth!.userId,
    });

    return reply.status(202).send(job);
  });

  // POST /api/v1/packs/:packId/rescan (Section 19)
  fastify.post('/packs/:packId/rescan', async (request, reply) => {
    const orgId = request.auth!.orgId;
    const { packId } = request.params as { packId: string };
    const idempotencyKey = request.idempotencyKey || `idem_rescan_${Date.now()}`;

    const pack = await repos.getPackById(orgId, packId);
    if (!pack) {
      return reply.status(404).send({ error: 'PACK_NOT_FOUND', message: `Pack ${packId} not found` });
    }

    const jobId = `job_rescan_${Date.now()}`;
    const job = await repos.createJob({
      jobId,
      orgId,
      packId,
      idempotencyKey,
      status: 'PENDING',
      attempt: 1,
      maxAttempts: 3,
      createdAt: new Date(),
    });

    await queue.enqueue({
      orgId,
      packId,
      jobId,
      idempotencyKey,
      actorId: request.auth!.userId,
    });

    return reply.status(202).send({
      message: 'Rescan initiated',
      job,
    });
  });

  // GET /api/v1/packs (Filtered list with pagination)
  fastify.get('/packs', async (request, reply) => {
    const orgId = request.auth!.orgId;
    const query = request.query as {
      status?: string;
      orderId?: string;
      station?: string;
      limit?: string;
      offset?: string;
    };

    let packs = await repos.listPacks(orgId, query.status as PackStatus | undefined);

    if (query.orderId) {
      packs = packs.filter(p => p.orderId === query.orderId);
    }
    if (query.station) {
      packs = packs.filter(p => p.packingStation === query.station);
    }

    const total = packs.length;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const paginated = packs.slice(offset, offset + limit);

    return reply.send({
      total,
      offset,
      limit,
      packs: paginated,
    });
  });

  // POST /api/v1/batch-analyze (Batch verification of up to 10 packs)
  fastify.post('/batch-analyze', async (request, reply) => {
    const orgId = request.auth!.orgId;
    const body = z.object({
      packIds: z.array(z.string().min(1)).min(1).max(10),
    }).parse(request.body);

    const jobs = [];
    const notFound = [];

    for (const packId of body.packIds) {
      const pack = await repos.getPackById(orgId, packId);
      if (!pack) {
        notFound.push(packId);
        continue;
      }

      const idempotencyKey = `batch_${packId}_${Date.now()}`;
      const jobId = `job_batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const job = await repos.createJob({
        jobId,
        orgId,
        packId,
        idempotencyKey,
        status: 'PENDING',
        attempt: 1,
        maxAttempts: 3,
        createdAt: new Date(),
      });

      await queue.enqueue({
        orgId,
        packId,
        jobId,
        idempotencyKey,
        actorId: request.auth!.userId,
      });

      jobs.push(job);
    }

    return reply.status(202).send({
      enqueuedCount: jobs.length,
      jobs,
      notFound,
    });
  });
};
