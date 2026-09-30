import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryRepositories,
  InMemoryObjectStorage,
  StoragePaths,
} from '@pack-manager/database';
import {
  MockVisionProvider,
} from '@pack-manager/vision';
import {
  PackVerificationPipeline,
  WebhookDispatcher,
  InMemoryWorkerQueue,
} from '../src/index.js';
import {
  PackStatus,
  OperationalDecision,
  DiscrepancyType,
} from '@pack-manager/shared';

describe('Verification Worker Pipeline & Async Flow (Section 20, 21, 26, 42)', () => {
  let repos: InMemoryRepositories;
  let storage: InMemoryObjectStorage;
  let visionProvider: MockVisionProvider;
  let webhookDispatcher: WebhookDispatcher;
  let pipeline: PackVerificationPipeline;
  let queue: InMemoryWorkerQueue;

  const orgId = 'org_demo_alpha';
  const packId = 'PACK-001';
  const orderId = 'ORD-001';

  // Helper to construct a simulated valid image buffer (1920x1080 PNG)
  function createValidImageBuffer(): Buffer {
    const buf = Buffer.alloc(2000);
    buf[0] = 0x89; buf[1] = 0x50; buf[2] = 0x4e; buf[3] = 0x47;
    buf[4] = 0x0d; buf[5] = 0x0a; buf[6] = 0x1a; buf[7] = 0x0a;
    buf.writeUInt32BE(1920, 16);
    buf.writeUInt32BE(1080, 20);
    for (let i = 32; i < buf.length; i++) buf[i] = (i * 41) % 256;
    return buf;
  }

  beforeEach(async () => {
    repos = new InMemoryRepositories();
    storage = new InMemoryObjectStorage();
    visionProvider = new MockVisionProvider();
    webhookDispatcher = new WebhookDispatcher({ targetUrl: 'http://mock.fulfillment.service/webhook' });

    pipeline = new PackVerificationPipeline({
      packRepo: repos,
      orderRepo: repos,
      productRepo: repos,
      analysisRepo: repos,
      jobRepo: repos,
      auditRepo: repos,
      storage,
      visionProvider,
      webhookDispatcher,
    });

    queue = new InMemoryWorkerQueue(pipeline);

    // Seed Catalog: SKU-A (Black T-Shirt M) and SKU-B (Blue Cap)
    await repos.createProduct({
      productId: 'p_1',
      orgId,
      sku: 'SKU-A',
      productName: 'Black T-Shirt',
      criticalAttributes: ['color', 'size'],
      referenceImages: [],
      active: true,
      variants: [
        {
          variantId: 'v_1',
          productId: 'p_1',
          sku: 'SKU-A',
          variantName: 'Size M',
          color: 'black',
          size: 'M',
          barcode: '111122223333',
          attributes: { color: 'black', size: 'M' },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await repos.createProduct({
      productId: 'p_2',
      orgId,
      sku: 'SKU-B',
      productName: 'Blue Cap',
      criticalAttributes: ['color'],
      referenceImages: [],
      active: true,
      variants: [
        {
          variantId: 'v_2',
          productId: 'p_2',
          sku: 'SKU-B',
          variantName: 'Blue',
          color: 'blue',
          barcode: '444455556666',
          attributes: { color: 'blue' },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed Order: 2x SKU-A, 1x SKU-B
    await repos.createOrder({
      orderId,
      orgId,
      externalOrderRef: 'EXT-ORD-001',
      channel: 'amazon_mfn',
      items: [
        {
          orderItemId: 'oi_1',
          orderId,
          sku: 'SKU-A',
          expectedQuantity: 2,
          productName: 'Black T-Shirt',
          criticalAttributes: ['color', 'size'],
          attributes: { color: 'black', size: 'M' },
        },
        {
          orderItemId: 'oi_2',
          orderId,
          sku: 'SKU-B',
          expectedQuantity: 1,
          productName: 'Blue Cap',
          criticalAttributes: ['color'],
          attributes: { color: 'blue' },
        },
      ],
      createdAt: new Date(),
    });

    // Seed Pack with 1 valid photograph in storage
    const imgKey = StoragePaths.packOriginal(orgId, packId, 'IMG-01');
    await storage.upload(imgKey, createValidImageBuffer());

    await repos.createPack({
      packId,
      orgId,
      unitId: 'UNIT-0001',
      orderId,
      status: PackStatus.RECEIVED,
      images: [
        {
          packImageId: 'IMG-01',
          packId,
          storagePath: imgKey,
          viewAngle: 'TOP_DOWN',
          isValid: true,
          capturedAt: new Date(),
        },
      ],
      analyses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed Job
    await repos.createJob({
      jobId: 'JOB-001',
      orgId,
      packId,
      idempotencyKey: 'idem-001',
      status: 'PENDING',
      attempt: 1,
      maxAttempts: 3,
      createdAt: new Date(),
    });
  });

  it('Scenario 1 — Exact match completes asynchronously and produces SEAL', async () => {
    // Configure mock detections: 2x SKU-A, 1x SKU-B
    visionProvider.setScenario({
      detections: [
        {
          detectionId: 'det_1',
          imageIndex: 0,
          label: 'black t-shirt',
          confidence: 0.96,
          boundingBox: { x: 0.1, y: 0.1, width: 0.25, height: 0.25 },
          attributes: { color: 'black', size: 'M' },
          barcodeDetected: '111122223333',
        },
        {
          detectionId: 'det_2',
          imageIndex: 0,
          label: 'black t-shirt',
          confidence: 0.95,
          boundingBox: { x: 0.4, y: 0.1, width: 0.25, height: 0.25 },
          attributes: { color: 'black', size: 'M' },
          barcodeDetected: '111122223333',
        },
        {
          detectionId: 'det_3',
          imageIndex: 0,
          label: 'blue cap',
          confidence: 0.94,
          boundingBox: { x: 0.7, y: 0.1, width: 0.25, height: 0.25 },
          attributes: { color: 'blue' },
          barcodeDetected: '444455556666',
        },
      ],
    });

    // Enqueue & process
    await queue.enqueue({
      orgId,
      packId,
      jobId: 'JOB-001',
      idempotencyKey: 'idem-001',
    });

    await queue.processAll();

    // Verify pack status transitioned to SEAL
    const updatedPack = await repos.getPackById(orgId, packId);
    expect(updatedPack?.status).toBe(PackStatus.SEAL);

    // Verify Job completed
    const updatedJob = await repos.getJobById(orgId, 'JOB-001');
    expect(updatedJob?.status).toBe('COMPLETED');

    // Verify Analysis record
    const analyses = await repos.listAnalysesForPack(orgId, packId);
    expect(analyses).toHaveLength(1);
    expect(analyses[0].decision).toBe(OperationalDecision.SEAL);
    expect(analyses[0].detections).toHaveLength(3);

    // Verify Webhook was dispatched with HMAC signature
    expect(webhookDispatcher.deliveryLogs).toHaveLength(1);
    const webhook = webhookDispatcher.deliveryLogs[0];
    expect(webhook.status).toBe('SUCCESS');
    expect(webhook.payload.decision).toBe(OperationalDecision.SEAL);
    expect(webhook.payload.expectedItems).toHaveLength(2);
  });

  it('Scenario 2 — Missing item produces STOP_AND_FIX', async () => {
    // Only 1 item detected instead of 3
    visionProvider.setScenario({
      detections: [
        {
          detectionId: 'det_1',
          imageIndex: 0,
          label: 'black t-shirt',
          confidence: 0.96,
          boundingBox: { x: 0.1, y: 0.1, width: 0.25, height: 0.25 },
          attributes: { color: 'black', size: 'M' },
          barcodeDetected: '111122223333',
        },
      ],
    });

    await queue.enqueue({ orgId, packId, jobId: 'JOB-001', idempotencyKey: 'idem-001' });
    await queue.processAll();

    const updatedPack = await repos.getPackById(orgId, packId);
    expect(updatedPack?.status).toBe(PackStatus.STOP_AND_FIX);

    const analyses = await repos.listAnalysesForPack(orgId, packId);
    expect(analyses[0].decision).toBe(OperationalDecision.STOP_AND_FIX);
    expect(analyses[0].discrepancies.some(d => d.type === DiscrepancyType.MISSING_ITEM)).toBe(true);

    // Webhook delivers STOP_AND_FIX
    expect(webhookDispatcher.deliveryLogs[0].payload.decision).toBe(OperationalDecision.STOP_AND_FIX);
  });

  it('Scenario 8 — Blurry image triggers UNCERTAIN before calling AI model', async () => {
    // Replace stored image with corrupt/unusable buffer
    const imgKey = StoragePaths.packOriginal(orgId, packId, 'IMG-01');
    await storage.upload(imgKey, Buffer.from('unreadable corrupted stream'));

    await queue.enqueue({ orgId, packId, jobId: 'JOB-001', idempotencyKey: 'idem-001' });
    await queue.processAll();

    const updatedPack = await repos.getPackById(orgId, packId);
    expect(updatedPack?.status).toBe(PackStatus.MANUAL_REVIEW);

    const analyses = await repos.listAnalysesForPack(orgId, packId);
    expect(analyses[0].decision).toBe(OperationalDecision.UNCERTAIN);
    expect(analyses[0].discrepancies.some(d => d.type === DiscrepancyType.POOR_IMAGE_QUALITY)).toBe(true);
  });

  it('Scenario 10 — Vision Provider failure returns UNCERTAIN (Conveyor unblocked)', async () => {
    visionProvider.setScenario({
      simulateFailure: true,
      failureReason: 'AI model service unavailable 503',
    });

    await queue.enqueue({ orgId, packId, jobId: 'JOB-001', idempotencyKey: 'idem-001' });
    await queue.processAll();

    const updatedPack = await repos.getPackById(orgId, packId);
    expect(updatedPack?.status).toBe(PackStatus.MANUAL_REVIEW);

    const analyses = await repos.listAnalysesForPack(orgId, packId);
    expect(analyses[0].decision).toBe(OperationalDecision.UNCERTAIN);
    expect(analyses[0].discrepancies.some(d => d.type === DiscrepancyType.VISION_FAILURE)).toBe(true);
  });

  it('Scenario 11 — Rescan preserves previous analysis and reaches SEAL on correction', async () => {
    // Step 1: 1st run produces STOP_AND_FIX (missing item)
    visionProvider.setScenario({
      detections: [
        {
          detectionId: 'det_1',
          imageIndex: 0,
          label: 'black t-shirt',
          confidence: 0.96,
          boundingBox: { x: 0.1, y: 0.1, width: 0.25, height: 0.25 },
          attributes: { color: 'black', size: 'M' },
        },
      ],
    });

    await queue.enqueue({ orgId, packId, jobId: 'JOB-001', idempotencyKey: 'idem-001' });
    await queue.processAll();

    let pack = await repos.getPackById(orgId, packId);
    expect(pack?.status).toBe(PackStatus.STOP_AND_FIX);

    // Step 2: QC operator fixes the box, uploads a corrected photo, and triggers rescan
    const rescanImageKey = StoragePaths.packOriginal(orgId, packId, 'IMG-02');
    await storage.upload(rescanImageKey, createValidImageBuffer());
    await repos.addPackImage(orgId, packId, {
      packImageId: 'IMG-02',
      packId,
      storagePath: rescanImageKey,
      viewAngle: 'TOP_DOWN',
      isValid: true,
      capturedAt: new Date(),
    });

    // Operator fixes contents -> vision now observes all 3 items
    visionProvider.setScenario({
      detections: [
        {
          detectionId: 'det_1',
          imageIndex: 0,
          label: 'black t-shirt',
          confidence: 0.96,
          boundingBox: { x: 0.1, y: 0.1, width: 0.25, height: 0.25 },
          attributes: { color: 'black', size: 'M' },
          barcodeDetected: '111122223333',
        },
        {
          detectionId: 'det_2',
          imageIndex: 0,
          label: 'black t-shirt',
          confidence: 0.95,
          boundingBox: { x: 0.4, y: 0.1, width: 0.25, height: 0.25 },
          attributes: { color: 'black', size: 'M' },
          barcodeDetected: '111122223333',
        },
        {
          detectionId: 'det_3',
          imageIndex: 0,
          label: 'blue cap',
          confidence: 0.94,
          boundingBox: { x: 0.7, y: 0.1, width: 0.25, height: 0.25 },
          attributes: { color: 'blue' },
          barcodeDetected: '444455556666',
        },
      ],
    });

    await repos.createJob({
      jobId: 'JOB-002',
      orgId,
      packId,
      idempotencyKey: 'idem-002',
      status: 'PENDING',
      attempt: 1,
      maxAttempts: 3,
      createdAt: new Date(),
    });

    await queue.enqueue({ orgId, packId, jobId: 'JOB-002', idempotencyKey: 'idem-002', actorId: 'qc_operator_1' });
    await queue.processAll();

    // Verify pack status is now SEAL
    pack = await repos.getPackById(orgId, packId);
    expect(pack?.status).toBe(PackStatus.SEAL);

    // Verify BOTH analyses exist in chronological audit history!
    const allAnalyses = await repos.listAnalysesForPack(orgId, packId);
    expect(allAnalyses).toHaveLength(2);
    expect(allAnalyses[0].analysisNumber).toBe(1);
    expect(allAnalyses[0].decision).toBe(OperationalDecision.STOP_AND_FIX);
    expect(allAnalyses[1].analysisNumber).toBe(2);
    expect(allAnalyses[1].decision).toBe(OperationalDecision.SEAL);
  });
});
