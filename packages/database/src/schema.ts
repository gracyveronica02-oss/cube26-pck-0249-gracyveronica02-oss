import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// 1. Organizations (Tenants)
export const organizations = pgTable('organizations', {
  orgId: varchar('org_id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 2. Users (Operators, Admins, Supervisors)
export const users = pgTable('users', {
  userId: varchar('user_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 32 }).notNull(), // ADMIN, QC_OPERATOR, SUPERVISOR, VIEWER
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 3. Products
export const products = pgTable('products', {
  productId: varchar('product_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  sku: varchar('sku', { length: 128 }).notNull(),
  asin: varchar('asin', { length: 64 }),
  productName: varchar('product_name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 128 }),
  brand: varchar('brand', { length: 128 }),
  barcode: varchar('barcode', { length: 128 }),
  weightGrams: numeric('weight_grams', { precision: 10, scale: 2 }),
  dimensionsCm: jsonb('dimensions_cm'),
  criticalAttributes: jsonb('critical_attributes').notNull().$type<string[]>(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_products_org_sku').on(table.orgId, table.sku),
  index('idx_products_org_id').on(table.orgId),
]);

// 4. Product Variants
export const productVariants = pgTable('product_variants', {
  variantId: varchar('variant_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  productId: varchar('product_id', { length: 64 }).notNull().references(() => products.productId, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 128 }).notNull(),
  variantName: varchar('variant_name', { length: 128 }).notNull(),
  color: varchar('color', { length: 64 }),
  size: varchar('size', { length: 32 }),
  model: varchar('model', { length: 64 }),
  barcode: varchar('barcode', { length: 128 }),
  attributes: jsonb('attributes').notNull().default({}),
}, (table) => [
  uniqueIndex('uq_variants_org_sku').on(table.orgId, table.sku),
  index('idx_variants_product_id').on(table.productId),
]);

// 5. Product Images (Reference Photos)
export const productImages = pgTable('product_images', {
  imageId: varchar('image_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  productId: varchar('product_id', { length: 64 }).notNull().references(() => products.productId, { onDelete: 'cascade' }),
  storagePath: varchar('storage_path', { length: 512 }).notNull(),
  imageType: varchar('image_type', { length: 32 }).notNull().default('REFERENCE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 6. Orders
export const orders = pgTable('orders', {
  orderId: varchar('order_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  externalOrderRef: varchar('external_order_ref', { length: 128 }).notNull(),
  channel: varchar('channel', { length: 64 }).notNull(), // amazon_mfn, shopify, walmart, 3pl_client
  customerName: varchar('customer_name', { length: 255 }),
  shippingAddress: jsonb('shipping_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_orders_org_ref').on(table.orgId, table.externalOrderRef),
]);

// 7. Order Items
export const orderItems = pgTable('order_items', {
  orderItemId: varchar('order_item_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  orderId: varchar('order_id', { length: 64 }).notNull().references(() => orders.orderId, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 128 }).notNull(),
  expectedQuantity: integer('expected_quantity').notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  criticalAttributes: jsonb('critical_attributes').notNull().$type<string[]>(),
  attributes: jsonb('attributes').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_order_items_order_sku').on(table.orderId, table.sku),
]);

// 8. Packs (Carton Instances)
export const packs = pgTable('packs', {
  packId: varchar('pack_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  unitId: varchar('unit_id', { length: 64 }).notNull(),
  orderId: varchar('order_id', { length: 64 }).notNull().references(() => orders.orderId),
  packingStation: varchar('packing_station', { length: 64 }),
  operatorId: varchar('operator_id', { length: 64 }),
  status: varchar('status', { length: 32 }).notNull().default('RECEIVED'),
  currentAnalysisId: varchar('current_analysis_id', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_packs_org_unit').on(table.orgId, table.unitId),
  index('idx_packs_org_status').on(table.orgId, table.status),
]);

// 9. Pack Images
export const packImages = pgTable('pack_images', {
  packImageId: varchar('pack_image_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  packId: varchar('pack_id', { length: 64 }).notNull().references(() => packs.packId, { onDelete: 'cascade' }),
  storagePath: varchar('storage_path', { length: 512 }).notNull(),
  viewAngle: varchar('view_angle', { length: 32 }).default('TOP_DOWN'),
  resolutionW: integer('resolution_w'),
  resolutionH: integer('resolution_h'),
  blurScore: numeric('blur_score', { precision: 8, scale: 2 }),
  exposureScore: numeric('exposure_score', { precision: 8, scale: 2 }),
  isValid: boolean('is_valid').notNull().default(true),
  validationErrors: jsonb('validation_errors'),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
});

// 10. Model Versions
export const modelVersions = pgTable('model_versions', {
  modelVersionId: varchar('model_version_id', { length: 64 }).primaryKey(),
  provider: varchar('provider', { length: 64 }).notNull(), // gemini, openai, mock
  modelName: varchar('model_name', { length: 128 }).notNull(),
  versionTag: varchar('version_tag', { length: 64 }).notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 11. Analyses
export const analyses = pgTable('analyses', {
  analysisId: varchar('analysis_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  packId: varchar('pack_id', { length: 64 }).notNull().references(() => packs.packId, { onDelete: 'cascade' }),
  analysisNumber: integer('analysis_number').notNull().default(1),
  modelVersionId: varchar('model_version_id', { length: 64 }).references(() => modelVersions.modelVersionId),
  status: varchar('status', { length: 32 }).notNull(), // PENDING, IN_PROGRESS, COMPLETED, FAILED
  overallConfidence: numeric('overall_confidence', { precision: 5, scale: 4 }),
  decision: varchar('decision', { length: 32 }), // SEAL, STOP_AND_FIX
  executionTimeMs: integer('execution_time_ms'),
  rawAiResponse: jsonb('raw_ai_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  index('idx_analyses_pack_id').on(table.packId),
]);

// 12. Detections
export const detections = pgTable('detections', {
  detectionId: varchar('detection_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  analysisId: varchar('analysis_id', { length: 64 }).notNull().references(() => analyses.analysisId, { onDelete: 'cascade' }),
  packImageId: varchar('pack_image_id', { length: 64 }).notNull().references(() => packImages.packImageId),
  boundingBox: jsonb('bounding_box').notNull(),
  cropStoragePath: varchar('crop_storage_path', { length: 512 }),
  label: varchar('label', { length: 128 }).notNull(),
  detectedAttributes: jsonb('detected_attributes').notNull().default({}),
  detectionConfidence: numeric('detection_confidence', { precision: 5, scale: 4 }).notNull(),
  physicalItemClusterId: varchar('physical_item_cluster_id', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_detections_analysis_id').on(table.analysisId),
]);

// 13. SKU Matches
export const skuMatches = pgTable('sku_matches', {
  skuMatchId: varchar('sku_match_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  detectionId: varchar('detection_id', { length: 64 }).notNull().references(() => detections.detectionId, { onDelete: 'cascade' }),
  selectedSku: varchar('selected_sku', { length: 128 }),
  confidence: numeric('confidence', { precision: 5, scale: 4 }).notNull(),
  candidates: jsonb('candidates').notNull().default([]),
  matchSignals: jsonb('match_signals').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 14. Discrepancies
export const discrepancies = pgTable('discrepancies', {
  discrepancyId: varchar('discrepancy_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  analysisId: varchar('analysis_id', { length: 64 }).notNull().references(() => analyses.analysisId, { onDelete: 'cascade' }),
  type: varchar('type', { length: 64 }).notNull(),
  expectedSku: varchar('expected_sku', { length: 128 }),
  detectedSku: varchar('detected_sku', { length: 128 }),
  expectedQuantity: integer('expected_quantity'),
  detectedQuantity: integer('detected_quantity'),
  details: jsonb('details').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_discrepancies_analysis_id').on(table.analysisId),
]);

// 15. Decisions
export const decisions = pgTable('decisions', {
  decisionId: varchar('decision_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  analysisId: varchar('analysis_id', { length: 64 }).notNull().references(() => analyses.analysisId, { onDelete: 'cascade' }),
  operationalVerdict: varchar('operational_verdict', { length: 32 }).notNull(),
  summaryReason: text('summary_reason').notNull(),
  ruleEvaluations: jsonb('rule_evaluations').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 16. QC Operator Review Actions
export const reviewActions = pgTable('review_actions', {
  reviewId: varchar('review_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  packId: varchar('pack_id', { length: 64 }).notNull().references(() => packs.packId, { onDelete: 'cascade' }),
  analysisId: varchar('analysis_id', { length: 64 }).notNull().references(() => analyses.analysisId),
  operatorId: varchar('operator_id', { length: 64 }).notNull(),
  action: varchar('action', { length: 32 }).notNull(), // APPROVED_OVERRIDE, REJECTED_REPACK, RESCAN_REQUESTED
  operatorVerdict: varchar('operator_verdict', { length: 32 }).notNull(),
  reasonCode: varchar('reason_code', { length: 64 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 17. Processing Jobs
export const processingJobs = pgTable('processing_jobs', {
  jobId: varchar('job_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  packId: varchar('pack_id', { length: 64 }).notNull().references(() => packs.packId, { onDelete: 'cascade' }),
  idempotencyKey: varchar('idempotency_key', { length: 128 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('PENDING'),
  attempt: integer('attempt').notNull().default(1),
  maxAttempts: integer('max_attempts').notNull().default(3),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('uq_jobs_org_idempotency').on(table.orgId, table.idempotencyKey),
  index('idx_jobs_status').on(table.status, table.createdAt),
]);

// 18. Webhook Deliveries
export const webhookDeliveries = pgTable('webhook_deliveries', {
  deliveryId: varchar('delivery_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  packId: varchar('pack_id', { length: 64 }).notNull().references(() => packs.packId),
  eventType: varchar('event_type', { length: 64 }).notNull(),
  payload: jsonb('payload').notNull(),
  targetUrl: varchar('target_url', { length: 512 }).notNull(),
  httpStatus: integer('http_status'),
  status: varchar('status', { length: 32 }).notNull(),
  attempt: integer('attempt').notNull().default(1),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 19. Audit Events
export const auditEvents = pgTable('audit_events', {
  auditId: varchar('audit_id', { length: 64 }).primaryKey(),
  orgId: varchar('org_id', { length: 64 }).notNull().references(() => organizations.orgId),
  entityType: varchar('entity_type', { length: 64 }).notNull(),
  entityId: varchar('entity_id', { length: 64 }).notNull(),
  actorId: varchar('actor_id', { length: 64 }).notNull(),
  action: varchar('action', { length: 64 }).notNull(),
  previousState: jsonb('previous_state'),
  newState: jsonb('new_state'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_audit_org_entity').on(table.orgId, table.entityType, table.entityId),
]);
