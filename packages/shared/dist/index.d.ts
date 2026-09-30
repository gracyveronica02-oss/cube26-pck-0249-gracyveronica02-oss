import { z } from 'zod';
export declare enum PackStatus {
    RECEIVED = "RECEIVED",
    VALIDATING = "VALIDATING",
    ANALYZING = "ANALYZING",
    RECONCILING = "RECONCILING",
    SEAL = "SEAL",
    STOP_AND_FIX = "STOP_AND_FIX",
    MANUAL_REVIEW = "MANUAL_REVIEW",
    ANALYSIS_FAILED = "ANALYSIS_FAILED"
}
export declare enum OperationalDecision {
    SEAL = "SEAL",
    STOP_AND_FIX = "STOP_AND_FIX",
    UNCERTAIN = "UNCERTAIN",
    MANUAL_REVIEW = "MANUAL_REVIEW"
}
export declare enum CheckVerdict {
    PASS = "PASS",
    FAIL = "FAIL",
    UNCERTAIN = "UNCERTAIN"
}
export declare enum DiscrepancyType {
    MISSING_ITEM = "MISSING_ITEM",
    WRONG_ITEM = "WRONG_ITEM",
    EXTRA_ITEM = "EXTRA_ITEM",
    QUANTITY_MISMATCH = "QUANTITY_MISMATCH",
    VARIANT_MISMATCH = "VARIANT_MISMATCH",
    AMBIGUOUS_ITEM = "AMBIGUOUS_ITEM",
    POOR_IMAGE_QUALITY = "POOR_IMAGE_QUALITY",
    VISION_FAILURE = "VISION_FAILURE",
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
}
export declare enum DiscrepancySeverity {
    CRITICAL = "CRITICAL",
    HIGH = "HIGH",
    MEDIUM = "MEDIUM",
    LOW = "LOW"
}
export declare enum UserRole {
    ADMIN = "ADMIN",
    QC_OPERATOR = "QC_OPERATOR",
    SUPERVISOR = "SUPERVISOR",
    VIEWER = "VIEWER"
}
export declare enum ReviewActionType {
    APPROVED_OVERRIDE = "APPROVED_OVERRIDE",
    REJECTED_REPACK = "REJECTED_REPACK",
    RESCAN_REQUESTED = "RESCAN_REQUESTED"
}
export declare const BoundingBoxSchema: z.ZodObject<{
    x: z.ZodNumber;
    y: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    x: number;
    y: number;
    width: number;
    height: number;
}, {
    x: number;
    y: number;
    width: number;
    height: number;
}>;
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;
export declare const ImageQualityReportSchema: z.ZodObject<{
    isValid: z.ZodBoolean;
    resolution: z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>;
    blurScore: z.ZodNumber;
    exposureScore: z.ZodNumber;
    issues: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    issues: string[];
    isValid: boolean;
    resolution: {
        width: number;
        height: number;
    };
    blurScore: number;
    exposureScore: number;
}, {
    issues: string[];
    isValid: boolean;
    resolution: {
        width: number;
        height: number;
    };
    blurScore: number;
    exposureScore: number;
}>;
export type ImageQualityReport = z.infer<typeof ImageQualityReportSchema>;
export declare const DetectionDTOSchema: z.ZodObject<{
    detectionId: z.ZodString;
    imageIndex: z.ZodDefault<z.ZodNumber>;
    label: z.ZodString;
    confidence: z.ZodNumber;
    boundingBox: z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        width: number;
        height: number;
    }, {
        x: number;
        y: number;
        width: number;
        height: number;
    }>;
    attributes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    barcodeDetected: z.ZodOptional<z.ZodString>;
    physicalItemClusterId: z.ZodOptional<z.ZodString>;
    cropStoragePath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    detectionId: string;
    imageIndex: number;
    label: string;
    confidence: number;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    attributes: Record<string, string>;
    barcodeDetected?: string | undefined;
    physicalItemClusterId?: string | undefined;
    cropStoragePath?: string | undefined;
}, {
    detectionId: string;
    label: string;
    confidence: number;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    imageIndex?: number | undefined;
    attributes?: Record<string, string> | undefined;
    barcodeDetected?: string | undefined;
    physicalItemClusterId?: string | undefined;
    cropStoragePath?: string | undefined;
}>;
export type DetectionDTO = z.infer<typeof DetectionDTOSchema>;
export declare const SKUMatchCandidateSchema: z.ZodObject<{
    sku: z.ZodString;
    score: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    sku: string;
    score: number;
}, {
    sku: string;
    score: number;
}>;
export type SKUMatchCandidate = z.infer<typeof SKUMatchCandidateSchema>;
export declare const SKUMatchDTOSchema: z.ZodObject<{
    detectionId: z.ZodString;
    candidates: z.ZodArray<z.ZodObject<{
        sku: z.ZodString;
        score: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        sku: string;
        score: number;
    }, {
        sku: string;
        score: number;
    }>, "many">;
    selectedSku: z.ZodOptional<z.ZodString>;
    confidence: z.ZodNumber;
    matchSignals: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    detectionId: string;
    confidence: number;
    candidates: {
        sku: string;
        score: number;
    }[];
    matchSignals: Record<string, unknown>;
    selectedSku?: string | undefined;
}, {
    detectionId: string;
    confidence: number;
    candidates: {
        sku: string;
        score: number;
    }[];
    selectedSku?: string | undefined;
    matchSignals?: Record<string, unknown> | undefined;
}>;
export type SKUMatchDTO = z.infer<typeof SKUMatchDTOSchema>;
export declare const DiscrepancyDTOSchema: z.ZodObject<{
    type: z.ZodNativeEnum<typeof DiscrepancyType>;
    expectedSku: z.ZodOptional<z.ZodString>;
    detectedSku: z.ZodOptional<z.ZodString>;
    expectedQuantity: z.ZodOptional<z.ZodNumber>;
    detectedQuantity: z.ZodOptional<z.ZodNumber>;
    details: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type: DiscrepancyType;
    details: Record<string, unknown>;
    expectedSku?: string | undefined;
    detectedSku?: string | undefined;
    expectedQuantity?: number | undefined;
    detectedQuantity?: number | undefined;
}, {
    type: DiscrepancyType;
    expectedSku?: string | undefined;
    detectedSku?: string | undefined;
    expectedQuantity?: number | undefined;
    detectedQuantity?: number | undefined;
    details?: Record<string, unknown> | undefined;
}>;
export type DiscrepancyDTO = z.infer<typeof DiscrepancyDTOSchema>;
export declare const ExpectedItemDTOSchema: z.ZodObject<{
    sku: z.ZodString;
    quantity: z.ZodNumber;
    name: z.ZodOptional<z.ZodString>;
    criticalAttributes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    attributes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    attributes: Record<string, string>;
    sku: string;
    quantity: number;
    criticalAttributes: string[];
    name?: string | undefined;
}, {
    sku: string;
    quantity: number;
    attributes?: Record<string, string> | undefined;
    name?: string | undefined;
    criticalAttributes?: string[] | undefined;
}>;
export type ExpectedItemDTO = z.infer<typeof ExpectedItemDTOSchema>;
export declare const DetectedItemDTOSchema: z.ZodObject<{
    sku: z.ZodString;
    quantity: z.ZodNumber;
    confidence: z.ZodNumber;
    attributes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    attributes: Record<string, string>;
    sku: string;
    quantity: number;
}, {
    confidence: number;
    sku: string;
    quantity: number;
    attributes?: Record<string, string> | undefined;
}>;
export type DetectedItemDTO = z.infer<typeof DetectedItemDTOSchema>;
export declare const EvidenceDTOSchema: z.ZodObject<{
    analysisId: z.ZodString;
    originalImages: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    processedImages: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    detectionCrops: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    analysisId: string;
    originalImages: string[];
    processedImages: string[];
    detectionCrops: string[];
}, {
    analysisId: string;
    originalImages?: string[] | undefined;
    processedImages?: string[] | undefined;
    detectionCrops?: string[] | undefined;
}>;
export type EvidenceDTO = z.infer<typeof EvidenceDTOSchema>;
export declare const AnalysisResultDTOSchema: z.ZodObject<{
    packId: z.ZodString;
    analysisId: z.ZodString;
    decision: z.ZodNativeEnum<typeof OperationalDecision>;
    confidence: z.ZodNumber;
    reasonSummary: z.ZodString;
    expectedItems: z.ZodArray<z.ZodObject<{
        sku: z.ZodString;
        quantity: z.ZodNumber;
        name: z.ZodOptional<z.ZodString>;
        criticalAttributes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        attributes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        attributes: Record<string, string>;
        sku: string;
        quantity: number;
        criticalAttributes: string[];
        name?: string | undefined;
    }, {
        sku: string;
        quantity: number;
        attributes?: Record<string, string> | undefined;
        name?: string | undefined;
        criticalAttributes?: string[] | undefined;
    }>, "many">;
    detectedItems: z.ZodArray<z.ZodObject<{
        sku: z.ZodString;
        quantity: z.ZodNumber;
        confidence: z.ZodNumber;
        attributes: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        attributes: Record<string, string>;
        sku: string;
        quantity: number;
    }, {
        confidence: number;
        sku: string;
        quantity: number;
        attributes?: Record<string, string> | undefined;
    }>, "many">;
    discrepancies: z.ZodArray<z.ZodObject<{
        type: z.ZodNativeEnum<typeof DiscrepancyType>;
        expectedSku: z.ZodOptional<z.ZodString>;
        detectedSku: z.ZodOptional<z.ZodString>;
        expectedQuantity: z.ZodOptional<z.ZodNumber>;
        detectedQuantity: z.ZodOptional<z.ZodNumber>;
        details: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        type: DiscrepancyType;
        details: Record<string, unknown>;
        expectedSku?: string | undefined;
        detectedSku?: string | undefined;
        expectedQuantity?: number | undefined;
        detectedQuantity?: number | undefined;
    }, {
        type: DiscrepancyType;
        expectedSku?: string | undefined;
        detectedSku?: string | undefined;
        expectedQuantity?: number | undefined;
        detectedQuantity?: number | undefined;
        details?: Record<string, unknown> | undefined;
    }>, "many">;
    evidence: z.ZodObject<{
        analysisId: z.ZodString;
        originalImages: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        processedImages: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        detectionCrops: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        analysisId: string;
        originalImages: string[];
        processedImages: string[];
        detectionCrops: string[];
    }, {
        analysisId: string;
        originalImages?: string[] | undefined;
        processedImages?: string[] | undefined;
        detectionCrops?: string[] | undefined;
    }>;
    modelInfo: z.ZodObject<{
        provider: z.ZodString;
        model: z.ZodString;
        modelVersion: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        provider: string;
        model: string;
        modelVersion: string;
    }, {
        provider: string;
        model: string;
        modelVersion: string;
    }>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    analysisId: string;
    packId: string;
    decision: OperationalDecision;
    reasonSummary: string;
    expectedItems: {
        attributes: Record<string, string>;
        sku: string;
        quantity: number;
        criticalAttributes: string[];
        name?: string | undefined;
    }[];
    detectedItems: {
        confidence: number;
        attributes: Record<string, string>;
        sku: string;
        quantity: number;
    }[];
    discrepancies: {
        type: DiscrepancyType;
        details: Record<string, unknown>;
        expectedSku?: string | undefined;
        detectedSku?: string | undefined;
        expectedQuantity?: number | undefined;
        detectedQuantity?: number | undefined;
    }[];
    evidence: {
        analysisId: string;
        originalImages: string[];
        processedImages: string[];
        detectionCrops: string[];
    };
    modelInfo: {
        provider: string;
        model: string;
        modelVersion: string;
    };
    timestamp: string;
}, {
    confidence: number;
    analysisId: string;
    packId: string;
    decision: OperationalDecision;
    reasonSummary: string;
    expectedItems: {
        sku: string;
        quantity: number;
        attributes?: Record<string, string> | undefined;
        name?: string | undefined;
        criticalAttributes?: string[] | undefined;
    }[];
    detectedItems: {
        confidence: number;
        sku: string;
        quantity: number;
        attributes?: Record<string, string> | undefined;
    }[];
    discrepancies: {
        type: DiscrepancyType;
        expectedSku?: string | undefined;
        detectedSku?: string | undefined;
        expectedQuantity?: number | undefined;
        detectedQuantity?: number | undefined;
        details?: Record<string, unknown> | undefined;
    }[];
    evidence: {
        analysisId: string;
        originalImages?: string[] | undefined;
        processedImages?: string[] | undefined;
        detectionCrops?: string[] | undefined;
    };
    modelInfo: {
        provider: string;
        model: string;
        modelVersion: string;
    };
    timestamp: string;
}>;
export type AnalysisResultDTO = z.infer<typeof AnalysisResultDTOSchema>;
export declare const WebhookPayloadSchema: z.ZodObject<{
    eventId: z.ZodString;
    eventType: z.ZodLiteral<"pack.verification.completed">;
    orgId: z.ZodString;
    unitId: z.ZodString;
    packId: z.ZodString;
    orderId: z.ZodString;
    decision: z.ZodNativeEnum<typeof OperationalDecision>;
    reasonSummary: z.ZodString;
    discrepancies: z.ZodArray<z.ZodObject<{
        type: z.ZodNativeEnum<typeof DiscrepancyType>;
        expectedSku: z.ZodOptional<z.ZodString>;
        detectedSku: z.ZodOptional<z.ZodString>;
        expectedQuantity: z.ZodOptional<z.ZodNumber>;
        detectedQuantity: z.ZodOptional<z.ZodNumber>;
        details: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        type: DiscrepancyType;
        details: Record<string, unknown>;
        expectedSku?: string | undefined;
        detectedSku?: string | undefined;
        expectedQuantity?: number | undefined;
        detectedQuantity?: number | undefined;
    }, {
        type: DiscrepancyType;
        expectedSku?: string | undefined;
        detectedSku?: string | undefined;
        expectedQuantity?: number | undefined;
        detectedQuantity?: number | undefined;
        details?: Record<string, unknown> | undefined;
    }>, "many">;
    expectedItems: z.ZodArray<z.ZodObject<{
        sku: z.ZodString;
        quantity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        sku: string;
        quantity: number;
    }, {
        sku: string;
        quantity: number;
    }>, "many">;
    detectedItems: z.ZodArray<z.ZodObject<{
        sku: z.ZodString;
        quantity: z.ZodNumber;
        confidence: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        confidence: number;
        sku: string;
        quantity: number;
    }, {
        confidence: number;
        sku: string;
        quantity: number;
    }>, "many">;
    evidence: z.ZodObject<{
        analysisId: z.ZodString;
        photoCount: z.ZodNumber;
        annotatedImageUrls: z.ZodArray<z.ZodString, "many">;
        cropUrls: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        analysisId: string;
        photoCount: number;
        annotatedImageUrls: string[];
        cropUrls: string[];
    }, {
        analysisId: string;
        photoCount: number;
        annotatedImageUrls: string[];
        cropUrls: string[];
    }>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    packId: string;
    decision: OperationalDecision;
    reasonSummary: string;
    expectedItems: {
        sku: string;
        quantity: number;
    }[];
    detectedItems: {
        confidence: number;
        sku: string;
        quantity: number;
    }[];
    discrepancies: {
        type: DiscrepancyType;
        details: Record<string, unknown>;
        expectedSku?: string | undefined;
        detectedSku?: string | undefined;
        expectedQuantity?: number | undefined;
        detectedQuantity?: number | undefined;
    }[];
    evidence: {
        analysisId: string;
        photoCount: number;
        annotatedImageUrls: string[];
        cropUrls: string[];
    };
    timestamp: string;
    eventId: string;
    eventType: "pack.verification.completed";
    orgId: string;
    unitId: string;
    orderId: string;
}, {
    packId: string;
    decision: OperationalDecision;
    reasonSummary: string;
    expectedItems: {
        sku: string;
        quantity: number;
    }[];
    detectedItems: {
        confidence: number;
        sku: string;
        quantity: number;
    }[];
    discrepancies: {
        type: DiscrepancyType;
        expectedSku?: string | undefined;
        detectedSku?: string | undefined;
        expectedQuantity?: number | undefined;
        detectedQuantity?: number | undefined;
        details?: Record<string, unknown> | undefined;
    }[];
    evidence: {
        analysisId: string;
        photoCount: number;
        annotatedImageUrls: string[];
        cropUrls: string[];
    };
    timestamp: string;
    eventId: string;
    eventType: "pack.verification.completed";
    orgId: string;
    unitId: string;
    orderId: string;
}>;
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
//# sourceMappingURL=index.d.ts.map