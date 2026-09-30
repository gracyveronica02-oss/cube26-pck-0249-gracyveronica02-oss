"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderReconciler = void 0;
const shared_1 = require("@pack-manager/shared");
/**
 * Deterministic Order Reconciliation Engine.
 * Pure mathematical and attribute comparison. ZERO LLM involvement.
 */
class OrderReconciler {
    minConfidence;
    constructor(options) {
        this.minConfidence = options?.minConfidenceThreshold ?? 0.85;
    }
    reconcile(expectedItems, identifiedClusters) {
        const discrepancies = [];
        const expectedMap = new Map();
        for (const item of expectedItems) {
            const existing = expectedMap.get(item.sku);
            expectedMap.set(item.sku, existing
                ? { ...existing, expectedQuantity: existing.expectedQuantity + item.expectedQuantity }
                : item);
        }
        // Group identified items by selected SKU
        const detectedBySku = new Map();
        const ambiguousClusters = [];
        for (const item of identifiedClusters) {
            const visibility = item.cluster.representativeDetection.attributes.visibility?.toLowerCase();
            const occluded = visibility === 'partially_occluded' || visibility === 'occluded';
            if (occluded || !item.match.selectedSku || item.match.confidence < this.minConfidence) {
                ambiguousClusters.push(item.cluster);
                discrepancies.push({
                    type: shared_1.DiscrepancyType.AMBIGUOUS_ITEM,
                    details: {
                        clusterId: item.cluster.clusterId,
                        label: item.cluster.representativeDetection.label,
                        confidence: item.match.confidence,
                        candidates: item.match.candidates,
                        cause: occluded ? 'OCCLUSION' : 'RECOGNITION',
                        visibility,
                    },
                });
            }
            else {
                const sku = item.match.selectedSku;
                const list = detectedBySku.get(sku) || [];
                list.push(item);
                detectedBySku.set(sku, list);
            }
        }
        const matchedItems = [];
        // Step 1: Iterate over Expected Order Lines
        for (const [sku, orderItem] of expectedMap.entries()) {
            const detectedList = detectedBySku.get(sku) || [];
            const detectedCount = detectedList.length;
            // Condition 1: Missing Item entirely
            if (detectedCount === 0) {
                if (identifiedClusters.length > 0 && ambiguousClusters.length === 0) {
                    discrepancies.push({
                        type: shared_1.DiscrepancyType.MISSING_ITEM,
                        expectedSku: sku,
                        expectedQuantity: orderItem.expectedQuantity,
                        detectedQuantity: 0,
                        details: { productName: orderItem.productName },
                    });
                }
                matchedItems.push({
                    sku,
                    expectedQuantity: orderItem.expectedQuantity,
                    detectedQuantity: 0,
                    confidence: 0,
                    status: 'SHORT',
                });
                continue;
            }
            // Condition 2: Quantity Mismatch (Short)
            if (detectedCount < orderItem.expectedQuantity) {
                discrepancies.push({
                    type: shared_1.DiscrepancyType.QUANTITY_MISMATCH,
                    expectedSku: sku,
                    expectedQuantity: orderItem.expectedQuantity,
                    detectedQuantity: detectedCount,
                    details: { shortfall: orderItem.expectedQuantity - detectedCount },
                });
            }
            // Condition 3: Quantity Mismatch (Extra of expected item)
            if (detectedCount > orderItem.expectedQuantity) {
                discrepancies.push({
                    type: shared_1.DiscrepancyType.EXTRA_ITEM,
                    expectedSku: sku,
                    expectedQuantity: orderItem.expectedQuantity,
                    detectedQuantity: detectedCount,
                    details: { excess: detectedCount - orderItem.expectedQuantity },
                });
                discrepancies.push({
                    type: shared_1.DiscrepancyType.QUANTITY_MISMATCH,
                    expectedSku: sku,
                    expectedQuantity: orderItem.expectedQuantity,
                    detectedQuantity: detectedCount,
                    details: { excess: detectedCount - orderItem.expectedQuantity },
                });
            }
            // Condition 4: Critical Variant Verification
            let variantMismatchFound = false;
            const criticalAttributes = orderItem.criticalAttributes || ['color', 'size'];
            for (const det of detectedList) {
                for (const attr of criticalAttributes) {
                    const expectedAttrVal = orderItem.attributes?.[attr];
                    const detectedAttrVal = det.cluster.attributes?.[attr];
                    if (expectedAttrVal &&
                        detectedAttrVal &&
                        expectedAttrVal.toLowerCase() !== detectedAttrVal.toLowerCase()) {
                        variantMismatchFound = true;
                        discrepancies.push({
                            type: shared_1.DiscrepancyType.VARIANT_MISMATCH,
                            expectedSku: sku,
                            details: {
                                attribute: attr,
                                expectedValue: expectedAttrVal,
                                detectedValue: detectedAttrVal,
                                clusterId: det.cluster.clusterId,
                            },
                        });
                    }
                }
            }
            const minDetConfidence = Math.min(...detectedList.map(d => d.match.confidence));
            let status = 'MATCH';
            if (variantMismatchFound)
                status = 'VARIANT_MISMATCH';
            else if (detectedCount < orderItem.expectedQuantity)
                status = 'SHORT';
            else if (detectedCount > orderItem.expectedQuantity)
                status = 'EXTRA';
            matchedItems.push({
                sku,
                expectedQuantity: orderItem.expectedQuantity,
                detectedQuantity: detectedCount,
                confidence: minDetConfidence,
                status,
            });
        }
        // Step 2: Detect Unexpected / Wrong Items (present in box, but NOT in order)
        for (const [detectedSku, detectedList] of detectedBySku.entries()) {
            if (!expectedMap.has(detectedSku)) {
                // If there's an expected item that was completely missing, we also classify this as WRONG_ITEM
                const missingExpected = Array.from(expectedMap.keys()).filter(k => (detectedBySku.get(k)?.length || 0) === 0);
                discrepancies.push({
                    type: shared_1.DiscrepancyType.WRONG_ITEM,
                    detectedSku,
                    detectedQuantity: detectedList.length,
                    expectedSku: missingExpected.length === 1 ? missingExpected[0] : undefined,
                    details: {
                        reason: 'Observed item is not part of customer order',
                        candidateLabels: detectedList.map(d => d.cluster.representativeDetection.label),
                    },
                });
            }
        }
        const expectedItemsSummary = Array.from(expectedMap.values()).map(i => ({
            sku: i.sku,
            quantity: i.expectedQuantity,
            name: i.productName,
            criticalAttributes: i.criticalAttributes,
            attributes: i.attributes,
        }));
        const detectedItemsSummary = Array.from(detectedBySku.entries()).map(([sku, list]) => ({
            sku,
            quantity: list.length,
            confidence: Math.min(...list.map(l => l.match.confidence)),
            attributes: list[0]?.cluster.attributes || {},
        }));
        const isExactMatch = discrepancies.length === 0;
        return {
            isExactMatch,
            matchedItems,
            detectedItemsSummary,
            expectedItemsSummary,
            discrepancies,
            unmatchedDetections: ambiguousClusters,
        };
    }
}
exports.OrderReconciler = OrderReconciler;
//# sourceMappingURL=reconciliation.js.map