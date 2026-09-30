import { z } from 'zod';

export enum PackStatus {
  RECEIVED = 'RECEIVED',
  VALIDATING = 'VALIDATING',
  ANALYZING = 'ANALYZING',
  RECONCILING = 'RECONCILING',
  SEAL = 'SEAL',
  STOP_AND_FIX = 'STOP_AND_FIX',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
}

export enum OperationalDecision {
  SEAL = 'SEAL',
  STOP_AND_FIX = 'STOP_AND_FIX',
  UNCERTAIN = 'UNCERTAIN',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

export enum CheckVerdict {
  PASS = 'PASS',
  FAIL = 'FAIL',
  UNCERTAIN = 'UNCERTAIN',
}

export enum DiscrepancyType {
  MISSING_ITEM = 'MISSING_ITEM',
  WRONG_ITEM = 'WRONG_ITEM',
  EXTRA_ITEM = 'EXTRA_ITEM',
  QUANTITY_MISMATCH = 'QUANTITY_MISMATCH',
  VARIANT_MISMATCH = 'VARIANT_MISMATCH',
  AMBIGUOUS_ITEM = 'AMBIGUOUS_ITEM',
  POOR_IMAGE_QUALITY = 'POOR_IMAGE_QUALITY',
  VISION_FAILURE = 'VISION_FAILURE',
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',
}

export enum DiscrepancySeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  QC_OPERATOR = 'QC_OPERATOR',
  SUPERVISOR = 'SUPERVISOR',
  VIEWER = 'VIEWER',
}

export enum ReviewActionType {
  APPROVED_OVERRIDE = 'APPROVED_OVERRIDE',
  REJECTED_REPACK = 'REJECTED_REPACK',
  RESCAN_REQUESTED = 'RESCAN_REQUESTED',
}

// Bounding box in normalized coordinates [0, 1]
export const BoundingBoxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

// Image Quality Assessment
export const ImageQualityReportSchema = z.object({
  isValid: z.boolean(),
  resolution: z.object({
    width: z.number(),
    height: z.number(),
  }),
  blurScore: z.number(),
  exposureScore: z.number(),
  issues: z.array(z.string()),
});
export type ImageQualityReport = z.infer<typeof ImageQualityReportSchema>;

// Object Detection
export const DetectionDTOSchema = z.object({
  detectionId: z.string(),
  imageIndex: z.number().int().nonnegative().default(0),
  label: z.string(),
  confidence: z.number().min(0).max(1),
  boundingBox: BoundingBoxSchema,
  attributes: z.record(z.string(), z.string()).default({}),
  barcodeDetected: z.string().optional(),
  physicalItemClusterId: z.string().optional(),
  cropStoragePath: z.string().optional(),
});
export type DetectionDTO = z.infer<typeof DetectionDTOSchema>;

// Candidate SKU match
export const SKUMatchCandidateSchema = z.object({
  sku: z.string(),
  score: z.number().min(0).max(1),
});
export type SKUMatchCandidate = z.infer<typeof SKUMatchCandidateSchema>;

// SKU Match result
export const SKUMatchDTOSchema = z.object({
  detectionId: z.string(),
  candidates: z.array(SKUMatchCandidateSchema),
  selectedSku: z.string().optional(),
  confidence: z.number().min(0).max(1),
  matchSignals: z.record(z.string(), z.unknown()).default({}),
});
export type SKUMatchDTO = z.infer<typeof SKUMatchDTOSchema>;

// Discrepancy definition
export const DiscrepancyDTOSchema = z.object({
  type: z.nativeEnum(DiscrepancyType),
  expectedSku: z.string().optional(),
  detectedSku: z.string().optional(),
  expectedQuantity: z.number().int().nonnegative().optional(),
  detectedQuantity: z.number().int().nonnegative().optional(),
  details: z.record(z.string(), z.unknown()).default({}),
});
export type DiscrepancyDTO = z.infer<typeof DiscrepancyDTOSchema>;

// Expected item summary
export const ExpectedItemDTOSchema = z.object({
  sku: z.string(),
  quantity: z.number().int().positive(),
  name: z.string().optional(),
  criticalAttributes: z.array(z.string()).default(['color', 'size']),
  attributes: z.record(z.string(), z.string()).default({}),
});
export type ExpectedItemDTO = z.infer<typeof ExpectedItemDTOSchema>;

// Detected item summary
export const DetectedItemDTOSchema = z.object({
  sku: z.string(),
  quantity: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1),
  attributes: z.record(z.string(), z.string()).default({}),
});
export type DetectedItemDTO = z.infer<typeof DetectedItemDTOSchema>;

// Evidence container
export const EvidenceDTOSchema = z.object({
  analysisId: z.string(),
  originalImages: z.array(z.string()).default([]),
  processedImages: z.array(z.string()).default([]),
  detectionCrops: z.array(z.string()).default([]),
});
export type EvidenceDTO = z.infer<typeof EvidenceDTOSchema>;

// Full Analysis Result (matching Section 37)
export const AnalysisResultDTOSchema = z.object({
  packId: z.string(),
  analysisId: z.string(),
  decision: z.nativeEnum(OperationalDecision),
  confidence: z.number().min(0).max(1),
  reasonSummary: z.string(),
  expectedItems: z.array(ExpectedItemDTOSchema),
  detectedItems: z.array(DetectedItemDTOSchema),
  discrepancies: z.array(DiscrepancyDTOSchema),
  evidence: EvidenceDTOSchema,
  modelInfo: z.object({
    provider: z.string(),
    model: z.string(),
    modelVersion: z.string(),
  }),
  timestamp: z.string(),
});
export type AnalysisResultDTO = z.infer<typeof AnalysisResultDTOSchema>;

// Webhook delivery payload (Section 26 & Cross-Pod Contract)
export const WebhookPayloadSchema = z.object({
  eventId: z.string(),
  eventType: z.literal('pack.verification.completed'),
  orgId: z.string(),
  unitId: z.string(),
  packId: z.string(),
  orderId: z.string(),
  decision: z.nativeEnum(OperationalDecision),
  reasonSummary: z.string(),
  discrepancies: z.array(DiscrepancyDTOSchema),
  expectedItems: z.array(z.object({
    sku: z.string(),
    quantity: z.number().int(),
  })),
  detectedItems: z.array(z.object({
    sku: z.string(),
    quantity: z.number().int(),
    confidence: z.number(),
  })),
  evidence: z.object({
    analysisId: z.string(),
    photoCount: z.number().int(),
    annotatedImageUrls: z.array(z.string()),
    cropUrls: z.array(z.string()),
  }),
  timestamp: z.string(),
});
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
