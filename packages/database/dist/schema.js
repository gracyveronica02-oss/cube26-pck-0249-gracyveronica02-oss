"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditEvents = exports.webhookDeliveries = exports.processingJobs = exports.reviewActions = exports.decisions = exports.discrepancies = exports.skuMatches = exports.detections = exports.analyses = exports.modelVersions = exports.packImages = exports.packs = exports.orderItems = exports.orders = exports.productImages = exports.productVariants = exports.products = exports.users = exports.organizations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// 1. Organizations (Tenants)
exports.organizations = (0, pg_core_1.pgTable)('organizations', {
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    active: (0, pg_core_1.boolean)('active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
// 2. Users (Operators, Admins, Supervisors)
exports.users = (0, pg_core_1.pgTable)('users', {
    userId: (0, pg_core_1.varchar)('user_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull(),
    role: (0, pg_core_1.varchar)('role', { length: 32 }).notNull(), // ADMIN, QC_OPERATOR, SUPERVISOR, VIEWER
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// 3. Products
exports.products = (0, pg_core_1.pgTable)('products', {
    productId: (0, pg_core_1.varchar)('product_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    sku: (0, pg_core_1.varchar)('sku', { length: 128 }).notNull(),
    asin: (0, pg_core_1.varchar)('asin', { length: 64 }),
    productName: (0, pg_core_1.varchar)('product_name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    category: (0, pg_core_1.varchar)('category', { length: 128 }),
    brand: (0, pg_core_1.varchar)('brand', { length: 128 }),
    barcode: (0, pg_core_1.varchar)('barcode', { length: 128 }),
    weightGrams: (0, pg_core_1.numeric)('weight_grams', { precision: 10, scale: 2 }),
    dimensionsCm: (0, pg_core_1.jsonb)('dimensions_cm'),
    criticalAttributes: (0, pg_core_1.jsonb)('critical_attributes').notNull().$type(),
    active: (0, pg_core_1.boolean)('active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('uq_products_org_sku').on(table.orgId, table.sku),
    (0, pg_core_1.index)('idx_products_org_id').on(table.orgId),
]);
// 4. Product Variants
exports.productVariants = (0, pg_core_1.pgTable)('product_variants', {
    variantId: (0, pg_core_1.varchar)('variant_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    productId: (0, pg_core_1.varchar)('product_id', { length: 64 }).notNull().references(() => exports.products.productId, { onDelete: 'cascade' }),
    sku: (0, pg_core_1.varchar)('sku', { length: 128 }).notNull(),
    variantName: (0, pg_core_1.varchar)('variant_name', { length: 128 }).notNull(),
    color: (0, pg_core_1.varchar)('color', { length: 64 }),
    size: (0, pg_core_1.varchar)('size', { length: 32 }),
    model: (0, pg_core_1.varchar)('model', { length: 64 }),
    barcode: (0, pg_core_1.varchar)('barcode', { length: 128 }),
    attributes: (0, pg_core_1.jsonb)('attributes').notNull().default({}),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('uq_variants_org_sku').on(table.orgId, table.sku),
    (0, pg_core_1.index)('idx_variants_product_id').on(table.productId),
]);
// 5. Product Images (Reference Photos)
exports.productImages = (0, pg_core_1.pgTable)('product_images', {
    imageId: (0, pg_core_1.varchar)('image_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    productId: (0, pg_core_1.varchar)('product_id', { length: 64 }).notNull().references(() => exports.products.productId, { onDelete: 'cascade' }),
    storagePath: (0, pg_core_1.varchar)('storage_path', { length: 512 }).notNull(),
    imageType: (0, pg_core_1.varchar)('image_type', { length: 32 }).notNull().default('REFERENCE'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// 6. Orders
exports.orders = (0, pg_core_1.pgTable)('orders', {
    orderId: (0, pg_core_1.varchar)('order_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    externalOrderRef: (0, pg_core_1.varchar)('external_order_ref', { length: 128 }).notNull(),
    channel: (0, pg_core_1.varchar)('channel', { length: 64 }).notNull(), // amazon_mfn, shopify, walmart, 3pl_client
    customerName: (0, pg_core_1.varchar)('customer_name', { length: 255 }),
    shippingAddress: (0, pg_core_1.jsonb)('shipping_address'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('uq_orders_org_ref').on(table.orgId, table.externalOrderRef),
]);
// 7. Order Items
exports.orderItems = (0, pg_core_1.pgTable)('order_items', {
    orderItemId: (0, pg_core_1.varchar)('order_item_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    orderId: (0, pg_core_1.varchar)('order_id', { length: 64 }).notNull().references(() => exports.orders.orderId, { onDelete: 'cascade' }),
    sku: (0, pg_core_1.varchar)('sku', { length: 128 }).notNull(),
    expectedQuantity: (0, pg_core_1.integer)('expected_quantity').notNull(),
    productName: (0, pg_core_1.varchar)('product_name', { length: 255 }).notNull(),
    criticalAttributes: (0, pg_core_1.jsonb)('critical_attributes').notNull().$type(),
    attributes: (0, pg_core_1.jsonb)('attributes').notNull().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('uq_order_items_order_sku').on(table.orderId, table.sku),
]);
// 8. Packs (Carton Instances)
exports.packs = (0, pg_core_1.pgTable)('packs', {
    packId: (0, pg_core_1.varchar)('pack_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    unitId: (0, pg_core_1.varchar)('unit_id', { length: 64 }).notNull(),
    orderId: (0, pg_core_1.varchar)('order_id', { length: 64 }).notNull().references(() => exports.orders.orderId),
    packingStation: (0, pg_core_1.varchar)('packing_station', { length: 64 }),
    operatorId: (0, pg_core_1.varchar)('operator_id', { length: 64 }),
    status: (0, pg_core_1.varchar)('status', { length: 32 }).notNull().default('RECEIVED'),
    currentAnalysisId: (0, pg_core_1.varchar)('current_analysis_id', { length: 64 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('uq_packs_org_unit').on(table.orgId, table.unitId),
    (0, pg_core_1.index)('idx_packs_org_status').on(table.orgId, table.status),
]);
// 9. Pack Images
exports.packImages = (0, pg_core_1.pgTable)('pack_images', {
    packImageId: (0, pg_core_1.varchar)('pack_image_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    packId: (0, pg_core_1.varchar)('pack_id', { length: 64 }).notNull().references(() => exports.packs.packId, { onDelete: 'cascade' }),
    storagePath: (0, pg_core_1.varchar)('storage_path', { length: 512 }).notNull(),
    viewAngle: (0, pg_core_1.varchar)('view_angle', { length: 32 }).default('TOP_DOWN'),
    resolutionW: (0, pg_core_1.integer)('resolution_w'),
    resolutionH: (0, pg_core_1.integer)('resolution_h'),
    blurScore: (0, pg_core_1.numeric)('blur_score', { precision: 8, scale: 2 }),
    exposureScore: (0, pg_core_1.numeric)('exposure_score', { precision: 8, scale: 2 }),
    isValid: (0, pg_core_1.boolean)('is_valid').notNull().default(true),
    validationErrors: (0, pg_core_1.jsonb)('validation_errors'),
    capturedAt: (0, pg_core_1.timestamp)('captured_at', { withTimezone: true }).notNull().defaultNow(),
});
// 10. Model Versions
exports.modelVersions = (0, pg_core_1.pgTable)('model_versions', {
    modelVersionId: (0, pg_core_1.varchar)('model_version_id', { length: 64 }).primaryKey(),
    provider: (0, pg_core_1.varchar)('provider', { length: 64 }).notNull(), // gemini, openai, mock
    modelName: (0, pg_core_1.varchar)('model_name', { length: 128 }).notNull(),
    versionTag: (0, pg_core_1.varchar)('version_tag', { length: 64 }).notNull(),
    active: (0, pg_core_1.boolean)('active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// 11. Analyses
exports.analyses = (0, pg_core_1.pgTable)('analyses', {
    analysisId: (0, pg_core_1.varchar)('analysis_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    packId: (0, pg_core_1.varchar)('pack_id', { length: 64 }).notNull().references(() => exports.packs.packId, { onDelete: 'cascade' }),
    analysisNumber: (0, pg_core_1.integer)('analysis_number').notNull().default(1),
    modelVersionId: (0, pg_core_1.varchar)('model_version_id', { length: 64 }).references(() => exports.modelVersions.modelVersionId),
    status: (0, pg_core_1.varchar)('status', { length: 32 }).notNull(), // PENDING, IN_PROGRESS, COMPLETED, FAILED
    overallConfidence: (0, pg_core_1.numeric)('overall_confidence', { precision: 5, scale: 4 }),
    decision: (0, pg_core_1.varchar)('decision', { length: 32 }), // SEAL, STOP_AND_FIX
    executionTimeMs: (0, pg_core_1.integer)('execution_time_ms'),
    rawAiResponse: (0, pg_core_1.jsonb)('raw_ai_response'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
}, (table) => [
    (0, pg_core_1.index)('idx_analyses_pack_id').on(table.packId),
]);
// 12. Detections
exports.detections = (0, pg_core_1.pgTable)('detections', {
    detectionId: (0, pg_core_1.varchar)('detection_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    analysisId: (0, pg_core_1.varchar)('analysis_id', { length: 64 }).notNull().references(() => exports.analyses.analysisId, { onDelete: 'cascade' }),
    packImageId: (0, pg_core_1.varchar)('pack_image_id', { length: 64 }).notNull().references(() => exports.packImages.packImageId),
    boundingBox: (0, pg_core_1.jsonb)('bounding_box').notNull(),
    cropStoragePath: (0, pg_core_1.varchar)('crop_storage_path', { length: 512 }),
    label: (0, pg_core_1.varchar)('label', { length: 128 }).notNull(),
    detectedAttributes: (0, pg_core_1.jsonb)('detected_attributes').notNull().default({}),
    detectionConfidence: (0, pg_core_1.numeric)('detection_confidence', { precision: 5, scale: 4 }).notNull(),
    physicalItemClusterId: (0, pg_core_1.varchar)('physical_item_cluster_id', { length: 64 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_detections_analysis_id').on(table.analysisId),
]);
// 13. SKU Matches
exports.skuMatches = (0, pg_core_1.pgTable)('sku_matches', {
    skuMatchId: (0, pg_core_1.varchar)('sku_match_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    detectionId: (0, pg_core_1.varchar)('detection_id', { length: 64 }).notNull().references(() => exports.detections.detectionId, { onDelete: 'cascade' }),
    selectedSku: (0, pg_core_1.varchar)('selected_sku', { length: 128 }),
    confidence: (0, pg_core_1.numeric)('confidence', { precision: 5, scale: 4 }).notNull(),
    candidates: (0, pg_core_1.jsonb)('candidates').notNull().default([]),
    matchSignals: (0, pg_core_1.jsonb)('match_signals').notNull().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// 14. Discrepancies
exports.discrepancies = (0, pg_core_1.pgTable)('discrepancies', {
    discrepancyId: (0, pg_core_1.varchar)('discrepancy_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    analysisId: (0, pg_core_1.varchar)('analysis_id', { length: 64 }).notNull().references(() => exports.analyses.analysisId, { onDelete: 'cascade' }),
    type: (0, pg_core_1.varchar)('type', { length: 64 }).notNull(),
    expectedSku: (0, pg_core_1.varchar)('expected_sku', { length: 128 }),
    detectedSku: (0, pg_core_1.varchar)('detected_sku', { length: 128 }),
    expectedQuantity: (0, pg_core_1.integer)('expected_quantity'),
    detectedQuantity: (0, pg_core_1.integer)('detected_quantity'),
    details: (0, pg_core_1.jsonb)('details').notNull().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_discrepancies_analysis_id').on(table.analysisId),
]);
// 15. Decisions
exports.decisions = (0, pg_core_1.pgTable)('decisions', {
    decisionId: (0, pg_core_1.varchar)('decision_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    analysisId: (0, pg_core_1.varchar)('analysis_id', { length: 64 }).notNull().references(() => exports.analyses.analysisId, { onDelete: 'cascade' }),
    operationalVerdict: (0, pg_core_1.varchar)('operational_verdict', { length: 32 }).notNull(),
    summaryReason: (0, pg_core_1.text)('summary_reason').notNull(),
    ruleEvaluations: (0, pg_core_1.jsonb)('rule_evaluations').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// 16. QC Operator Review Actions
exports.reviewActions = (0, pg_core_1.pgTable)('review_actions', {
    reviewId: (0, pg_core_1.varchar)('review_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    packId: (0, pg_core_1.varchar)('pack_id', { length: 64 }).notNull().references(() => exports.packs.packId, { onDelete: 'cascade' }),
    analysisId: (0, pg_core_1.varchar)('analysis_id', { length: 64 }).notNull().references(() => exports.analyses.analysisId),
    operatorId: (0, pg_core_1.varchar)('operator_id', { length: 64 }).notNull(),
    action: (0, pg_core_1.varchar)('action', { length: 32 }).notNull(), // APPROVED_OVERRIDE, REJECTED_REPACK, RESCAN_REQUESTED
    operatorVerdict: (0, pg_core_1.varchar)('operator_verdict', { length: 32 }).notNull(),
    reasonCode: (0, pg_core_1.varchar)('reason_code', { length: 64 }).notNull(),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// 17. Processing Jobs
exports.processingJobs = (0, pg_core_1.pgTable)('processing_jobs', {
    jobId: (0, pg_core_1.varchar)('job_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    packId: (0, pg_core_1.varchar)('pack_id', { length: 64 }).notNull().references(() => exports.packs.packId, { onDelete: 'cascade' }),
    idempotencyKey: (0, pg_core_1.varchar)('idempotency_key', { length: 128 }).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 32 }).notNull().default('PENDING'),
    attempt: (0, pg_core_1.integer)('attempt').notNull().default(1),
    maxAttempts: (0, pg_core_1.integer)('max_attempts').notNull().default(3),
    errorMessage: (0, pg_core_1.text)('error_message'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    startedAt: (0, pg_core_1.timestamp)('started_at', { withTimezone: true }),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('uq_jobs_org_idempotency').on(table.orgId, table.idempotencyKey),
    (0, pg_core_1.index)('idx_jobs_status').on(table.status, table.createdAt),
]);
// 18. Webhook Deliveries
exports.webhookDeliveries = (0, pg_core_1.pgTable)('webhook_deliveries', {
    deliveryId: (0, pg_core_1.varchar)('delivery_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    packId: (0, pg_core_1.varchar)('pack_id', { length: 64 }).notNull().references(() => exports.packs.packId),
    eventType: (0, pg_core_1.varchar)('event_type', { length: 64 }).notNull(),
    payload: (0, pg_core_1.jsonb)('payload').notNull(),
    targetUrl: (0, pg_core_1.varchar)('target_url', { length: 512 }).notNull(),
    httpStatus: (0, pg_core_1.integer)('http_status'),
    status: (0, pg_core_1.varchar)('status', { length: 32 }).notNull(),
    attempt: (0, pg_core_1.integer)('attempt').notNull().default(1),
    deliveredAt: (0, pg_core_1.timestamp)('delivered_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
});
// 19. Audit Events
exports.auditEvents = (0, pg_core_1.pgTable)('audit_events', {
    auditId: (0, pg_core_1.varchar)('audit_id', { length: 64 }).primaryKey(),
    orgId: (0, pg_core_1.varchar)('org_id', { length: 64 }).notNull().references(() => exports.organizations.orgId),
    entityType: (0, pg_core_1.varchar)('entity_type', { length: 64 }).notNull(),
    entityId: (0, pg_core_1.varchar)('entity_id', { length: 64 }).notNull(),
    actorId: (0, pg_core_1.varchar)('actor_id', { length: 64 }).notNull(),
    action: (0, pg_core_1.varchar)('action', { length: 64 }).notNull(),
    previousState: (0, pg_core_1.jsonb)('previous_state'),
    newState: (0, pg_core_1.jsonb)('new_state'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_audit_org_entity').on(table.orgId, table.entityType, table.entityId),
]);
//# sourceMappingURL=schema.js.map