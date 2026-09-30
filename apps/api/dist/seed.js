"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDemoData = seedDemoData;
const database_1 = require("@pack-manager/database");
const shared_1 = require("@pack-manager/shared");
function generateBoxSvg(title, items) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
    <!-- Background / Packing Conveyor -->
    <rect width="800" height="600" fill="#1e222d"/>
    <!-- Conveyor Rollers -->
    <line x1="0" y1="50" x2="800" y2="50" stroke="#2a303f" stroke-width="6"/>
    <line x1="0" y1="150" x2="800" y2="150" stroke="#2a303f" stroke-width="6"/>
    <line x1="0" y1="250" x2="800" y2="250" stroke="#2a303f" stroke-width="6"/>
    <line x1="0" y1="350" x2="800" y2="350" stroke="#2a303f" stroke-width="6"/>
    <line x1="0" y1="450" x2="800" y2="450" stroke="#2a303f" stroke-width="6"/>
    <line x1="0" y1="550" x2="800" y2="550" stroke="#2a303f" stroke-width="6"/>

    <!-- Open Cardboard Box Outer -->
    <rect x="100" y="60" width="600" height="480" rx="8" fill="#a2784d" stroke="#7e5c38" stroke-width="5"/>
    <!-- Box Flaps (Top, Bottom, Left, Right) -->
    <polygon points="100,60 80,10 720,10 700,60" fill="#8c643b" opacity="0.9"/>
    <polygon points="100,540 80,590 720,590 700,540" fill="#8c643b" opacity="0.9"/>
    <polygon points="100,60 40,90 40,510 100,540" fill="#75522e" opacity="0.9"/>
    <polygon points="700,60 760,90 760,510 700,540" fill="#75522e" opacity="0.9"/>

    <!-- Box Interior Well -->
    <rect x="120" y="80" width="560" height="440" rx="4" fill="#b98d5c"/>
    <rect x="130" y="90" width="540" height="420" rx="4" fill="#694b2a" opacity="0.25"/>

    <!-- Kraft Paper Cushioning -->
    <path d="M 130 90 Q 200 130 260 100 T 380 120 T 520 95 T 670 110 L 670 140 Q 500 160 350 140 T 130 150 Z" fill="#d4b483" opacity="0.8"/>
    <path d="M 130 510 Q 250 470 360 490 T 550 475 T 670 510 L 670 480 Q 520 450 350 470 T 130 470 Z" fill="#d4b483" opacity="0.8"/>

    <!-- Render Items inside Box -->
    ${items.map(it => `
      <g>
        <rect x="${it.x}" y="${it.y}" width="${it.w}" height="${it.h}" rx="6" fill="${it.color}" stroke="#ffffff" stroke-opacity="0.3" stroke-width="2"/>
        <text x="${it.x + it.w / 2}" y="${it.y + it.h / 2 + 5}" fill="#ffffff" font-family="sans-serif" font-weight="700" font-size="14" text-anchor="middle">${it.label}</text>
      </g>
    `).join('')}

    <!-- Station Watermark -->
    <text x="730" y="580" fill="#475569" font-family="monospace" font-size="12" text-anchor="end">${title} · Station CAM-01</text>
  </svg>`;
    return Buffer.from(svg, 'utf-8');
}
async function seedDemoData(repos, storage) {
    const orgId = 'org_demo_alpha';
    // Check if already seeded
    const existingProds = await repos.listProducts(orgId);
    if (existingProds.length > 0)
        return;
    const now = new Date();
    // 1. Seed Catalog Products
    const products = [
        {
            productId: 'prod_sku_a',
            orgId,
            sku: 'SKU-A',
            productName: 'Heavyweight Cotton Crewneck T-Shirt (M)',
            category: 'Apparel',
            brand: 'Basics Warehouse',
            barcode: '012345678901',
            weightGrams: 220,
            dimensionsCm: { length: 28, width: 22, height: 3 },
            criticalAttributes: ['color', 'size'],
            referenceImages: [],
            active: true,
            variants: [
                {
                    variantId: 'var_a_m',
                    productId: 'prod_sku_a',
                    sku: 'SKU-A',
                    variantName: 'Black / Medium',
                    color: 'Black',
                    size: 'M',
                    barcode: '012345678901',
                    attributes: { color: 'Black', size: 'M' },
                },
            ],
            createdAt: now,
            updatedAt: now,
        },
        {
            productId: 'prod_sku_b',
            orgId,
            sku: 'SKU-B',
            productName: 'Matte Ceramic Coffee Mug (12oz)',
            category: 'Home & Kitchen',
            brand: 'BaristaCraft',
            barcode: '012345678902',
            weightGrams: 360,
            dimensionsCm: { length: 12, width: 9, height: 11 },
            criticalAttributes: ['color', 'material'],
            referenceImages: [],
            active: true,
            variants: [
                {
                    variantId: 'var_b_w',
                    productId: 'prod_sku_b',
                    sku: 'SKU-B',
                    variantName: 'Matte White',
                    color: 'White',
                    barcode: '012345678902',
                    attributes: { color: 'White' },
                },
            ],
            createdAt: now,
            updatedAt: now,
        },
        {
            productId: 'prod_sku_c',
            orgId,
            sku: 'SKU-C',
            productName: 'Ergonomic 2.4G Wireless Mouse',
            category: 'Electronics',
            brand: 'TechGear Pro',
            barcode: '012345678903',
            weightGrams: 95,
            dimensionsCm: { length: 11, width: 6, height: 4 },
            criticalAttributes: ['connectivity', 'color'],
            referenceImages: [],
            active: true,
            variants: [
                {
                    variantId: 'var_c_blk',
                    productId: 'prod_sku_c',
                    sku: 'SKU-C',
                    variantName: 'Stealth Black',
                    color: 'Black',
                    barcode: '012345678903',
                    attributes: { connectivity: 'Wireless 2.4G' },
                },
            ],
            createdAt: now,
            updatedAt: now,
        },
        {
            productId: 'prod_sku_d',
            orgId,
            sku: 'SKU-D',
            productName: 'Braided USB-C to USB-C Fast Cable (2m)',
            category: 'Electronics Accessories',
            brand: 'PowerLink',
            barcode: '012345678904',
            weightGrams: 55,
            dimensionsCm: { length: 15, width: 8, height: 2 },
            criticalAttributes: ['length', 'connector'],
            referenceImages: [],
            active: true,
            variants: [
                {
                    variantId: 'var_d_2m',
                    productId: 'prod_sku_d',
                    sku: 'SKU-D',
                    variantName: 'Space Grey 2m',
                    barcode: '012345678904',
                    attributes: { length: '2m' },
                },
            ],
            createdAt: now,
            updatedAt: now,
        },
    ];
    for (const prod of products) {
        await repos.createProduct(prod);
    }
    // 2. Orders
    const orders = [
        {
            orderId: 'ORD-101',
            orgId,
            externalOrderRef: 'SHPFY-#9481',
            channel: 'Shopify Direct',
            customerName: 'Sarah Jenkins',
            createdAt: new Date(Date.now() - 3600000),
            items: [
                {
                    orderItemId: 'item_101_1',
                    orderId: 'ORD-101',
                    sku: 'SKU-A',
                    expectedQuantity: 2,
                    productName: 'Heavyweight Cotton Crewneck T-Shirt (M)',
                    criticalAttributes: ['color', 'size'],
                    attributes: { color: 'Black', size: 'M' },
                },
            ],
        },
        {
            orderId: 'ORD-102',
            orgId,
            externalOrderRef: 'WOO-#4402',
            channel: 'WooCommerce',
            customerName: 'David Chen',
            createdAt: new Date(Date.now() - 7200000),
            items: [
                {
                    orderItemId: 'item_102_1',
                    orderId: 'ORD-102',
                    sku: 'SKU-B',
                    expectedQuantity: 1,
                    productName: 'Matte Ceramic Coffee Mug (12oz)',
                    criticalAttributes: ['color'],
                    attributes: { color: 'White' },
                },
                {
                    orderItemId: 'item_102_2',
                    orderId: 'ORD-102',
                    sku: 'SKU-C',
                    expectedQuantity: 1,
                    productName: 'Ergonomic 2.4G Wireless Mouse',
                    criticalAttributes: ['connectivity'],
                    attributes: { connectivity: 'Wireless 2.4G' },
                },
            ],
        },
        {
            orderId: 'ORD-103',
            orgId,
            externalOrderRef: 'AMZ-#112-9901',
            channel: 'Amazon FBM',
            customerName: 'Marcus Vance',
            createdAt: new Date(Date.now() - 5400000),
            items: [
                {
                    orderItemId: 'item_103_1',
                    orderId: 'ORD-103',
                    sku: 'SKU-B',
                    expectedQuantity: 1,
                    productName: 'Matte Ceramic Coffee Mug (12oz)',
                    criticalAttributes: ['color'],
                    attributes: { color: 'White' },
                },
                {
                    orderItemId: 'item_103_2',
                    orderId: 'ORD-103',
                    sku: 'SKU-C',
                    expectedQuantity: 1,
                    productName: 'Ergonomic 2.4G Wireless Mouse',
                    criticalAttributes: ['connectivity'],
                    attributes: { connectivity: 'Wireless 2.4G' },
                },
            ],
        },
        {
            orderId: 'ORD-104',
            orgId,
            externalOrderRef: 'EBY-#55214',
            channel: 'eBay Logistics',
            customerName: 'Elena Rostova',
            createdAt: new Date(Date.now() - 10800000),
            items: [
                {
                    orderItemId: 'item_104_1',
                    orderId: 'ORD-104',
                    sku: 'SKU-A',
                    expectedQuantity: 1,
                    productName: 'Heavyweight Cotton Crewneck T-Shirt (M)',
                    criticalAttributes: ['color', 'size'],
                    attributes: { color: 'Black', size: 'M' },
                },
            ],
        },
    ];
    for (const ord of orders) {
        await repos.createOrder(ord);
    }
    // 3. Helper to create SVG image and store it
    const img1Buffer = generateBoxSvg('PACK-001', [
        { label: 'SKU-A (Shirt)', x: 260, y: 180, w: 280, h: 220, color: '#1e293b' },
    ]);
    const img2Buffer = generateBoxSvg('PACK-002', [
        { label: 'SKU-B (Mug)', x: 180, y: 200, w: 180, h: 180, color: '#334155' },
        { label: 'SKU-D (Cable)', x: 440, y: 220, w: 200, h: 140, color: '#0369a1' },
    ]);
    const img3Buffer = generateBoxSvg('PACK-003', [
        { label: 'SKU-B (Mug)', x: 180, y: 190, w: 180, h: 180, color: '#334155' },
        { label: 'SKU-C (Mouse)', x: 430, y: 200, w: 210, h: 170, color: '#475569' },
    ]);
    const p1Path = database_1.StoragePaths.packOriginal(orgId, 'PACK-001', 'img_001', 'svg');
    const p2Path = database_1.StoragePaths.packOriginal(orgId, 'PACK-002', 'img_002', 'svg');
    const p3Path = database_1.StoragePaths.packOriginal(orgId, 'PACK-003', 'img_003', 'svg');
    await storage.upload(p1Path, img1Buffer, 'image/svg+xml');
    await storage.upload(p2Path, img2Buffer, 'image/svg+xml');
    await storage.upload(p3Path, img3Buffer, 'image/svg+xml');
    // 4. Seed Packs & Analyses
    // --- PACK-001: Missing item -> STOP_AND_FIX ---
    const anl1Id = 'ANL-001';
    const pack1 = {
        packId: 'PACK-001',
        orgId,
        unitId: 'UNIT-9012',
        orderId: 'ORD-101',
        packingStation: 'STATION-01',
        operatorId: 'operator_1',
        status: shared_1.PackStatus.STOP_AND_FIX,
        currentAnalysisId: anl1Id,
        images: [
            {
                packImageId: 'img_001',
                packId: 'PACK-001',
                storagePath: p1Path,
                viewAngle: 'TOP_DOWN',
                resolutionW: 1920,
                resolutionH: 1080,
                blurScore: 480,
                exposureScore: 128,
                isValid: true,
                capturedAt: new Date(Date.now() - 1800000),
            },
        ],
        analyses: [],
        createdAt: new Date(Date.now() - 1800000),
        updatedAt: new Date(Date.now() - 1795000),
    };
    await repos.createPack(pack1);
    const analysis1 = {
        analysisId: anl1Id,
        orgId,
        packId: 'PACK-001',
        analysisNumber: 1,
        status: 'COMPLETED',
        overallConfidence: 0.94,
        decision: shared_1.OperationalDecision.STOP_AND_FIX,
        executionTimeMs: 1140,
        detections: [
            {
                detectionId: 'det_1_1',
                packImageId: 'img_001',
                imageIndex: 0,
                label: 'Black Cotton T-Shirt',
                confidence: 0.96,
                boundingBox: { x: 0.325, y: 0.300, width: 0.350, height: 0.367 },
                attributes: { color: 'Black', size: 'M' },
                barcodeDetected: '012345678901',
            },
        ],
        skuMatches: [
            {
                skuMatchId: 'match_1_1',
                detectionId: 'det_1_1',
                candidates: [{ sku: 'SKU-A', score: 0.96 }],
                selectedSku: 'SKU-A',
                confidence: 0.96,
                matchSignals: { barcode: true, visualEmbedding: 0.95 },
            },
        ],
        discrepancies: [
            {
                discrepancyId: 'disc_1_1',
                analysisId: anl1Id,
                type: shared_1.DiscrepancyType.MISSING_ITEM,
                expectedSku: 'SKU-A',
                expectedQuantity: 2,
                detectedQuantity: 1,
                details: { reason: 'Quantity shortfall: expected 2 units of SKU-A, observed 1.' },
            },
        ],
        ruleEvaluations: {
            imageQualityGate: { status: 'PASS', score: 480, reason: 'Sharp, well-exposed image' },
            quantityReconciliationGate: { status: 'FAIL', reason: 'Shortage detected: SKU-A missing 1 unit' },
            criticalAttributeGate: { status: 'PASS', reason: 'Color (Black) and Size (M) match customer selection' },
            confidenceThresholdGate: { status: 'PASS', confidence: 0.94, threshold: 0.85 },
            unidentifiedObjectsGate: { status: 'PASS', count: 0 },
        },
        createdAt: new Date(Date.now() - 1795000),
        completedAt: new Date(Date.now() - 1793860),
    };
    await repos.createAnalysis(analysis1);
    // --- PACK-002: Unexpected item -> STOP_AND_FIX ---
    const anl2Id = 'ANL-002';
    const pack2 = {
        packId: 'PACK-002',
        orgId,
        unitId: 'UNIT-9013',
        orderId: 'ORD-102',
        packingStation: 'STATION-02',
        operatorId: 'operator_2',
        status: shared_1.PackStatus.STOP_AND_FIX,
        currentAnalysisId: anl2Id,
        images: [
            {
                packImageId: 'img_002',
                packId: 'PACK-002',
                storagePath: p2Path,
                viewAngle: 'TOP_DOWN',
                resolutionW: 1920,
                resolutionH: 1080,
                blurScore: 520,
                exposureScore: 132,
                isValid: true,
                capturedAt: new Date(Date.now() - 3600000),
            },
        ],
        analyses: [],
        createdAt: new Date(Date.now() - 3600000),
        updatedAt: new Date(Date.now() - 3594000),
    };
    await repos.createPack(pack2);
    const analysis2 = {
        analysisId: anl2Id,
        orgId,
        packId: 'PACK-002',
        analysisNumber: 1,
        status: 'COMPLETED',
        overallConfidence: 0.91,
        decision: shared_1.OperationalDecision.STOP_AND_FIX,
        executionTimeMs: 1290,
        detections: [
            {
                detectionId: 'det_2_1',
                packImageId: 'img_002',
                imageIndex: 0,
                label: 'Matte Ceramic Coffee Mug',
                confidence: 0.95,
                boundingBox: { x: 0.225, y: 0.333, width: 0.225, height: 0.300 },
                attributes: { color: 'White' },
                barcodeDetected: '012345678902',
            },
            {
                detectionId: 'det_2_2',
                packImageId: 'img_002',
                imageIndex: 0,
                label: 'USB-C Fast Cable',
                confidence: 0.92,
                boundingBox: { x: 0.550, y: 0.367, width: 0.250, height: 0.233 },
                attributes: { length: '2m' },
                barcodeDetected: '012345678904',
            },
        ],
        skuMatches: [
            {
                skuMatchId: 'match_2_1',
                detectionId: 'det_2_1',
                candidates: [{ sku: 'SKU-B', score: 0.95 }],
                selectedSku: 'SKU-B',
                confidence: 0.95,
                matchSignals: { barcode: true },
            },
            {
                skuMatchId: 'match_2_2',
                detectionId: 'det_2_2',
                candidates: [{ sku: 'SKU-D', score: 0.92 }],
                selectedSku: 'SKU-D',
                confidence: 0.92,
                matchSignals: { barcode: true },
            },
        ],
        discrepancies: [
            {
                discrepancyId: 'disc_2_1',
                analysisId: anl2Id,
                type: shared_1.DiscrepancyType.MISSING_ITEM,
                expectedSku: 'SKU-C',
                expectedQuantity: 1,
                detectedQuantity: 0,
                details: { reason: 'Order specifies SKU-C (Wireless Mouse), but item was not placed into carton' },
            },
            {
                discrepancyId: 'disc_2_2',
                analysisId: anl2Id,
                type: shared_1.DiscrepancyType.EXTRA_ITEM,
                detectedSku: 'SKU-D',
                expectedQuantity: 0,
                detectedQuantity: 1,
                details: { reason: 'Carton contains SKU-D (USB-C Cable) which does not belong to this order' },
            },
        ],
        ruleEvaluations: {
            imageQualityGate: { status: 'PASS', score: 520 },
            quantityReconciliationGate: { status: 'FAIL', reason: 'Missing item SKU-C, unexpected item SKU-D' },
            criticalAttributeGate: { status: 'PASS' },
            confidenceThresholdGate: { status: 'PASS', confidence: 0.91 },
        },
        createdAt: new Date(Date.now() - 3594000),
        completedAt: new Date(Date.now() - 3592710),
    };
    await repos.createAnalysis(analysis2);
    // --- PACK-003: Exact match -> SEAL ---
    const anl3Id = 'ANL-003';
    const pack3 = {
        packId: 'PACK-003',
        orgId,
        unitId: 'UNIT-9014',
        orderId: 'ORD-103',
        packingStation: 'STATION-01',
        operatorId: 'operator_1',
        status: shared_1.PackStatus.SEAL,
        currentAnalysisId: anl3Id,
        images: [
            {
                packImageId: 'img_003',
                packId: 'PACK-003',
                storagePath: p3Path,
                viewAngle: 'TOP_DOWN',
                resolutionW: 1920,
                resolutionH: 1080,
                blurScore: 610,
                exposureScore: 125,
                isValid: true,
                capturedAt: new Date(Date.now() - 5000000),
            },
        ],
        analyses: [],
        createdAt: new Date(Date.now() - 5000000),
        updatedAt: new Date(Date.now() - 4995000),
    };
    await repos.createPack(pack3);
    const analysis3 = {
        analysisId: anl3Id,
        orgId,
        packId: 'PACK-003',
        analysisNumber: 1,
        status: 'COMPLETED',
        overallConfidence: 0.98,
        decision: shared_1.OperationalDecision.SEAL,
        executionTimeMs: 980,
        detections: [
            {
                detectionId: 'det_3_1',
                packImageId: 'img_003',
                imageIndex: 0,
                label: 'Matte Ceramic Coffee Mug',
                confidence: 0.98,
                boundingBox: { x: 0.225, y: 0.317, width: 0.225, height: 0.300 },
                attributes: { color: 'White' },
                barcodeDetected: '012345678902',
            },
            {
                detectionId: 'det_3_2',
                packImageId: 'img_003',
                imageIndex: 0,
                label: 'Ergonomic Wireless Mouse',
                confidence: 0.97,
                boundingBox: { x: 0.538, y: 0.333, width: 0.263, height: 0.283 },
                attributes: { connectivity: 'Wireless 2.4G' },
                barcodeDetected: '012345678903',
            },
        ],
        skuMatches: [
            {
                skuMatchId: 'match_3_1',
                detectionId: 'det_3_1',
                candidates: [{ sku: 'SKU-B', score: 0.98 }],
                selectedSku: 'SKU-B',
                confidence: 0.98,
                matchSignals: { barcode: true, visualEmbedding: 0.98 },
            },
            {
                skuMatchId: 'match_3_2',
                detectionId: 'det_3_2',
                candidates: [{ sku: 'SKU-C', score: 0.97 }],
                selectedSku: 'SKU-C',
                confidence: 0.97,
                matchSignals: { barcode: true, visualEmbedding: 0.97 },
            },
        ],
        discrepancies: [],
        ruleEvaluations: {
            imageQualityGate: { status: 'PASS', score: 610, reason: 'Optimal illumination and sharpness' },
            quantityReconciliationGate: { status: 'PASS', reason: 'Exact 1:1 match across all ordered SKUs' },
            criticalAttributeGate: { status: 'PASS', reason: 'All variant constraints fulfilled' },
            confidenceThresholdGate: { status: 'PASS', confidence: 0.98, threshold: 0.85 },
            unidentifiedObjectsGate: { status: 'PASS', count: 0 },
        },
        createdAt: new Date(Date.now() - 4995000),
        completedAt: new Date(Date.now() - 4994020),
    };
    await repos.createAnalysis(analysis3);
}
//# sourceMappingURL=seed.js.map