"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackStateMachine = exports.InvalidStateTransitionError = void 0;
const shared_1 = require("@pack-manager/shared");
class InvalidStateTransitionError extends Error {
    fromStatus;
    toStatus;
    constructor(fromStatus, toStatus, message) {
        super(message || `Invalid pack state transition from ${fromStatus} to ${toStatus}`);
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.name = 'InvalidStateTransitionError';
    }
}
exports.InvalidStateTransitionError = InvalidStateTransitionError;
/**
 * Valid transitions table:
 * RECEIVED -> VALIDATING
 * VALIDATING -> ANALYZING, STOP_AND_FIX, ANALYSIS_FAILED
 * ANALYZING -> RECONCILING, ANALYSIS_FAILED
 * RECONCILING -> SEAL, STOP_AND_FIX
 * STOP_AND_FIX -> VALIDATING (on rescan), SEAL (on authorized supervisor override)
 * ANALYSIS_FAILED -> VALIDATING (on retry/rescan)
 */
const VALID_TRANSITIONS = {
    [shared_1.PackStatus.RECEIVED]: [shared_1.PackStatus.VALIDATING],
    [shared_1.PackStatus.VALIDATING]: [shared_1.PackStatus.ANALYZING, shared_1.PackStatus.STOP_AND_FIX, shared_1.PackStatus.MANUAL_REVIEW, shared_1.PackStatus.ANALYSIS_FAILED],
    [shared_1.PackStatus.ANALYZING]: [shared_1.PackStatus.RECONCILING, shared_1.PackStatus.STOP_AND_FIX, shared_1.PackStatus.MANUAL_REVIEW, shared_1.PackStatus.ANALYSIS_FAILED],
    [shared_1.PackStatus.RECONCILING]: [shared_1.PackStatus.SEAL, shared_1.PackStatus.STOP_AND_FIX, shared_1.PackStatus.MANUAL_REVIEW],
    [shared_1.PackStatus.STOP_AND_FIX]: [shared_1.PackStatus.VALIDATING, shared_1.PackStatus.SEAL, shared_1.PackStatus.MANUAL_REVIEW],
    [shared_1.PackStatus.MANUAL_REVIEW]: [shared_1.PackStatus.VALIDATING, shared_1.PackStatus.SEAL, shared_1.PackStatus.STOP_AND_FIX],
    [shared_1.PackStatus.ANALYSIS_FAILED]: [shared_1.PackStatus.VALIDATING, shared_1.PackStatus.STOP_AND_FIX, shared_1.PackStatus.MANUAL_REVIEW],
    [shared_1.PackStatus.SEAL]: [], // Terminal state for sealed carton
};
class PackStateMachine {
    static canTransition(current, next) {
        const allowed = VALID_TRANSITIONS[current] || [];
        return allowed.includes(next);
    }
    static transition(packId, current, next, actorId, reason) {
        if (!this.canTransition(current, next)) {
            throw new InvalidStateTransitionError(current, next);
        }
        return {
            packId,
            fromStatus: current,
            toStatus: next,
            actorId,
            reason,
            timestamp: new Date(),
        };
    }
}
exports.PackStateMachine = PackStateMachine;
//# sourceMappingURL=state-machine.js.map