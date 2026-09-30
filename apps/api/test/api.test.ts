import { describe, it, expect, beforeEach } from 'vitest';
import { buildServer } from '../src/index.js';
import {
  InMemoryRepositories,
  InMemoryObjectStorage,
} from '@pack-manager/database';
import { MockVisionProvider } from '@pack-manager/vision';
import { InMemoryWorkerQueue, PackVerificationPipeline } from '@pack-manager/worker';
import { UserRole } from '@pack-manager/shared';
import { parseLookupCode } from '../src/routes/orders.js';

describe('Fastify REST API Specification (Section 25, 28, 29, 32)', () => {
  let repos: InMemoryRepositories;
  let storage: InMemoryObjectStorage;
  let queue: InMemoryWorkerQueue;
  let visionProvider: MockVisionProvider;
  let app: ReturnType<typeof buildServer>;

  const orgId = 'org_demo_alpha';
  const orderId = 'ORD-101';

  beforeEach(async () => {
    repos = new InMemoryRepositories();
    storage = new InMemoryObjectStorage();
    visionProvider = new MockVisionProvider();

    const pipeline = new PackVerificationPipeline({
      packRepo: repos,
      orderRepo: repos,
      productRepo: repos,
      analysisRepo: repos,
      jobRepo: repos,
      auditRepo: repos,
      storage,
      visionProvider,
    });

    queue = new InMemoryWorkerQueue(pipeline);

    app = buildServer({
      repos,
      storage,
      visionProvider,
      queue,
    });

    // Seed Order
    await repos.createOrder({
      orderId,
      orgId,
      externalOrderRef: 'EXT-ORD-101',
      channel: 'amazon_mfn',
      items: [
        {
          orderItemId: 'oi_1',
          orderId,
          sku: 'SKU-A',
          expectedQuantity: 1,
          productName: 'Black T-Shirt',
          criticalAttributes: ['color', 'size'],
          attributes: { color: 'black', size: 'M' },
        },
      ],
      createdAt: new Date(),
    });

    // Seed Product
    await repos.createProduct({
      productId: 'p_1',
      orgId,
      sku: 'SKU-A',
      productName: 'Black T-Shirt',
      criticalAttributes: ['color', 'size'],
      referenceImages: [],
      active: true,
      variants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('GET /health & GET /ready observability probes return 200 OK', async () => {
    const healthRes = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(healthRes.statusCode).toBe(200);
    expect(healthRes.json().status).toBe('UP');

    const readyRes = await app.inject({
      method: 'GET',
      url: '/ready',
    });
    expect(readyRes.statusCode).toBe(200);
    expect(readyRes.json().status).toBe('READY');
  });

  it('Loads an order ID encoded as JSON or an order URL from a QR payload', async () => {
    const jsonLookup = parseLookupCode(JSON.stringify({ order_id: orderId, unitId: 'CARTON-QR-1' }));
    expect(jsonLookup.orderId).toBe(orderId);
    expect(jsonLookup.unitId).toBe('CARTON-QR-1');

    const urlLookup = parseLookupCode(`https://packing.example/scan?orderId=${orderId}&unitId=CARTON-QR-2`);
    expect(urlLookup.orderId).toBe(orderId);
    expect(urlLookup.unitId).toBe('CARTON-QR-2');
    const cartonLookup = parseLookupCode(JSON.stringify({
      order_id: orderId,
      cartonLpn: 'CARTON-QR-3',
      packingStation: 'STATION-QR',
    }));
    expect(cartonLookup.orderId).toBe(orderId);
    expect(cartonLookup.unitId).toBe('CARTON-QR-3');
    expect(cartonLookup.packingStation).toBe('STATION-QR');

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/orders/lookup?code=${encodeURIComponent(JSON.stringify({ orderId, unitId: 'CARTON-QR-1' }))}`,
      headers: { 'x-org-id': orgId, 'x-user-role': UserRole.QC_OPERATOR },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().order.orderId).toBe(orderId);
    expect(response.json().unitId).toBe('CARTON-QR-1');

    const stationResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/orders/lookup?code=${encodeURIComponent(JSON.stringify({
        orderId,
        cartonId: 'CARTON-QR-4',
        packingStation: 'STATION-QR',
      }))}`,
      headers: { 'x-org-id': orgId, 'x-user-role': UserRole.QC_OPERATOR },
    });
    expect(stationResponse.json()).toMatchObject({
      unitId: 'CARTON-QR-4',
      packingStation: 'STATION-QR',
    });
  });

  it('Creates an editable manual order with seller-defined SKUs and product references', async () => {
    const headers = { 'x-org-id': orgId, 'x-user-role': UserRole.QC_OPERATOR };
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/orders',
      headers,
      payload: {
        orderId: 'ORD-MANUAL-001',
        items: [{
          sku: 'SELLER-SKU-001',
          productName: 'Handmade ceramic cup',
          expectedQuantity: 2,
          asin: 'B0SELLER001',
          referenceImage: 'https://seller.example/products/cup.png',
          criticalAttributes: ['color'],
          attributes: { color: 'blue' },
        }],
      },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json().items[0]).toMatchObject({
      sku: 'SELLER-SKU-001',
      expectedQuantity: 2,
      asin: 'B0SELLER001',
      referenceImage: 'https://seller.example/products/cup.png',
    });

    const updated = await app.inject({
      method: 'PATCH',
      url: '/api/v1/orders/ORD-MANUAL-001',
      headers,
      payload: {
        items: [{ ...created.json().items[0], expectedQuantity: 3 }],
      },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().items[0].expectedQuantity).toBe(3);
  });

  it('Product Catalog CRUD & RBAC Role Enforcement', async () => {
    // 1. Role VIEWER attempting to create product gets 403 Forbidden
    const forbiddenRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: {
        'x-org-id': orgId,
        'x-user-role': UserRole.VIEWER,
      },
      payload: {
        sku: 'SKU-NEW',
        productName: 'New Product',
      },
    });
    expect(forbiddenRes.statusCode).toBe(403);

    // 2. Role ADMIN successfully creates product
    const adminRes = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: {
        'x-org-id': orgId,
        'x-user-role': UserRole.ADMIN,
      },
      payload: {
        sku: 'SKU-NEW',
        productName: 'New Product',
        criticalAttributes: ['color'],
      },
    });
    expect(adminRes.statusCode).toBe(201);
    expect(adminRes.json().sku).toBe('SKU-NEW');

    // 3. Search products
    const searchRes = await app.inject({
      method: 'GET',
      url: '/api/v1/products?query=black',
      headers: { 'x-org-id': orgId },
    });
    expect(searchRes.statusCode).toBe(200);
    expect(searchRes.json().products).toHaveLength(1);
    expect(searchRes.json().products[0].sku).toBe('SKU-A');
  });

  it('Pack Lifecycle: Create Pack -> Upload Image -> Analyze (Async 202) -> View Dossier', async () => {
    // 1. Create Pack
    const createPackRes = await app.inject({
      method: 'POST',
      url: '/api/v1/packs',
      headers: { 'x-org-id': orgId },
      payload: {
        unitId: 'UNIT-0050',
        orderId,
      },
    });
    expect(createPackRes.statusCode).toBe(201);
    const pack = createPackRes.json();
    expect(pack.status).toBe('RECEIVED');
    const packId = pack.packId;

    // 2. Upload Image
    const fakeImageBase64 = Buffer.from('simulated-jpeg-data').toString('base64');
    const uploadRes = await app.inject({
      method: 'POST',
      url: `/api/v1/packs/${packId}/images`,
      headers: { 'x-org-id': orgId },
      payload: {
        imageBase64: fakeImageBase64,
        viewAngle: 'TOP_DOWN',
      },
    });
    expect(uploadRes.statusCode).toBe(201);
    expect(uploadRes.json().url).toContain('https://storage.local/presigned/');

    // 3. Trigger Async Analysis (Section 21: 202 Accepted)
    const idempotencyKey = 'unique_idem_101';
    const analyzeRes = await app.inject({
      method: 'POST',
      url: `/api/v1/packs/${packId}/analyze`,
      headers: {
        'x-org-id': orgId,
        'idempotency-key': idempotencyKey,
      },
    });
    expect(analyzeRes.statusCode).toBe(202);
    const job = analyzeRes.json();
    expect(job.status).toBe('PENDING');

    // 4. Repeated request with same Idempotency-Key returns existing job (Idempotency)
    const duplicateRes = await app.inject({
      method: 'POST',
      url: `/api/v1/packs/${packId}/analyze`,
      headers: {
        'x-org-id': orgId,
        'idempotency-key': idempotencyKey,
      },
    });
    expect(duplicateRes.statusCode).toBe(200);
    expect(duplicateRes.json().jobId).toBe(job.jobId);

    // 5. Worker processes job in background
    await queue.processAll();

    // 6. Pack detail view reflects updated status
    const packRes = await app.inject({
      method: 'GET',
      url: `/api/v1/packs/${packId}`,
      headers: { 'x-org-id': orgId },
    });
    expect(packRes.statusCode).toBe(200);
    expect(packRes.json().analysisCount).toBe(1);

    // 7. Get Analysis Dossier
    const analysesRes = await app.inject({
      method: 'GET',
      url: `/api/v1/packs/${packId}/analyses`,
      headers: { 'x-org-id': orgId },
    });
    expect(analysesRes.statusCode).toBe(200);
    const analysisList = analysesRes.json().analyses;
    expect(analysisList).toHaveLength(1);

    const analysisId = analysisList[0].analysisId;
    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/v1/analyses/${analysisId}`,
      headers: { 'x-org-id': orgId },
    });
    expect(detailRes.statusCode).toBe(200);
    expect(detailRes.json().analysis.analysisId).toBe(analysisId);
  });

  it('QC Queue & Operator Override Review (Section 18, 27)', async () => {
    // Seed a STOP_AND_FIX pack
    const packId = 'PACK-QC-999';
    await repos.createPack({
      packId,
      orgId,
      unitId: 'UNIT-0099',
      orderId,
      status: 'STOP_AND_FIX' as any,
      images: [],
      analyses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const analysis = await repos.createAnalysis({
      analysisId: 'ANL-QC-999',
      orgId,
      packId,
      analysisNumber: 1,
      status: 'COMPLETED',
      decision: 'STOP_AND_FIX' as any,
      detections: [],
      skuMatches: [],
      discrepancies: [
        {
          discrepancyId: 'disc_1',
          analysisId: 'ANL-QC-999',
          type: 'MISSING_ITEM' as any,
          expectedSku: 'SKU-A',
          details: {},
        },
      ],
      createdAt: new Date(),
    });

    // 1. QC queue displays the pack
    const queueRes = await app.inject({
      method: 'GET',
      url: '/api/v1/qc/queue',
      headers: { 'x-org-id': orgId },
    });
    expect(queueRes.statusCode).toBe(200);
    expect(queueRes.json().totalCount).toBeGreaterThanOrEqual(1);

    // 2. Operator performs review override
    const reviewRes = await app.inject({
      method: 'POST',
      url: `/api/v1/analyses/${analysis.analysisId}/review`,
      headers: {
        'x-org-id': orgId,
        'x-user-role': UserRole.QC_OPERATOR,
        'x-user-id': 'operator_jane',
      },
      payload: {
        action: 'APPROVED_OVERRIDE',
        operatorVerdict: 'SEAL',
        reasonCode: 'PACKAGING_VARIATION_VERIFIED_BY_HUMAN',
        notes: 'Item checked manually in box, barcode was hidden underneath fold.',
      },
    });
    expect(reviewRes.statusCode).toBe(201);
    expect(reviewRes.json().operatorVerdict).toBe('SEAL');

    // 3. Metrics dashboard reports stats
    const metricsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/metrics',
      headers: { 'x-org-id': orgId },
    });
    expect(metricsRes.statusCode).toBe(200);
    expect(metricsRes.json().manualInterventions).toBe(1);
    expect(metricsRes.json().stopCount).toBeGreaterThanOrEqual(1);
    expect(metricsRes.json()).toMatchObject({
      uncertainRateTarget: 5,
      uncertainRateKillThreshold: 10,
      pendingRateTarget: 2,
    });
    expect(metricsRes.json().comparisonSampleCount).toBeTypeOf('number');
    expect(metricsRes.json().completedDecisionCount).toBeGreaterThanOrEqual(1);
    expect(metricsRes.json().allItemsPresentRate).toBeTypeOf('number');
    expect(metricsRes.json().quantitiesCorrectRate).toBeTypeOf('number');
    expect(metricsRes.json().occlusionCount).toBeTypeOf('number');
  });
});
