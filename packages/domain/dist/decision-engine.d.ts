import { OperationalDecision, CheckVerdict } from '@pack-manager/shared';
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
export declare class DeterministicDecisionEngine {
    evaluate(input: DecisionEngineInput): DecisionEvaluationResult;
}
//# sourceMappingURL=decision-engine.d.ts.map