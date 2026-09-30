import {
  DiscrepancyType,
  OperationalDecision,
  CheckVerdict,
} from '@pack-manager/shared';
import { ThresholdsConfig } from '@pack-manager/config';
import { ReconciliationResult } from './reconciliation.js';

export interface DecisionEngineInput {
  imageValidationPassed: boolean;
  imageValidationIssues?: string[];
  visionFailed?: boolean;
  visionFailureReason?: string;
  reconciliation: ReconciliationResult;
  overallConfidence: number;
  configuration: ThresholdsConfig;
}

export interface RuleEvaluationSummary {
  ruleName: string;
  verdict: CheckVerdict;
  details?: Record<string, unknown>;
}

export interface DecisionEvaluationResult {
  decision: OperationalDecision;
  reasonSummary: string;
  ruleEvaluations: RuleEvaluationSummary[];
  overallConfidence: number;
}

/**
 * Pure Deterministic Decision Engine.
 * Zero external IO, zero AI invocation, zero probabilistic leakage.
 */
export class DeterministicDecisionEngine {
  public evaluate(input: DecisionEngineInput): DecisionEvaluationResult {
    const {
      imageValidationPassed,
      imageValidationIssues,
      visionFailed,
      visionFailureReason,
      reconciliation,
      overallConfidence,
      configuration,
    } = input;

    const evaluations: RuleEvaluationSummary[] = [];

    // Rule 1: Image Quality Verification
    if (!imageValidationPassed) {
      evaluations.push({
        ruleName: 'IMAGE_QUALITY_CHECK',
        verdict: CheckVerdict.FAIL,
        details: { issues: imageValidationIssues || ['Image quality below acceptable threshold'] },
      });
      return {
        decision: OperationalDecision.UNCERTAIN,
        reasonSummary: `Image quality insufficient: ${(imageValidationIssues || []).join(', ')}`,
        ruleEvaluations: evaluations,
        overallConfidence: 0,
      };
    }
    evaluations.push({
      ruleName: 'IMAGE_QUALITY_CHECK',
      verdict: CheckVerdict.PASS,
    });

    // Rule 2: Vision Model Execution Status
    if (visionFailed) {
      evaluations.push({
        ruleName: 'VISION_EXECUTION_CHECK',
        verdict: CheckVerdict.FAIL,
        details: { error: visionFailureReason || 'Vision model execution failure' },
      });
      return {
        decision: OperationalDecision.UNCERTAIN,
        reasonSummary: `Vision failure: ${visionFailureReason || 'Model call failed or timed out'}`,
        ruleEvaluations: evaluations,
        overallConfidence: 0,
      };
    }
    evaluations.push({
      ruleName: 'VISION_EXECUTION_CHECK',
      verdict: CheckVerdict.PASS,
    });

    // Rule 3: Unresolved Ambiguity Check (Engineering Rule 4)
    const ambiguousDiscrepancies = reconciliation.discrepancies.filter(
      d => d.type === DiscrepancyType.AMBIGUOUS_ITEM
    );
    if (
      ambiguousDiscrepancies.length > 0 ||
      reconciliation.unmatchedDetections.length > 0 ||
      (reconciliation.expectedItemsSummary.length > 0 && reconciliation.detectedItemsSummary.length === 0)
    ) {
      evaluations.push({
        ruleName: 'AMBIGUITY_CHECK',
        verdict: CheckVerdict.UNCERTAIN,
        details: {
          count: ambiguousDiscrepancies.length,
          noItemsDetected: reconciliation.detectedItemsSummary.length === 0,
        },
      });
      return {
        decision: OperationalDecision.UNCERTAIN,
        reasonSummary: reconciliation.detectedItemsSummary.length === 0
          ? 'No package items could be confidently identified from the photograph'
          : `Unresolved ambiguity in observed package contents (${ambiguousDiscrepancies.length} ambiguous item(s))`,
        ruleEvaluations: evaluations,
        overallConfidence,
      };
    }
    evaluations.push({
      ruleName: 'AMBIGUITY_CHECK',
      verdict: CheckVerdict.PASS,
    });

    // Rule 4: Missing Items Check
    const missingDiscrepancies = reconciliation.discrepancies.filter(
      d => d.type === DiscrepancyType.MISSING_ITEM
    );
    if (missingDiscrepancies.length > 0) {
      evaluations.push({
        ruleName: 'MISSING_ITEMS_CHECK',
        verdict: CheckVerdict.FAIL,
        details: { missing: missingDiscrepancies },
      });
      const skus = missingDiscrepancies.map(d => d.expectedSku).filter(Boolean).join(', ');
      return {
        decision: OperationalDecision.STOP_AND_FIX,
        reasonSummary: `Missing expected item(s): ${skus}`,
        ruleEvaluations: evaluations,
        overallConfidence,
      };
    }
    evaluations.push({
      ruleName: 'MISSING_ITEMS_CHECK',
      verdict: CheckVerdict.PASS,
    });

    // Rule 5: Wrong Items Check (Unexpected items in box)
    const wrongDiscrepancies = reconciliation.discrepancies.filter(
      d => d.type === DiscrepancyType.WRONG_ITEM
    );
    if (wrongDiscrepancies.length > 0) {
      evaluations.push({
        ruleName: 'WRONG_ITEMS_CHECK',
        verdict: CheckVerdict.FAIL,
        details: { wrong: wrongDiscrepancies },
      });
      const skus = wrongDiscrepancies.map(d => d.detectedSku).filter(Boolean).join(', ');
      return {
        decision: OperationalDecision.STOP_AND_FIX,
        reasonSummary: `Wrong / unexpected item(s) found in package: ${skus}`,
        ruleEvaluations: evaluations,
        overallConfidence,
      };
    }
    evaluations.push({
      ruleName: 'WRONG_ITEMS_CHECK',
      verdict: CheckVerdict.PASS,
    });

    // Rule 6: Quantity Mismatch Check
    const quantityDiscrepancies = reconciliation.discrepancies.filter(
      d => d.type === DiscrepancyType.QUANTITY_MISMATCH
    );
    if (quantityDiscrepancies.length > 0) {
      evaluations.push({
        ruleName: 'QUANTITY_CHECK',
        verdict: CheckVerdict.FAIL,
        details: { quantityDiscrepancies },
      });
      return {
        decision: OperationalDecision.STOP_AND_FIX,
        reasonSummary: `Quantity mismatch detected on order lines`,
        ruleEvaluations: evaluations,
        overallConfidence,
      };
    }
    evaluations.push({
      ruleName: 'QUANTITY_CHECK',
      verdict: CheckVerdict.PASS,
    });

    // Rule 7: Critical Variant Mismatch Check
    const variantDiscrepancies = reconciliation.discrepancies.filter(
      d => d.type === DiscrepancyType.VARIANT_MISMATCH
    );
    if (variantDiscrepancies.length > 0) {
      evaluations.push({
        ruleName: 'CRITICAL_VARIANT_CHECK',
        verdict: CheckVerdict.FAIL,
        details: { variantDiscrepancies },
      });
      return {
        decision: OperationalDecision.STOP_AND_FIX,
        reasonSummary: `Critical product variant mismatch detected (e.g. size/color/model)`,
        ruleEvaluations: evaluations,
        overallConfidence,
      };
    }
    evaluations.push({
      ruleName: 'CRITICAL_VARIANT_CHECK',
      verdict: CheckVerdict.PASS,
    });

    // Rule 8: Centralized Confidence Threshold Gating
    if (overallConfidence < configuration.minOverallConfidence) {
      evaluations.push({
        ruleName: 'CONFIDENCE_THRESHOLD_CHECK',
        verdict: CheckVerdict.FAIL,
        details: {
          confidence: overallConfidence,
          required: configuration.minOverallConfidence,
        },
      });
      return {
        decision: OperationalDecision.UNCERTAIN,
        reasonSummary: `Overall identification confidence (${(overallConfidence * 100).toFixed(1)}%) below required threshold (${(configuration.minOverallConfidence * 100).toFixed(1)}%)`,
        ruleEvaluations: evaluations,
        overallConfidence,
      };
    }
    evaluations.push({
      ruleName: 'CONFIDENCE_THRESHOLD_CHECK',
      verdict: CheckVerdict.PASS,
      details: { confidence: overallConfidence },
    });

    // ALL GATES PASSED -> SEAL
    return {
      decision: OperationalDecision.SEAL,
      reasonSummary: 'Order contents verified: all items, quantities, and variants match exactly',
      ruleEvaluations: evaluations,
      overallConfidence,
    };
  }
}
