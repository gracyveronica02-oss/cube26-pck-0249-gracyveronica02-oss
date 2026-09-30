import { DiscrepancyDTO, DetectedItemDTO, ExpectedItemDTO } from '@pack-manager/shared';
import { OrderItem } from './entities.js';
import { PhysicalItemCluster } from './deduplicator.js';
import { SKUMatchDTO } from '@pack-manager/shared';
export interface MatchedItemSummary {
    sku: string;
    expectedQuantity: number;
    detectedQuantity: number;
    confidence: number;
    status: 'MATCH' | 'SHORT' | 'EXTRA' | 'VARIANT_MISMATCH';
}
export interface ReconciliationResult {
    isExactMatch: boolean;
    matchedItems: MatchedItemSummary[];
    detectedItemsSummary: DetectedItemDTO[];
    expectedItemsSummary: ExpectedItemDTO[];
    discrepancies: DiscrepancyDTO[];
    unmatchedDetections: PhysicalItemCluster[];
}
export interface ReconcilerOptions {
    minConfidenceThreshold?: number;
}
/**
 * Deterministic Order Reconciliation Engine.
 * Pure mathematical and attribute comparison. ZERO LLM involvement.
 */
export declare class OrderReconciler {
    private minConfidence;
    constructor(options?: ReconcilerOptions);
    reconcile(expectedItems: OrderItem[], identifiedClusters: Array<{
        cluster: PhysicalItemCluster;
        match: SKUMatchDTO;
    }>): ReconciliationResult;
}
//# sourceMappingURL=reconciliation.d.ts.map