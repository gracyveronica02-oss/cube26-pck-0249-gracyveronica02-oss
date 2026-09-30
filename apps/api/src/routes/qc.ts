import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { InMemoryRepositories } from '@pack-manager/database';
import { PackStatus } from '@pack-manager/shared';

export interface QCRouteOptions {
  repos: InMemoryRepositories;
}

export const qcRoutes: FastifyPluginAsync<QCRouteOptions> = async (
  fastify: FastifyInstance,
  opts: QCRouteOptions
) => {
  const { repos } = opts;

  // GET /api/v1/qc/queue (QC Queue for STOP_AND_FIX and MANUAL_REVIEW packs)
  fastify.get('/qc/queue', async (request, reply) => {
    const orgId = request.auth!.orgId;

    const stopPacks = await repos.listPacks(orgId, PackStatus.STOP_AND_FIX);
    const reviewPacks = await repos.listPacks(orgId, PackStatus.MANUAL_REVIEW);
    const queuePacks = [...stopPacks, ...reviewPacks];

    const queueItems = await Promise.all(
      queuePacks.map(async pack => {
        const order = await repos.getOrderById(orgId, pack.orderId);
        const analyses = await repos.listAnalysesForPack(orgId, pack.packId);
        const latestAnalysis = analyses[analyses.length - 1];

        const waitTimeMinutes = Math.floor(
          (Date.now() - new Date(pack.updatedAt).getTime()) / 60000
        );

        return {
          packId: pack.packId,
          unitId: pack.unitId,
          orderId: pack.orderId,
          channel: order?.channel || 'direct',
          packingStation: pack.packingStation,
          operatorId: pack.operatorId,
          status: pack.status,
          waitTimeMinutes,
          discrepancies: latestAnalysis?.discrepancies || [],
          latestAnalysisId: latestAnalysis?.analysisId,
          photoCount: pack.images.length,
          updatedAt: pack.updatedAt,
        };
      })
    );

    // Sort by longest wait time first (highest priority)
    queueItems.sort((a, b) => b.waitTimeMinutes - a.waitTimeMinutes);

    return reply.send({
      totalCount: queueItems.length,
      items: queueItems,
    });
  });
};
