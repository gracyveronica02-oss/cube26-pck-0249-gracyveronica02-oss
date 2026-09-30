import { describe, it, expect } from 'vitest';
import {
  MultiImageDeduplicator,
  SKUIdentifier,
  OrderReconciler,
  DeterministicDecisionEngine,
  PackStateMachine,
  InvalidStateTransitionError,
  Product,
  OrderItem,
} from '../src/index.js';
import {
  OperationalDecision,
  DiscrepancyType,
  PackStatus,
  CheckVerdict,
} from '@pack-manager/shared';
import { DefaultAppConfig } from '@pack-manager/config';

// Sample Seed Products
const CATALOG: Product[] = [
  {
    productId: 'prod_001',
    orgId: 'org_demo_alpha',
    sku: 'SKU-A',
    productName: 'Black T-Shirt',
    category: 'Apparel',
    criticalAttributes: ['color', 'size'],
    referenceImages: [],
    active: true,
    variants: [
      {
        variantId: 'var_001',
        productId: 'prod_001',
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
  },
  {
    productId: 'prod_002',
    orgId: 'org_demo_alpha',
    sku: 'SKU-B',
    productName: 'Blue Cap',
    category: 'Accessories',
    criticalAttributes: ['color'],
    referenceImages: [],
    active: true,
    variants: [
      {
        variantId: 'var_002',
        productId: 'prod_002',
        sku: 'SKU-B',
        variantName: 'Standard Blue',
        color: 'blue',
        barcode: '444455556666',
        attributes: { color: 'blue' },
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    productId: 'prod_003',
    orgId: 'org_demo_alpha',
    sku: 'SKU-C',
    productName: 'Red Cap',
    category: 'Accessories',
    criticalAttributes: ['color'],
    referenceImages: [],
    active: true,
    variants: [
      {
        variantId: 'var_003',
        productId: 'prod_003',
        sku: 'SKU-C',
        variantName: 'Standard Red',
        color: 'red',
        barcode: '777788889999',
        attributes: { color: 'red' },
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    productId: 'prod_004',
    orgId: 'org_demo_alpha',
    sku: 'SKU-D',
    productName: 'White T-Shirt',
    category: 'Apparel',
    criticalAttributes: ['color', 'size'],
    referenceImages: [],
    active: true,
    variants: [
      {
        variantId: 'var_004_L',
        productId: 'prod_004',
        sku: 'SKU-D-L',
        variantName: 'Size L',
        color: 'white',
        size: 'L',
        attributes: { color: 'white', size: 'L' },
      },
      {
        variantId: 'var_004_M',
        productId: 'prod_004',
        sku: 'SKU-D-M',
        variantName: 'Size M',
        color: 'white',
        size: 'M',
        attributes: { color: 'white', size: 'M' },
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('Deduplicator (Multi-Image Double-Counting Guard)', () => {
  const deduplicator = new MultiImageDeduplicator();

  it('preserves distinct items in the same photograph', () => {
    const detections = [
      {
        detectionId: 'det_1',
        imageIndex: 0,
        label: 'black t-shirt',
        confidence: 0.95,
        boundingBox: { x: 0.1, y: 0.1, width: 0.3, height: 0.3 },
        attributes: { color: 'black' },
      },
      {
        detectionId: 'det_2',
        imageIndex: 0,
        label: 'black t-shirt',
        confidence: 0.94,
        boundingBox: { x: 0.5, y: 0.5, width: 0.3, height: 0.3 },
        attributes: { color: 'black' },
      },
    ];

    const clusters = deduplicator.deduplicate(detections);
    expect(clusters).toHaveLength(2);
  });

  it('counts identical items with fully overlapping boxes as separate physical instances', () => {
    const detections = [
      {
        detectionId: 'overlap_item_1',
        imageIndex: 0,
        label: 'black t-shirt',
        confidence: 0.96,
        boundingBox: { x: 0.2, y: 0.2, width: 0.5, height: 0.5 },
        attributes: { color: 'black', size: 'M' },
      },
      {
        detectionId: 'overlap_item_2',
        imageIndex: 0,
        label: 'black t-shirt',
        confidence: 0.95,
        boundingBox: { x: 0.2, y: 0.2, width: 0.5, height: 0.5 },
        attributes: { color: 'black', size: 'M' },
      },
    ];

    expect(deduplicator.deduplicate(detections)).toHaveLength(2);
  });

  it('deduplicates identical physical item photographed from 2 angles by barcode', () => {
    const detections = [
      {
        detectionId: 'det_img0',
        imageIndex: 0,
        label: 'black t-shirt',
        confidence: 0.92,
        boundingBox: { x: 0.1, y: 0.1, width: 0.3, height: 0.3 },
        attributes: { color: 'black' },
        barcodeDetected: '111122223333',
      },
      {
        detectionId: 'det_img1',
        imageIndex: 1, // Second photo
        label: 'black t-shirt',
        confidence: 0.96,
        boundingBox: { x: 0.2, y: 0.15, width: 0.35, height: 0.35 },
        attributes: { color: 'black' },
        barcodeDetected: '111122223333',
      },
    ];

    const clusters = deduplicator.deduplicate(detections);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].allDetections).toHaveLength(2);
    expect(clusters[0].associatedImages).toEqual([0, 1]);
    expect(clusters[0].confidence).toBe(0.96);
  });

  it('deduplicates overlapping spatial detection across multi-angle shots with same attributes', () => {
    const detections = [
      {
        detectionId: 'det_a',
        imageIndex: 0,
        label: 'blue cap',
        confidence: 0.91,
        boundingBox: { x: 0.2, y: 0.2, width: 0.4, height: 0.4 },
        attributes: { color: 'blue' },
      },
      {
        detectionId: 'det_b',
        imageIndex: 1,
        label: 'blue cap',
        confidence: 0.93,
        boundingBox: { x: 0.22, y: 0.21, width: 0.39, height: 0.4 },
        attributes: { color: 'blue' },
      },
    ];

    const clusters = deduplicator.deduplicate(detections);
    expect(clusters).toHaveLength(1);
  });
});

describe('SKU Identifier', () => {
  const identifier = new SKUIdentifier();
  const deduplicator = new MultiImageDeduplicator();

  it('matches exact barcode with 1.0 confidence', () => {
    const clusters = deduplicator.deduplicate([
      {
        detectionId: 'det_1',
        imageIndex: 0,
        label: 'random apparel',
        confidence: 0.9,
        boundingBox: { x: 0, y: 0, width: 0.5, height: 0.5 },
        attributes: {},
        barcodeDetected: '444455556666',
      },
    ]);

    const match = identifier.matchDetectedItem(clusters[0], CATALOG);
    expect(match.selectedSku).toBe('SKU-B');
    expect(match.confidence).toBe(1.0);
  });

  it('matches product by label and attributes', () => {
    const clusters = deduplicator.deduplicate([
      {
        detectionId: 'det_1',
        imageIndex: 0,
        label: 'Black T-Shirt',
        confidence: 0.95,
        boundingBox: { x: 0, y: 0, width: 0.5, height: 0.5 },
        attributes: { color: 'black', size: 'M' },
      },
    ]);

    const match = identifier.matchDetectedItem(clusters[0], CATALOG);
    expect(match.selectedSku).toBe('SKU-A');
    expect(match.confidence).toBeGreaterThanOrEqual(0.90);
  });

  it('matches an exact manifest product name when optional attributes are unavailable', () => {
    const manifestProduct: Product = {
      productId: 'manifest_product',
      orgId: 'org_demo_alpha',
      sku: 'TSH-BLK-M',
      productName: 'Black cotton T-shirt',
      criticalAttributes: [],
      referenceImages: [],
      active: true,
      variants: [{
        variantId: 'manifest_variant',
        productId: 'manifest_product',
        sku: 'TSH-BLK-M',
        variantName: 'Black cotton T-shirt',
        attributes: {},
      }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const clusters = deduplicator.deduplicate([{
      detectionId: 'det_manifest_item',
      imageIndex: 0,
      label: 'black cotton t-shirt',
      confidence: 0.95,
      boundingBox: { x: 0, y: 0, width: 0.5, height: 0.5 },
      attributes: {},
    }]);

    const match = identifier.matchDetectedItem(clusters[0], [manifestProduct, ...CATALOG]);

    expect(match.selectedSku).toBe('TSH-BLK-M');
    expect(match.confidence).toBeGreaterThanOrEqual(0.90);
  });

  it('never forces an uncertain or unknown detection into a SKU', () => {
    const clusters = deduplicator.deduplicate([
      {
        detectionId: 'det_unknown',
        imageIndex: 0,
        label: 'Mystery Box Widget 3000',
        confidence: 0.4,
        boundingBox: { x: 0, y: 0, width: 0.5, height: 0.5 },
        attributes: { color: 'purple' },
      },
    ]);

    const match = identifier.matchDetectedItem(clusters[0], CATALOG);
    expect(match.selectedSku).toBeUndefined();
  });
});

describe('Order Reconciler & Decision Engine: 11 Core Scenarios', () => {
  const reconciler = new OrderReconciler();
  const decisionEngine = new DeterministicDecisionEngine();
  const config = DefaultAppConfig.thresholds;

  const orderLinesScenario1to4: OrderItem[] = [
    {
      orderItemId: 'item_1',
      orderId: 'ord_1',
      sku: 'SKU-A',
      expectedQuantity: 2,
      productName: 'Black T-Shirt',
      criticalAttributes: ['color', 'size'],
      attributes: { color: 'black', size: 'M' },
    },
    {
      orderItemId: 'item_2',
      orderId: 'ord_1',
      sku: 'SKU-B',
      expectedQuantity: 1,
      productName: 'Blue Cap',
      criticalAttributes: ['color'],
      attributes: { color: 'blue' },
    },
  ];

  it('Scenario 1 — Correct Order (2x Black T-Shirt, 1x Blue Cap) -> SEAL', () => {
    const identified = [
      {
        cluster: { clusterId: 'c1', representativeDetection: { detectionId: 'd1', imageIndex: 0, label: 'black t-shirt', confidence: 0.95, boundingBox: { x: 0, y: 0, width: 0.2, height: 0.2 }, attributes: { color: 'black', size: 'M' } }, allDetections: [], associatedImages: [0], attributes: { color: 'black', size: 'M' }, confidence: 0.95 },
        match: { detectionId: 'd1', candidates: [{ sku: 'SKU-A', score: 0.95 }], selectedSku: 'SKU-A', confidence: 0.95, matchSignals: {} },
      },
      {
        cluster: { clusterId: 'c2', representativeDetection: { detectionId: 'd2', imageIndex: 0, label: 'black t-shirt', confidence: 0.94, boundingBox: { x: 0.3, y: 0, width: 0.2, height: 0.2 }, attributes: { color: 'black', size: 'M' } }, allDetections: [], associatedImages: [0], attributes: { color: 'black', size: 'M' }, confidence: 0.94 },
        match: { detectionId: 'd2', candidates: [{ sku: 'SKU-A', score: 0.94 }], selectedSku: 'SKU-A', confidence: 0.94, matchSignals: {} },
      },
      {
        cluster: { clusterId: 'c3', representativeDetection: { detectionId: 'd3', imageIndex: 0, label: 'blue cap', confidence: 0.93, boundingBox: { x: 0.6, y: 0, width: 0.2, height: 0.2 }, attributes: { color: 'blue' } }, allDetections: [], associatedImages: [0], attributes: { color: 'blue' }, confidence: 0.93 },
        match: { detectionId: 'd3', candidates: [{ sku: 'SKU-B', score: 0.93 }], selectedSku: 'SKU-B', confidence: 0.93, matchSignals: {} },
      },
    ];

    const reconciliation = reconciler.reconcile(orderLinesScenario1to4, identified);
    expect(reconciliation.isExactMatch).toBe(true);
    expect(reconciliation.discrepancies).toHaveLength(0);

    const verdict = decisionEngine.evaluate({
      imageValidationPassed: true,
      reconciliation,
      overallConfidence: 0.94,
      configuration: config,
    });

    expect(verdict.decision).toBe(OperationalDecision.SEAL);
  });

  it('Scenario 2 — Missing Item (Expected Blue Cap missing) -> STOP_AND_FIX', () => {
    const identified = [
      {
        cluster: { clusterId: 'c1', representativeDetection: { detectionId: 'd1', imageIndex: 0, label: 'black t-shirt', confidence: 0.95, boundingBox: { x: 0, y: 0, width: 0.2, height: 0.2 }, attributes: { color: 'black', size: 'M' } }, allDetections: [], associatedImages: [0], attributes: { color: 'black', size: 'M' }, confidence: 0.95 },
        match: { detectionId: 'd1', candidates: [{ sku: 'SKU-A', score: 0.95 }], selectedSku: 'SKU-A', confidence: 0.95, matchSignals: {} },
      },
      {
        cluster: { clusterId: 'c2', representativeDetection: { detectionId: 'd2', imageIndex: 0, label: 'black t-shirt', confidence: 0.94, boundingBox: { x: 0.3, y: 0, width: 0.2, height: 0.2 }, attributes: { color: 'black', size: 'M' } }, allDetections: [], associatedImages: [0], attributes: { color: 'black', size: 'M' }, confidence: 0.94 },
        match: { detectionId: 'd2', candidates: [{ sku: 'SKU-A', score: 0.94 }], selectedSku: 'SKU-A', confidence: 0.94, matchSignals: {} },
      },
    ];

    const reconciliation = reconciler.reconcile(orderLinesScenario1to4, identified);
    expect(reconciliation.isExactMatch).toBe(false);
    expect(reconciliation.discrepancies.some(d => d.type === DiscrepancyType.MISSING_ITEM && d.expectedSku === 'SKU-B')).toBe(true);

    const verdict = decisionEngine.evaluate({
      imageValidationPassed: true,
      reconciliation,
      overallConfidence: 0.94,
      configuration: config,
    });

    expect(verdict.decision).toBe(OperationalDecision.STOP_AND_FIX);
    expect(verdict.reasonSummary).toContain('Missing expected item');
  });

  it('Scenario 3 — Wrong Item (Red Cap instead of Blue Cap) -> STOP_AND_FIX', () => {
    const identified = [
      {
        cluster: { clusterId: 'c1', representativeDetection: { detectionId: 'd1', imageIndex: 0, label: 'black t-shirt', confidence: 0.95, boundingBox: { x: 0, y: 0, width: 0.2, height: 0.2 }, attributes: { color: 'black', size: 'M' } }, allDetections: [], associatedImages: [0], attributes: { color: 'black', size: 'M' }, confidence: 0.95 },
        match: { detectionId: 'd1', candidates: [{ sku: 'SKU-A', score: 0.95 }], selectedSku: 'SKU-A', confidence: 0.95, matchSignals: {} },
      },
      {
        cluster: { clusterId: 'c2', representativeDetection: { detectionId: 'd2', imageIndex: 0, label: 'black t-shirt', confidence: 0.94, boundingBox: { x: 0.3, y: 0, width: 0.2, height: 0.2 }, attributes: { color: 'black', size: 'M' } }, allDetections: [], associatedImages: [0], attributes: { color: 'black', size: 'M' }, confidence: 0.94 },
        match: { detectionId: 'd2', candidates: [{ sku: 'SKU-A', score: 0.94 }], selectedSku: 'SKU-A', confidence: 0.94, matchSignals: {} },
      },
      {
        cluster: { clusterId: 'c3', representativeDetection: { detectionId: 'd3', imageIndex: 0, label: 'red cap', confidence: 0.93, boundingBox: { x: 0.6, y: 0, width: 0.2, height: 0.2 }, attributes: { color: 'red' } }, allDetections: [], associatedImages: [0], attributes: { color: 'red' }, confidence: 0.93 },
        match: { detectionId: 'd3', candidates: [{ sku: 'SKU-C', score: 0.93 }], selectedSku: 'SKU-C', confidence: 0.93, matchSignals: {} },
      },
    ];

    const reconciliation = reconciler.reconcile(orderLinesScenario1to4, identified);
    expect(reconciliation.isExactMatch).toBe(false);
    expect(reconciliation.discrepancies.some(d => d.type === DiscrepancyType.WRONG_ITEM && d.detectedSku === 'SKU-C')).toBe(true);

    const verdict = decisionEngine.evaluate({
      imageValidationPassed: true,
      reconciliation,
      overallConfidence: 0.93,
      configuration: config,
    });

    expect(verdict.decision).toBe(OperationalDecision.STOP_AND_FIX);
  });

  it('Scenario 4 — Extra Item (2x Blue Cap instead of 1x) -> STOP_AND_FIX', () => {
    const identified = [
      {
        cluster: { clusterId: 'c1', representativeDetection: { detectionId: 'd1', imageIndex: 0, label: 'black t-shirt', confidence: 0.95, boundingBox: { x: 0, y: 0, width: 0.2, height: 0.2 }, attributes: { color: 'black', size: 'M' } }, allDetections: [], associatedImages: [0], attributes: { color: 'black', size: 'M' }, confidence: 0.95 },
        match: { detectionId: 'd1', candidates: [{ sku: 'SKU-A', score: 0.95 }], selectedSku: 'SKU-A', confidence: 0.95, matchSignals: {} },
      },
      {
        cluster: { clusterId: 'c2', representativeDetection: { detectionId: 'd2', imageIndex: 0, label: 'black t-shirt', confidence: 0.94, boundingBox: { x: 0.3, y: 0, width: 0.2, height: 0.2 }, attributes: { color: 'black', size: 'M' } }, allDetections: [], associatedImages: [0], attributes: { color: 'black', size: 'M' }, confidence: 0.94 },
        match: { detectionId: 'd2', candidates: [{ sku: 'SKU-A', score: 0.94 }], selectedSku: 'SKU-A', confidence: 0.94, matchSignals: {} },
      },
      {
        cluster: { clusterId: 'c3', representativeDetection: { detectionId: 'd3', imageIndex: 0, label: 'blue cap', confidence: 0.93, boundingBox: { x: 0.6, y: 0, width: 0.2, height: 0.2 }, attributes: { color: 'blue' } }, allDetections: [], associatedImages: [0], attributes: { color: 'blue' }, confidence: 0.93 },
        match: { detectionId: 'd3', candidates: [{ sku: 'SKU-B', score: 0.93 }], selectedSku: 'SKU-B', confidence: 0.93, matchSignals: {} },
      },
      {
        cluster: { clusterId: 'c4', representativeDetection: { detectionId: 'd4', imageIndex: 0, label: 'blue cap', confidence: 0.92, boundingBox: { x: 0.8, y: 0, width: 0.2, height: 0.2 }, attributes: { color: 'blue' } }, allDetections: [], associatedImages: [0], attributes: { color: 'blue' }, confidence: 0.92 },
        match: { detectionId: 'd4', candidates: [{ sku: 'SKU-B', score: 0.92 }], selectedSku: 'SKU-B', confidence: 0.92, matchSignals: {} },
      },
    ];

    const reconciliation = reconciler.reconcile(orderLinesScenario1to4, identified);
    expect(reconciliation.isExactMatch).toBe(false);
    expect(reconciliation.discrepancies.some(d => d.type === DiscrepancyType.EXTRA_ITEM && d.expectedSku === 'SKU-B')).toBe(true);

    const verdict = decisionEngine.evaluate({
      imageValidationPassed: true,
      reconciliation,
      overallConfidence: 0.93,
      configuration: config,
    });

    expect(verdict.decision).toBe(OperationalDecision.STOP_AND_FIX);
  });

  it('Scenario 5 — Short Quantity (Expected: 2x Black T-Shirt, Detected: 1x) -> STOP_AND_FIX', () => {
    const singleLineOrder: OrderItem[] = [
      {
        orderItemId: 'item_1',
        orderId: 'ord_1',
        sku: 'SKU-A',
        expectedQuantity: 2,
        productName: 'Black T-Shirt',
        criticalAttributes: ['color', 'size'],
        attributes: { color: 'black', size: 'M' },
      },
    ];

    const identified = [
      {
        cluster: { clusterId: 'c1', representativeDetection: { detectionId: 'd1', imageIndex: 0, label: 'black t-shirt', confidence: 0.95, boundingBox: { x: 0, y: 0, width: 0.2, height: 0.2 }, attributes: { color: 'black', size: 'M' } }, allDetections: [], associatedImages: [0], attributes: { color: 'black', size: 'M' }, confidence: 0.95 },
        match: { detectionId: 'd1', candidates: [{ sku: 'SKU-A', score: 0.95 }], selectedSku: 'SKU-A', confidence: 0.95, matchSignals: {} },
      },
    ];

    const reconciliation = reconciler.reconcile(singleLineOrder, identified);
    expect(reconciliation.isExactMatch).toBe(false);
    expect(reconciliation.discrepancies.some(d => d.type === DiscrepancyType.QUANTITY_MISMATCH)).toBe(true);

    const verdict = decisionEngine.evaluate({
      imageValidationPassed: true,
      reconciliation,
      overallConfidence: 0.95,
      configuration: config,
    });

    expect(verdict.decision).toBe(OperationalDecision.STOP_AND_FIX);
  });

  it('Scenario 6 — Multiple Identical Products (5x Black T-Shirt) -> SEAL', () => {
    const bulkOrder: OrderItem[] = [
      {
        orderItemId: 'item_1',
        orderId: 'ord_bulk',
        sku: 'SKU-A',
        expectedQuantity: 5,
        productName: 'Black T-Shirt',
        criticalAttributes: ['color', 'size'],
        attributes: { color: 'black', size: 'M' },
      },
    ];

    const identified = Array.from({ length: 5 }).map((_, i) => ({
      cluster: {
        clusterId: `c_${i}`,
        representativeDetection: {
          detectionId: `d_${i}`,
          imageIndex: 0,
          label: 'black t-shirt',
          confidence: 0.95,
          boundingBox: { x: i * 0.18, y: 0.2, width: 0.15, height: 0.2 },
          attributes: { color: 'black', size: 'M' },
        },
        allDetections: [],
        associatedImages: [0],
        attributes: { color: 'black', size: 'M' },
        confidence: 0.95,
      },
      match: {
        detectionId: `d_${i}`,
        candidates: [{ sku: 'SKU-A', score: 0.95 }],
        selectedSku: 'SKU-A',
        confidence: 0.95,
        matchSignals: {},
      },
    }));

    const reconciliation = reconciler.reconcile(bulkOrder, identified);
    expect(reconciliation.isExactMatch).toBe(true);

    const verdict = decisionEngine.evaluate({
      imageValidationPassed: true,
      reconciliation,
      overallConfidence: 0.95,
      configuration: config,
    });

    expect(verdict.decision).toBe(OperationalDecision.SEAL);
  });

  it('Scenario 7 — Visually Similar Variant Mismatch (Size M vs Size L) -> STOP_AND_FIX', () => {
    const variantOrder: OrderItem[] = [
      {
        orderItemId: 'item_var',
        orderId: 'ord_var',
        sku: 'SKU-D-L',
        expectedQuantity: 1,
        productName: 'White T-Shirt',
        criticalAttributes: ['color', 'size'],
        attributes: { color: 'white', size: 'L' },
      },
    ];

    // Worker detected White T-Shirt, but in Size M
    const identified = [
      {
        cluster: {
          clusterId: 'c_var',
          representativeDetection: {
            detectionId: 'd_var',
            imageIndex: 0,
            label: 'white t-shirt',
            confidence: 0.95,
            boundingBox: { x: 0.1, y: 0.1, width: 0.4, height: 0.4 },
            attributes: { color: 'white', size: 'M' },
          },
          allDetections: [],
          associatedImages: [0],
          attributes: { color: 'white', size: 'M' },
          confidence: 0.95,
        },
        match: {
          detectionId: 'd_var',
          candidates: [{ sku: 'SKU-D-L', score: 0.92 }],
          selectedSku: 'SKU-D-L',
          confidence: 0.92,
          matchSignals: {},
        },
      },
    ];

    const reconciliation = reconciler.reconcile(variantOrder, identified);
    expect(reconciliation.isExactMatch).toBe(false);
    expect(reconciliation.discrepancies.some(d => d.type === DiscrepancyType.VARIANT_MISMATCH)).toBe(true);

    const verdict = decisionEngine.evaluate({
      imageValidationPassed: true,
      reconciliation,
      overallConfidence: 0.92,
      configuration: config,
    });

    expect(verdict.decision).toBe(OperationalDecision.STOP_AND_FIX);
  });

  it('Scenario 8 — Ambiguous Photograph / Quality Failure -> UNCERTAIN', () => {
    const emptyReconciliation = reconciler.reconcile([], []);
    const verdict = decisionEngine.evaluate({
      imageValidationPassed: false,
      imageValidationIssues: ['Severe motion blur detected', 'Underexposed dark image'],
      reconciliation: emptyReconciliation,
      overallConfidence: 0.1,
      configuration: config,
    });

    expect(verdict.decision).toBe(OperationalDecision.UNCERTAIN);
    expect(verdict.reasonSummary).toContain('Image quality insufficient');
  });

  it('Scenario 10 — AI / Vision Provider Failure -> UNCERTAIN', () => {
    const emptyReconciliation = reconciler.reconcile([], []);
    const verdict = decisionEngine.evaluate({
      imageValidationPassed: true,
      visionFailed: true,
      visionFailureReason: 'Model provider 500 server timeout after 3 retries',
      reconciliation: emptyReconciliation,
      overallConfidence: 0,
      configuration: config,
    });

    expect(verdict.decision).toBe(OperationalDecision.UNCERTAIN);
    expect(verdict.reasonSummary).toContain('Vision failure');
  });
});

describe('Pack State Machine', () => {
  it('allows valid progressive lifecycle transitions', () => {
    const t1 = PackStateMachine.transition('pack_1', PackStatus.RECEIVED, PackStatus.VALIDATING, 'system');
    expect(t1.toStatus).toBe(PackStatus.VALIDATING);

    const t2 = PackStateMachine.transition('pack_1', PackStatus.VALIDATING, PackStatus.ANALYZING, 'system');
    expect(t2.toStatus).toBe(PackStatus.ANALYZING);

    const t3 = PackStateMachine.transition('pack_1', PackStatus.ANALYZING, PackStatus.RECONCILING, 'system');
    expect(t3.toStatus).toBe(PackStatus.RECONCILING);

    const t4 = PackStateMachine.transition('pack_1', PackStatus.RECONCILING, PackStatus.SEAL, 'system');
    expect(t4.toStatus).toBe(PackStatus.SEAL);
  });

  it('allows QC rework and rescan cycle (Scenario 11)', () => {
    // 1st analysis failed
    const t1 = PackStateMachine.transition('pack_1', PackStatus.RECONCILING, PackStatus.STOP_AND_FIX, 'system');
    expect(t1.toStatus).toBe(PackStatus.STOP_AND_FIX);

    // Operator fixes physical box and initiates rescan
    const t2 = PackStateMachine.transition('pack_1', PackStatus.STOP_AND_FIX, PackStatus.VALIDATING, 'operator_qc');
    expect(t2.toStatus).toBe(PackStatus.VALIDATING);
  });

  it('throws InvalidStateTransitionError on forbidden jump', () => {
    expect(() => {
      PackStateMachine.transition('pack_1', PackStatus.RECEIVED, PackStatus.SEAL, 'malicious_actor');
    }).toThrow(InvalidStateTransitionError);
  });
});
