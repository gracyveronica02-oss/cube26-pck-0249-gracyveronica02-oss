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
  InMemoryWorkerQueue,
  WebhookDispatcher,
} from '@pack-manager/worker';
import {
  PackStatus,
  OperationalDecision,
  DiscrepancyType,
} from '@pack-manager/shared';

describe('Comprehensive End-to-End Scenarios (Section 33: Scenarios 1–11)', () => {
  let repos: InMemoryRepositories;
  let storage: InMemoryObjectStorage;
  let visionProvider: MockVisionProvider;
  let webhookDispatcher: WebhookDispatcher;
  let pipeline: PackVerificationPipeline;
  let queue: InMemoryWorkerQueue;

  const orgId = 'org_demo_alpha';

  function createValidImage(): Buffer {
    const buf = Buffer.alloc(2048);
    buf[0] = 0x89; buf[1] = 0x50; buf[2] = 0x4e; buf[3] = 0x47;
    buf[4] = 0x0d; buf[5] = 0x0a; buf[6] = 0x1a; buf[7] = 0x0a;
    buf.writeUInt32BE(1920, 16);
    buf.writeUInt32BE(1080, 20);
    for (let i = 32; i < buf.length; i++) buf[i] = (i * 33) % 256;
    return buf;
  }

  beforeEach(async () => {
    repos = new InMemoryRepositories();
    storage = new InMemoryObjectStorage();
    visionProvider = new MockVisionProvider();
    webhookDispatcher = new WebhookDispatcher();

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

    // Seed Seed Products: SKU-A, SKU-B, SKU-C, SKU-D
    await repos.createProduct({
      productId: 'p_A',
      orgId,
      sku: 'SKU-A',
      productName: 'Black T-Shirt',
      criticalAttributes: ['color', 'size'],
      referenceImages: [],
      active: true,
      variants: [
        {
          variantId: 'v_A_M',
          productId: 'p_A',
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
      productId: 'p_B',
      orgId,
      sku: 'SKU-B',
      productName: 'Blue Cap',
      criticalAttributes: ['color'],
      referenceImages: [],
      active: true,
      variants: [
        {
          variantId: 'v_B',
          productId: 'p_B',
          sku: 'SKU-B',
          variantName: 'Standard Blue',
          color: 'blue',
          barcode: '444455556666',
          attributes: { color: 'blue' },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await repos.createProduct({
      productId: 'p_C',
      orgId,
      sku: 'SKU-C',
      productName: 'Red Cap',
      criticalAttributes: ['color'],
      referenceImages: [],
      active: true,
      variants: [
        {
          variantId: 'v_C',
          productId: 'p_C',
          sku: 'SKU-C',
          variantName: 'Standard Red',
          color: 'red',
          barcode: '777788889999',
          attributes: { color: 'red' },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await repos.createProduct({
      productId: 'p_D',
      orgId,
      sku: 'SKU-D',
      productName: 'White T-Shirt',
      criticalAttributes: ['color', 'size'],
      referenceImages: [],
      active: true,
      variants: [
        {
          variantId: 'v_D_L',
          productId: 'p_D',
          sku: 'SKU-D-L',
          variantName: 'Size L',
          color: 'white',
          size: 'L',
          attributes: { color: 'white', size: 'L' },
        },
        {
          variantId: 'v_D_M',
          productId: 'p_D',
          sku: 'SKU-D-M',
          variantName: 'Size M',
          color: 'white',
          size: 'M',
          attributes: { color: 'white', size: 'M' },
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  // Helper to setup and run pack verification
  async function runVerification(opts: {
    packId: string;
    unitId: string;
    orderItems: Array<{ sku: string; qty: number; name: string; criticalAttrs?: string[]; attrs?: Record<string, string> }>;
    detections: any[];
    imageBuffers?: Buffer[];
    simulateVisionFailure?: boolean;
  }) {
    const orderId = `ORD-${opts.packId}`;
    await repos.createOrder({
      orderId,
      orgId,
      externalOrderRef: `EXT-${orderId}`,
      channel: 'shopify',
      items: opts.orderItems.map((item, idx) => ({
        orderItemId: `item_${idx + 1}`,
        orderId,
        sku: item.sku,
        expectedQuantity: item.qty,
        productName: item.name,
        criticalAttributes: item.criticalAttrs || ['color', 'size'],
        attributes: item.attrs || {},
      })),
      createdAt: new Date(),
    });

    const buffers = opts.imageBuffers || [createValidImage()];
    const images = [];

    for (let i = 0; i < buffers.length; i++) {
      const imgKey = StoragePaths.packOriginal(orgId, opts.packId, `IMG-0${i + 1}`);
      await storage.upload(imgKey, buffers[i]);
      images.push({
        packImageId: `IMG-0${i + 1}`,
        packId: opts.packId,
        storagePath: imgKey,
        viewAngle: i === 0 ? 'TOP_DOWN' : 'ANGLED',
        isValid: true,
        capturedAt: new Date(),
      });
    }

    await repos.createPack({
      packId: opts.packId,
      orgId,
      unitId: opts.unitId,
      orderId,
      status: PackStatus.RECEIVED,
      images,
      analyses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    visionProvider.setScenario({
      detections: opts.detections,
      simulateFailure: opts.simulateVisionFailure,
    });

    const jobId = `JOB-${opts.packId}`;
    await repos.createJob({
      jobId,
      orgId,
      packId: opts.packId,
      idempotencyKey: `idem-${opts.packId}`,
      status: 'PENDING',
      attempt: 1,
      maxAttempts: 3,
      createdAt: new Date(),
    });

    await queue.enqueue({
      orgId,
      packId: opts.packId,
      jobId,
      idempotencyKey: `idem-${opts.packId}`,
    });

    await queue.processAll();

    const pack = await repos.getPackById(orgId, opts.packId);
    const analyses = await repos.listAnalysesForPack(orgId, opts.packId);
    return { pack, analysis: analyses[analyses.length - 1] };
  }

  it('Scenario 1 — Correct: 2x Black T-Shirt, 1x Blue Cap -> SEAL', async () => {
    const result = await runVerification({
      packId: 'SCENARIO-1',
      unitId: 'UNIT-0001',
      orderItems: [
        { sku: 'SKU-A', qty: 2, name: 'Black T-Shirt', attrs: { color: 'black', size: 'M' } },
        { sku: 'SKU-B', qty: 1, name: 'Blue Cap', criticalAttrs: ['color'], attrs: { color: 'blue' } },
      ],
      detections: [
        { detectionId: 'd1', imageIndex: 0, label: 'black t-shirt', confidence: 0.95, boundingBox: { x: 0.1, y: 0.1, width: 0.25, height: 0.25 }, attributes: { color: 'black', size: 'M' }, barcodeDetected: '111122223333' },
        { detectionId: 'd2', imageIndex: 0, label: 'black t-shirt', confidence: 0.94, boundingBox: { x: 0.4, y: 0.1, width: 0.25, height: 0.25 }, attributes: { color: 'black', size: 'M' }, barcodeDetected: '111122223333' },
        { detectionId: 'd3', imageIndex: 0, label: 'blue cap', confidence: 0.93, boundingBox: { x: 0.7, y: 0.1, width: 0.25, height: 0.25 }, attributes: { color: 'blue' }, barcodeDetected: '444455556666' },
      ],
    });

    expect(result.pack?.status).toBe(PackStatus.SEAL);
    expect(result.analysis.decision).toBe(OperationalDecision.SEAL);
    expect(result.analysis.discrepancies).toHaveLength(0);
  });

  it('Scenario 2 — Missing: Expected Blue Cap is missing -> STOP_AND_FIX', async () => {
    const result = await runVerification({
      packId: 'SCENARIO-2',
      unitId: 'UNIT-0002',
      orderItems: [
        { sku: 'SKU-A', qty: 2, name: 'Black T-Shirt', attrs: { color: 'black', size: 'M' } },
        { sku: 'SKU-B', qty: 1, name: 'Blue Cap', criticalAttrs: ['color'], attrs: { color: 'blue' } },
      ],
      detections: [
        { detectionId: 'd1', imageIndex: 0, label: 'black t-shirt', confidence: 0.95, boundingBox: { x: 0.1, y: 0.1, width: 0.25, height: 0.25 }, attributes: { color: 'black', size: 'M' }, barcodeDetected: '111122223333' },
        { detectionId: 'd2', imageIndex: 0, label: 'black t-shirt', confidence: 0.94, boundingBox: { x: 0.4, y: 0.1, width: 0.25, height: 0.25 }, attributes: { color: 'black', size: 'M' }, barcodeDetected: '111122223333' },
      ],
    });

    expect(result.pack?.status).toBe(PackStatus.STOP_AND_FIX);
    expect(result.analysis.decision).toBe(OperationalDecision.STOP_AND_FIX);
    expect(result.analysis.discrepancies.some((d: any) => d.type === DiscrepancyType.MISSING_ITEM && d.expectedSku === 'SKU-B')).toBe(true);
  });

  it('Scenario 3 — Wrong Item: Red Cap in box instead of Blue Cap -> STOP_AND_FIX', async () => {
    const result = await runVerification({
      packId: 'SCENARIO-3',
      unitId: 'UNIT-0003',
      orderItems: [
        { sku: 'SKU-A', qty: 2, name: 'Black T-Shirt', attrs: { color: 'black', size: 'M' } },
        { sku: 'SKU-B', qty: 1, name: 'Blue Cap', criticalAttrs: ['color'], attrs: { color: 'blue' } },
      ],
      detections: [
        { detectionId: 'd1', imageIndex: 0, label: 'black t-shirt', confidence: 0.95, boundingBox: { x: 0.1, y: 0.1, width: 0.25, height: 0.25 }, attributes: { color: 'black', size: 'M' }, barcodeDetected: '111122223333' },
        { detectionId: 'd2', imageIndex: 0, label: 'black t-shirt', confidence: 0.94, boundingBox: { x: 0.4, y: 0.1, width: 0.25, height: 0.25 }, attributes: { color: 'black', size: 'M' }, barcodeDetected: '111122223333' },
        { detectionId: 'd3', imageIndex: 0, label: 'red cap', confidence: 0.93, boundingBox: { x: 0.7, y: 0.1, width: 0.25, height: 0.25 }, attributes: { color: 'red' }, barcodeDetected: '777788889999' },
      ],
    });

    expect(result.pack?.status).toBe(PackStatus.STOP_AND_FIX);
    expect(result.analysis.decision).toBe(OperationalDecision.STOP_AND_FIX);
    expect(result.analysis.discrepancies.some((d: any) => d.type === DiscrepancyType.WRONG_ITEM && d.detectedSku === 'SKU-C')).toBe(true);
  });

  it('Scenario 4 — Extra Item: 2x Blue Cap instead of 1x -> STOP_AND_FIX', async () => {
    const result = await runVerification({
      packId: 'SCENARIO-4',
      unitId: 'UNIT-0004',
      orderItems: [
        { sku: 'SKU-A', qty: 2, name: 'Black T-Shirt', attrs: { color: 'black', size: 'M' } },
        { sku: 'SKU-B', qty: 1, name: 'Blue Cap', criticalAttrs: ['color'], attrs: { color: 'blue' } },
      ],
      detections: [
        { detectionId: 'd1', imageIndex: 0, label: 'black t-shirt', confidence: 0.95, boundingBox: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 }, attributes: { color: 'black', size: 'M' }, barcodeDetected: '111122223333' },
        { detectionId: 'd2', imageIndex: 0, label: 'black t-shirt', confidence: 0.94, boundingBox: { x: 0.35, y: 0.1, width: 0.2, height: 0.2 }, attributes: { color: 'black', size: 'M' }, barcodeDetected: '111122223333' },
        { detectionId: 'd3', imageIndex: 0, label: 'blue cap', confidence: 0.93, boundingBox: { x: 0.6, y: 0.1, width: 0.2, height: 0.2 }, attributes: { color: 'blue' }, barcodeDetected: '444455556666' },
        { detectionId: 'd4', imageIndex: 0, label: 'blue cap', confidence: 0.92, boundingBox: { x: 0.8, y: 0.1, width: 0.2, height: 0.2 }, attributes: { color: 'blue' }, barcodeDetected: '444455556666' },
      ],
    });

    expect(result.pack?.status).toBe(PackStatus.STOP_AND_FIX);
    expect(result.analysis.decision).toBe(OperationalDecision.STOP_AND_FIX);
    expect(result.analysis.discrepancies.some((d: any) => d.type === DiscrepancyType.EXTRA_ITEM)).toBe(true);
  });

  it('Scenario 5 — Short Quantity: 1x Black T-Shirt instead of 2x -> STOP_AND_FIX', async () => {
    const result = await runVerification({
      packId: 'SCENARIO-5',
      unitId: 'UNIT-0005',
      orderItems: [
        { sku: 'SKU-A', qty: 2, name: 'Black T-Shirt', attrs: { color: 'black', size: 'M' } },
      ],
      detections: [
        { detectionId: 'd1', imageIndex: 0, label: 'black t-shirt', confidence: 0.95, boundingBox: { x: 0.1, y: 0.1, width: 0.4, height: 0.4 }, attributes: { color: 'black', size: 'M' }, barcodeDetected: '111122223333' },
      ],
    });

    expect(result.pack?.status).toBe(PackStatus.STOP_AND_FIX);
    expect(result.analysis.decision).toBe(OperationalDecision.STOP_AND_FIX);
    expect(result.analysis.discrepancies.some((d: any) => d.type === DiscrepancyType.QUANTITY_MISMATCH)).toBe(true);
  });

  it('Scenario 6 — Multiple Identical Products: 5x Black T-Shirt -> SEAL', async () => {
    const result = await runVerification({
      packId: 'SCENARIO-6',
      unitId: 'UNIT-0006',
      orderItems: [
        { sku: 'SKU-A', qty: 5, name: 'Black T-Shirt', attrs: { color: 'black', size: 'M' } },
      ],
      detections: Array.from({ length: 5 }).map((_, i) => ({
        detectionId: `d_${i}`,
        imageIndex: 0,
        label: 'black t-shirt',
        confidence: 0.95,
        boundingBox: { x: i * 0.18, y: 0.2, width: 0.15, height: 0.2 },
        attributes: { color: 'black', size: 'M' },
        barcodeDetected: '111122223333',
      })),
    });

    expect(result.pack?.status).toBe(PackStatus.SEAL);
    expect(result.analysis.decision).toBe(OperationalDecision.SEAL);
    expect(result.analysis.discrepancies).toHaveLength(0);
  });

  it('Scenario 6a — Overlapping identical detections count as separate items -> SEAL', async () => {
    const result = await runVerification({
      packId: 'SCENARIO-6A',
      unitId: 'UNIT-0006A',
      orderItems: [{ sku: 'SKU-A', qty: 2, name: 'Black T-Shirt', attrs: { color: 'black', size: 'M' } }],
      detections: [
        {
          detectionId: 'overlap-shirt-1',
          imageIndex: 0,
          label: 'black t-shirt',
          confidence: 0.96,
          boundingBox: { x: 0.2, y: 0.2, width: 0.5, height: 0.5 },
          attributes: { color: 'black', size: 'M' },
          barcodeDetected: '111122223333',
        },
        {
          detectionId: 'overlap-shirt-2',
          imageIndex: 0,
          label: 'black t-shirt',
          confidence: 0.95,
          boundingBox: { x: 0.2, y: 0.2, width: 0.5, height: 0.5 },
          attributes: { color: 'black', size: 'M' },
          barcodeDetected: '111122223333',
        },
      ],
    });

    expect(result.analysis.decision).toBe(OperationalDecision.SEAL);
    expect(result.analysis.detectedItems.find((item: any) => item.sku === 'SKU-A')?.quantity).toBe(2);
  });

  it('Scenario 6b — Duplicate Manifest Lines Aggregate Identical SKU Quantities -> SEAL', async () => {
    const result = await runVerification({
      packId: 'SCENARIO-6B',
      unitId: 'UNIT-0006B',
      orderItems: [
        { sku: 'SKU-A', qty: 2, name: 'Black T-Shirt', attrs: { color: 'black', size: 'M' } },
        { sku: 'SKU-A', qty: 3, name: 'Black T-Shirt', attrs: { color: 'black', size: 'M' } },
      ],
      detections: Array.from({ length: 5 }).map((_, i) => ({
        detectionId: `duplicate_line_${i}`,
        imageIndex: 0,
        label: 'black t-shirt',
        confidence: 0.95,
        boundingBox: { x: i * 0.18, y: 0.2, width: 0.15, height: 0.2 },
        attributes: { color: 'black', size: 'M' },
      })),
    });

    expect(result.analysis.decision).toBe(OperationalDecision.SEAL);
    expect(result.analysis.expectedItems.find((item: any) => item.sku === 'SKU-A')?.quantity).toBe(5);
  });

  it('Scenario 7 — Visually Similar Products: Expected Size L, Detected Size M -> STOP_AND_FIX', async () => {
    const result = await runVerification({
      packId: 'SCENARIO-7',
      unitId: 'UNIT-0007',
      orderItems: [
        { sku: 'SKU-D-L', qty: 1, name: 'White T-Shirt', criticalAttrs: ['color', 'size'], attrs: { color: 'white', size: 'L' } },
      ],
      detections: [
        { detectionId: 'd1', imageIndex: 0, label: 'white t-shirt', confidence: 0.94, boundingBox: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 }, attributes: { color: 'white', size: 'M' } },
      ],
    });

    expect(result.pack?.status).toBe(PackStatus.STOP_AND_FIX);
    expect(result.analysis.discrepancies.some((d: any) => d.type === DiscrepancyType.VARIANT_MISMATCH || d.type === DiscrepancyType.WRONG_ITEM)).toBe(true);
  });

  it('Scenario 8 — Corrupt Image -> UNCERTAIN', async () => {
    const result = await runVerification({
      packId: 'SCENARIO-8',
      unitId: 'UNIT-0008',
      orderItems: [
        { sku: 'SKU-A', qty: 1, name: 'Black T-Shirt', attrs: { color: 'black', size: 'M' } },
      ],
      imageBuffers: [Buffer.from('corrupted stream bytes')],
      detections: [],
    });

    expect(result.pack?.status).toBe(PackStatus.MANUAL_REVIEW);
    expect(result.analysis.decision).toBe(OperationalDecision.UNCERTAIN);
    expect(result.analysis.discrepancies.some((d: any) => d.type === DiscrepancyType.POOR_IMAGE_QUALITY)).toBe(true);
  });

  it('Scenario 9 — Ambiguous Photo With No Identifiable Items -> UNCERTAIN', async () => {
    const result = await runVerification({
      packId: 'SCENARIO-AMBIGUOUS',
      unitId: 'UNIT-AMBIGUOUS',
      orderItems: [{ sku: 'SKU-A', qty: 1, name: 'Black T-Shirt', attrs: { color: 'black', size: 'M' } }],
      imageBuffers: [createValidImage()],
      detections: [],
    });

    expect(result.pack?.status).toBe(PackStatus.MANUAL_REVIEW);
    expect(result.analysis.decision).toBe(OperationalDecision.UNCERTAIN);
    expect(result.analysis.discrepancies.some((item: any) => item.type === DiscrepancyType.MISSING_ITEM)).toBe(false);
  });

  it('Scenario 9b — Explicitly Occluded Item Is Reported Separately -> UNCERTAIN', async () => {
    const result = await runVerification({
      packId: 'SCENARIO-OCCLUDED',
      unitId: 'UNIT-OCCLUDED',
      orderItems: [{ sku: 'SKU-A', qty: 1, name: 'Black T-Shirt', attrs: { color: 'black', size: 'M' } }],
      imageBuffers: [createValidImage()],
      detections: [{
        detectionId: 'occluded_item',
        imageIndex: 0,
        label: 'black t-shirt',
        confidence: 0.97,
        boundingBox: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 },
        attributes: { color: 'black', size: 'M', visibility: 'partially_occluded' },
        barcodeDetected: '111122223333',
      }],
    });

    expect(result.analysis.decision).toBe(OperationalDecision.UNCERTAIN);
    expect(result.analysis.discrepancies).toContainEqual(expect.objectContaining({
      type: DiscrepancyType.AMBIGUOUS_ITEM,
      details: expect.objectContaining({ cause: 'OCCLUSION', visibility: 'partially_occluded' }),
    }));
    expect(result.analysis.discrepancies.some((item: any) => item.type === DiscrepancyType.MISSING_ITEM)).toBe(false);
  });

  it('Scenario 10 — Multiple Photographs without Double-Counting -> SEAL', async () => {
    // 2 photos of the SAME physical item (top-down and angled view)
    const result = await runVerification({
      packId: 'SCENARIO-9',
      unitId: 'UNIT-0009',
      orderItems: [
        { sku: 'SKU-A', qty: 1, name: 'Black T-Shirt', attrs: { color: 'black', size: 'M' } },
      ],
      imageBuffers: [createValidImage(), createValidImage()],
      detections: [
        { detectionId: 'd_img0', imageIndex: 0, label: 'black t-shirt', confidence: 0.94, boundingBox: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 }, attributes: { color: 'black', size: 'M' }, barcodeDetected: '111122223333' },
        { detectionId: 'd_img1', imageIndex: 1, label: 'black t-shirt', confidence: 0.96, boundingBox: { x: 0.22, y: 0.21, width: 0.39, height: 0.4 }, attributes: { color: 'black', size: 'M' }, barcodeDetected: '111122223333' },
      ],
    });

    expect(result.pack?.status).toBe(PackStatus.SEAL);
    expect(result.analysis.decision).toBe(OperationalDecision.SEAL);
  });

  it('Scenario 11 — AI / Vision Provider Failure -> UNCERTAIN', async () => {
    const result = await runVerification({
      packId: 'SCENARIO-10',
      unitId: 'UNIT-0010',
      orderItems: [
        { sku: 'SKU-A', qty: 1, name: 'Black T-Shirt', attrs: { color: 'black', size: 'M' } },
      ],
      detections: [],
      simulateVisionFailure: true,
    });

    expect(result.pack?.status).toBe(PackStatus.MANUAL_REVIEW);
    expect(result.analysis.decision).toBe(OperationalDecision.UNCERTAIN);
    expect(result.analysis.discrepancies.some((d: any) => d.type === DiscrepancyType.VISION_FAILURE)).toBe(true);
  });

  it('Scenario 12 — Manual SKU Not In Catalog: Exact Product Match -> SEAL', async () => {
    const result = await runVerification({
      packId: 'SCENARIO-MANUAL-SKU',
      unitId: 'UNIT-MANUAL-SKU',
      orderItems: [{
        sku: 'SELLER-CUSTOM-001',
        qty: 1,
        name: 'Handmade Blue Ceramic Mug',
        criticalAttrs: ['color'],
        attrs: { color: 'blue' },
      }],
      detections: [{
        detectionId: 'manual_sku_detection',
        imageIndex: 0,
        label: 'Handmade Blue Ceramic Mug',
        confidence: 0.97,
        boundingBox: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 },
        attributes: { color: 'blue' },
      }],
    });

    expect(result.analysis.decision).toBe(OperationalDecision.SEAL);
    expect(result.analysis.discrepancies).toHaveLength(0);
  });

  it('Scenario 13 — Rescan Lifecycle: Analysis 1 STOP_AND_FIX, Analysis 2 SEAL', async () => {
    // Run 1: Missing item
    const run1 = await runVerification({
      packId: 'SCENARIO-11',
      unitId: 'UNIT-0011',
      orderItems: [
        { sku: 'SKU-A', qty: 2, name: 'Black T-Shirt', attrs: { color: 'black', size: 'M' } },
      ],
      detections: [
        { detectionId: 'd1', imageIndex: 0, label: 'black t-shirt', confidence: 0.95, boundingBox: { x: 0.1, y: 0.1, width: 0.4, height: 0.4 }, attributes: { color: 'black', size: 'M' }, barcodeDetected: '111122223333' },
      ],
    });
    expect(run1.pack?.status).toBe(PackStatus.STOP_AND_FIX);

    // Operator fixes box and triggers rescan with full 2 items
    visionProvider.setScenario({
      detections: [
        { detectionId: 'd1', imageIndex: 0, label: 'black t-shirt', confidence: 0.95, boundingBox: { x: 0.1, y: 0.1, width: 0.3, height: 0.3 }, attributes: { color: 'black', size: 'M' }, barcodeDetected: '111122223333' },
        { detectionId: 'd2', imageIndex: 0, label: 'black t-shirt', confidence: 0.94, boundingBox: { x: 0.5, y: 0.1, width: 0.3, height: 0.3 }, attributes: { color: 'black', size: 'M' }, barcodeDetected: '111122223333' },
      ],
    });

    const rescanJobId = 'JOB-SCENARIO-11-RESCAN';
    await repos.createJob({
      jobId: rescanJobId,
      orgId,
      packId: 'SCENARIO-11',
      idempotencyKey: 'idem-rescan-11',
      status: 'PENDING',
      attempt: 1,
      maxAttempts: 3,
      createdAt: new Date(),
    });

    await queue.enqueue({
      orgId,
      packId: 'SCENARIO-11',
      jobId: rescanJobId,
      idempotencyKey: 'idem-rescan-11',
      actorId: 'qc_operator_rescan',
    });

    await queue.processAll();

    const pack = await repos.getPackById(orgId, 'SCENARIO-11');
    expect(pack?.status).toBe(PackStatus.SEAL);

    const analyses = await repos.listAnalysesForPack(orgId, 'SCENARIO-11');
    expect(analyses).toHaveLength(2);
    expect(analyses[0].decision).toBe(OperationalDecision.STOP_AND_FIX);
    expect(analyses[1].decision).toBe(OperationalDecision.SEAL);
  });
});
