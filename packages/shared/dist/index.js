"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookPayloadSchema = exports.AnalysisResultDTOSchema = exports.EvidenceDTOSchema = exports.DetectedItemDTOSchema = exports.ExpectedItemDTOSchema = exports.DiscrepancyDTOSchema = exports.SKUMatchDTOSchema = exports.SKUMatchCandidateSchema = exports.DetectionDTOSchema = exports.ImageQualityReportSchema = exports.BoundingBoxSchema = exports.ReviewActionType = exports.UserRole = exports.DiscrepancySeverity = exports.DiscrepancyType = exports.CheckVerdict = exports.OperationalDecision = exports.PackStatus = void 0;
const zod_1 = require("zod");
var PackStatus;
(function (PackStatus) {
    PackStatus["RECEIVED"] = "RECEIVED";
    PackStatus["VALIDATING"] = "VALIDATING";
    PackStatus["ANALYZING"] = "ANALYZING";
    PackStatus["RECONCILING"] = "RECONCILING";
    PackStatus["SEAL"] = "SEAL";
    PackStatus["STOP_AND_FIX"] = "STOP_AND_FIX";
    PackStatus["MANUAL_REVIEW"] = "MANUAL_REVIEW";
    PackStatus["ANALYSIS_FAILED"] = "ANALYSIS_FAILED";
})(PackStatus || (exports.PackStatus = PackStatus = {}));
var OperationalDecision;
(function (OperationalDecision) {
    OperationalDecision["SEAL"] = "SEAL";
    OperationalDecision["STOP_AND_FIX"] = "STOP_AND_FIX";
    OperationalDecision["UNCERTAIN"] = "UNCERTAIN";
    OperationalDecision["MANUAL_REVIEW"] = "MANUAL_REVIEW";
})(OperationalDecision || (exports.OperationalDecision = OperationalDecision = {}));
var CheckVerdict;
(function (CheckVerdict) {
    CheckVerdict["PASS"] = "PASS";
    CheckVerdict["FAIL"] = "FAIL";
    CheckVerdict["UNCERTAIN"] = "UNCERTAIN";
})(CheckVerdict || (exports.CheckVerdict = CheckVerdict = {}));
var DiscrepancyType;
(function (DiscrepancyType) {
    DiscrepancyType["MISSING_ITEM"] = "MISSING_ITEM";
    DiscrepancyType["WRONG_ITEM"] = "WRONG_ITEM";
    DiscrepancyType["EXTRA_ITEM"] = "EXTRA_ITEM";
    DiscrepancyType["QUANTITY_MISMATCH"] = "QUANTITY_MISMATCH";
    DiscrepancyType["VARIANT_MISMATCH"] = "VARIANT_MISMATCH";
    DiscrepancyType["AMBIGUOUS_ITEM"] = "AMBIGUOUS_ITEM";
    DiscrepancyType["POOR_IMAGE_QUALITY"] = "POOR_IMAGE_QUALITY";
    DiscrepancyType["VISION_FAILURE"] = "VISION_FAILURE";
    DiscrepancyType["LOW_CONFIDENCE"] = "LOW_CONFIDENCE";
})(DiscrepancyType || (exports.DiscrepancyType = DiscrepancyType = {}));
var DiscrepancySeverity;
(function (DiscrepancySeverity) {
    DiscrepancySeverity["CRITICAL"] = "CRITICAL";
    DiscrepancySeverity["HIGH"] = "HIGH";
    DiscrepancySeverity["MEDIUM"] = "MEDIUM";
    DiscrepancySeverity["LOW"] = "LOW";
})(DiscrepancySeverity || (exports.DiscrepancySeverity = DiscrepancySeverity = {}));
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["QC_OPERATOR"] = "QC_OPERATOR";
    UserRole["SUPERVISOR"] = "SUPERVISOR";
    UserRole["VIEWER"] = "VIEWER";
})(UserRole || (exports.UserRole = UserRole = {}));
var ReviewActionType;
(function (ReviewActionType) {
    ReviewActionType["APPROVED_OVERRIDE"] = "APPROVED_OVERRIDE";
    ReviewActionType["REJECTED_REPACK"] = "REJECTED_REPACK";
    ReviewActionType["RESCAN_REQUESTED"] = "RESCAN_REQUESTED";
})(ReviewActionType || (exports.ReviewActionType = ReviewActionType = {}));
// Bounding box in normalized coordinates [0, 1]
exports.BoundingBoxSchema = zod_1.z.object({
    x: zod_1.z.number().min(0).max(1),
    y: zod_1.z.number().min(0).max(1),
    width: zod_1.z.number().min(0).max(1),
    height: zod_1.z.number().min(0).max(1),
});
// Image Quality Assessment
exports.ImageQualityReportSchema = zod_1.z.object({
    isValid: zod_1.z.boolean(),
    resolution: zod_1.z.object({
        width: zod_1.z.number(),
        height: zod_1.z.number(),
    }),
    blurScore: zod_1.z.number(),
    exposureScore: zod_1.z.number(),
    issues: zod_1.z.array(zod_1.z.string()),
});
// Object Detection
exports.DetectionDTOSchema = zod_1.z.object({
    detectionId: zod_1.z.string(),
    imageIndex: zod_1.z.number().int().nonnegative().default(0),
    label: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    boundingBox: exports.BoundingBoxSchema,
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).default({}),
    barcodeDetected: zod_1.z.string().optional(),
    physicalItemClusterId: zod_1.z.string().optional(),
    cropStoragePath: zod_1.z.string().optional(),
});
// Candidate SKU match
exports.SKUMatchCandidateSchema = zod_1.z.object({
    sku: zod_1.z.string(),
    score: zod_1.z.number().min(0).max(1),
});
// SKU Match result
exports.SKUMatchDTOSchema = zod_1.z.object({
    detectionId: zod_1.z.string(),
    candidates: zod_1.z.array(exports.SKUMatchCandidateSchema),
    selectedSku: zod_1.z.string().optional(),
    confidence: zod_1.z.number().min(0).max(1),
    matchSignals: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
});
// Discrepancy definition
exports.DiscrepancyDTOSchema = zod_1.z.object({
    type: zod_1.z.nativeEnum(DiscrepancyType),
    expectedSku: zod_1.z.string().optional(),
    detectedSku: zod_1.z.string().optional(),
    expectedQuantity: zod_1.z.number().int().nonnegative().optional(),
    detectedQuantity: zod_1.z.number().int().nonnegative().optional(),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
});
// Expected item summary
exports.ExpectedItemDTOSchema = zod_1.z.object({
    sku: zod_1.z.string(),
    quantity: zod_1.z.number().int().positive(),
    name: zod_1.z.string().optional(),
    criticalAttributes: zod_1.z.array(zod_1.z.string()).default(['color', 'size']),
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).default({}),
});
// Detected item summary
exports.DetectedItemDTOSchema = zod_1.z.object({
    sku: zod_1.z.string(),
    quantity: zod_1.z.number().int().nonnegative(),
    confidence: zod_1.z.number().min(0).max(1),
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).default({}),
});
// Evidence container
exports.EvidenceDTOSchema = zod_1.z.object({
    analysisId: zod_1.z.string(),
    originalImages: zod_1.z.array(zod_1.z.string()).default([]),
    processedImages: zod_1.z.array(zod_1.z.string()).default([]),
    detectionCrops: zod_1.z.array(zod_1.z.string()).default([]),
});
// Full Analysis Result (matching Section 37)
exports.AnalysisResultDTOSchema = zod_1.z.object({
    packId: zod_1.z.string(),
    analysisId: zod_1.z.string(),
    decision: zod_1.z.nativeEnum(OperationalDecision),
    confidence: zod_1.z.number().min(0).max(1),
    reasonSummary: zod_1.z.string(),
    expectedItems: zod_1.z.array(exports.ExpectedItemDTOSchema),
    detectedItems: zod_1.z.array(exports.DetectedItemDTOSchema),
    discrepancies: zod_1.z.array(exports.DiscrepancyDTOSchema),
    evidence: exports.EvidenceDTOSchema,
    modelInfo: zod_1.z.object({
        provider: zod_1.z.string(),
        model: zod_1.z.string(),
        modelVersion: zod_1.z.string(),
    }),
    timestamp: zod_1.z.string(),
});
// Webhook delivery payload (Section 26 & Cross-Pod Contract)
exports.WebhookPayloadSchema = zod_1.z.object({
    eventId: zod_1.z.string(),
    eventType: zod_1.z.literal('pack.verification.completed'),
    orgId: zod_1.z.string(),
    unitId: zod_1.z.string(),
    packId: zod_1.z.string(),
    orderId: zod_1.z.string(),
    decision: zod_1.z.nativeEnum(OperationalDecision),
    reasonSummary: zod_1.z.string(),
    discrepancies: zod_1.z.array(exports.DiscrepancyDTOSchema),
    expectedItems: zod_1.z.array(zod_1.z.object({
        sku: zod_1.z.string(),
        quantity: zod_1.z.number().int(),
    })),
    detectedItems: zod_1.z.array(zod_1.z.object({
        sku: zod_1.z.string(),
        quantity: zod_1.z.number().int(),
        confidence: zod_1.z.number(),
    })),
    evidence: zod_1.z.object({
        analysisId: zod_1.z.string(),
        photoCount: zod_1.z.number().int(),
        annotatedImageUrls: zod_1.z.array(zod_1.z.string()),
        cropUrls: zod_1.z.array(zod_1.z.string()),
    }),
    timestamp: zod_1.z.string(),
});
//# sourceMappingURL=index.js.map