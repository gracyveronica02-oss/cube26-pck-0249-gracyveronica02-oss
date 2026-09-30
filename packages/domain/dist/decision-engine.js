"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeterministicDecisionEngine = void 0;
const shared_1 = require("@pack-manager/shared");
/**
 * Pure Deterministic Decision Engine.
 * Zero external IO, zero AI invocation, zero probabilistic leakage.
 */
class DeterministicDecisionEngine {
    evaluate(input) {
        const { imageValidationPassed, imageValidationIssues, visionFailed, visionFailureReason, reconciliation, overallConfidence, configuration, } = input;
        const evaluations = [];
        // Rule 1: Image Quality Verification
        if (!imageValidationPassed) {
            evaluations.push({
                ruleName: 'IMAGE_QUALITY_CHECK',
                verdict: shared_1.CheckVerdict.FAIL,
                details: { issues: imageValidationIssues || ['Image quality below acceptable threshold'] },
            });
            return {
                decision: shared_1.OperationalDecision.UNCERTAIN,
                reasonSummary: `Image quality insufficient: ${(imageValidationIssues || []).join(', ')}`,
                ruleEvaluations: evaluations,
                overallConfidence: 0,
            };
        }
        evaluations.push({
            ruleName: 'IMAGE_QUALITY_CHECK',
            verdict: shared_1.CheckVerdict.PASS,
        });
        // Rule 2: Vision Model Execution Status
        if (visionFailed) {
            evaluations.push({
                ruleName: 'VISION_EXECUTION_CHECK',
                verdict: shared_1.CheckVerdict.FAIL,
                details: { error: visionFailureReason || 'Vision model execution failure' },
            });
            return {
                decision: shared_1.OperationalDecision.UNCERTAIN,
                reasonSummary: `Vision failure: ${visionFailureReason || 'Model call failed or timed out'}`,
                ruleEvaluations: evaluations,
                overallConfidence: 0,
            };
        }
        evaluations.push({
            ruleName: 'VISION_EXECUTION_CHECK',
            verdict: shared_1.CheckVerdict.PASS,
        });
        // Rule 3: Unresolved Ambiguity Check (Engineering Rule 4)
        const ambiguousDiscrepancies = reconciliation.discrepancies.filter(d => d.type === shared_1.DiscrepancyType.AMBIGUOUS_ITEM);
        if (ambiguousDiscrepancies.length > 0 ||
            reconciliation.unmatchedDetections.length > 0 ||
            (reconciliation.expectedItemsSummary.length > 0 && reconciliation.detectedItemsSummary.length === 0)) {
            evaluations.push({
                ruleName: 'AMBIGUITY_CHECK',
                verdict: shared_1.CheckVerdict.UNCERTAIN,
                details: {
                    count: ambiguousDiscrepancies.length,
                    noItemsDetected: reconciliation.detectedItemsSummary.length === 0,
                },
            });
            return {
                decision: shared_1.OperationalDecision.UNCERTAIN,
                reasonSummary: reconciliation.detectedItemsSummary.length === 0
                    ? 'No package items could be confidently identified from the photograph'
                    : `Unresolved ambiguity in observed package contents (${ambiguousDiscrepancies.length} ambiguous item(s))`,
                ruleEvaluations: evaluations,
                overallConfidence,
            };
        }
        evaluations.push({
            ruleName: 'AMBIGUITY_CHECK',
            verdict: shared_1.CheckVerdict.PASS,
        });
        // Rule 4: Missing Items Check
        const missingDiscrepancies = reconciliation.discrepancies.filter(d => d.type === shared_1.DiscrepancyType.MISSING_ITEM);
        if (missingDiscrepancies.length > 0) {
            evaluations.push({
                ruleName: 'MISSING_ITEMS_CHECK',
                verdict: shared_1.CheckVerdict.FAIL,
                details: { missing: missingDiscrepancies },
            });
            const skus = missingDiscrepancies.map(d => d.expectedSku).filter(Boolean).join(', ');
            return {
                decision: shared_1.OperationalDecision.STOP_AND_FIX,
                reasonSummary: `Missing expected item(s): ${skus}`,
                ruleEvaluations: evaluations,
                overallConfidence,
            };
        }
        evaluations.push({
            ruleName: 'MISSING_ITEMS_CHECK',
            verdict: shared_1.CheckVerdict.PASS,
        });
        // Rule 5: Wrong Items Check (Unexpected items in box)
        const wrongDiscrepancies = reconciliation.discrepancies.filter(d => d.type === shared_1.DiscrepancyType.WRONG_ITEM);
        if (wrongDiscrepancies.length > 0) {
            evaluations.push({
                ruleName: 'WRONG_ITEMS_CHECK',
                verdict: shared_1.CheckVerdict.FAIL,
                details: { wrong: wrongDiscrepancies },
            });
            const skus = wrongDiscrepancies.map(d => d.detectedSku).filter(Boolean).join(', ');
            return {
                decision: shared_1.OperationalDecision.STOP_AND_FIX,
                reasonSummary: `Wrong / unexpected item(s) found in package: ${skus}`,
                ruleEvaluations: evaluations,
                overallConfidence,
            };
        }
        evaluations.push({
            ruleName: 'WRONG_ITEMS_CHECK',
            verdict: shared_1.CheckVerdict.PASS,
        });
        // Rule 6: Quantity Mismatch Check
        const quantityDiscrepancies = reconciliation.discrepancies.filter(d => d.type === shared_1.DiscrepancyType.QUANTITY_MISMATCH);
        if (quantityDiscrepancies.length > 0) {
            evaluations.push({
                ruleName: 'QUANTITY_CHECK',
                verdict: shared_1.CheckVerdict.FAIL,
                details: { quantityDiscrepancies },
            });
            return {
                decision: shared_1.OperationalDecision.STOP_AND_FIX,
                reasonSummary: `Quantity mismatch detected on order lines`,
                ruleEvaluations: evaluations,
                overallConfidence,
            };
        }
        evaluations.push({
            ruleName: 'QUANTITY_CHECK',
            verdict: shared_1.CheckVerdict.PASS,
        });
        // Rule 7: Critical Variant Mismatch Check
        const variantDiscrepancies = reconciliation.discrepancies.filter(d => d.type === shared_1.DiscrepancyType.VARIANT_MISMATCH);
        if (variantDiscrepancies.length > 0) {
            evaluations.push({
                ruleName: 'CRITICAL_VARIANT_CHECK',
                verdict: shared_1.CheckVerdict.FAIL,
                details: { variantDiscrepancies },
            });
            return {
                decision: shared_1.OperationalDecision.STOP_AND_FIX,
                reasonSummary: `Critical product variant mismatch detected (e.g. size/color/model)`,
                ruleEvaluations: evaluations,
                overallConfidence,
            };
        }
        evaluations.push({
            ruleName: 'CRITICAL_VARIANT_CHECK',
            verdict: shared_1.CheckVerdict.PASS,
        });
        // Rule 8: Centralized Confidence Threshold Gating
        if (overallConfidence < configuration.minOverallConfidence) {
            evaluations.push({
                ruleName: 'CONFIDENCE_THRESHOLD_CHECK',
                verdict: shared_1.CheckVerdict.FAIL,
                details: {
                    confidence: overallConfidence,
                    required: configuration.minOverallConfidence,
                },
            });
            return {
                decision: shared_1.OperationalDecision.UNCERTAIN,
                reasonSummary: `Overall identification confidence (${(overallConfidence * 100).toFixed(1)}%) below required threshold (${(configuration.minOverallConfidence * 100).toFixed(1)}%)`,
                ruleEvaluations: evaluations,
                overallConfidence,
            };
        }
        evaluations.push({
            ruleName: 'CONFIDENCE_THRESHOLD_CHECK',
            verdict: shared_1.CheckVerdict.PASS,
            details: { confidence: overallConfidence },
        });
        // ALL GATES PASSED -> SEAL
        return {
            decision: shared_1.OperationalDecision.SEAL,
            reasonSummary: 'Order contents verified: all items, quantities, and variants match exactly',
            ruleEvaluations: evaluations,
            overallConfidence,
        };
    }
}
exports.DeterministicDecisionEngine = DeterministicDecisionEngine;
//# sourceMappingURL=decision-engine.js.map