import { PackStatus } from '@pack-manager/shared';

export interface StateTransitionEvent {
  packId: string;
  fromStatus: PackStatus;
  toStatus: PackStatus;
  actorId: string;
  reason?: string;
  timestamp: Date;
}

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly fromStatus: PackStatus,
    public readonly toStatus: PackStatus,
    message?: string
  ) {
    super(message || `Invalid pack state transition from ${fromStatus} to ${toStatus}`);
    this.name = 'InvalidStateTransitionError';
  }
}

/**
 * Valid transitions table:
 * RECEIVED -> VALIDATING
 * VALIDATING -> ANALYZING, STOP_AND_FIX, ANALYSIS_FAILED
 * ANALYZING -> RECONCILING, ANALYSIS_FAILED
 * RECONCILING -> SEAL, STOP_AND_FIX
 * STOP_AND_FIX -> VALIDATING (on rescan), SEAL (on authorized supervisor override)
 * ANALYSIS_FAILED -> VALIDATING (on retry/rescan)
 */
const VALID_TRANSITIONS: Record<PackStatus, PackStatus[]> = {
  [PackStatus.RECEIVED]: [PackStatus.VALIDATING],
  [PackStatus.VALIDATING]: [PackStatus.ANALYZING, PackStatus.STOP_AND_FIX, PackStatus.MANUAL_REVIEW, PackStatus.ANALYSIS_FAILED],
  [PackStatus.ANALYZING]: [PackStatus.RECONCILING, PackStatus.STOP_AND_FIX, PackStatus.MANUAL_REVIEW, PackStatus.ANALYSIS_FAILED],
  [PackStatus.RECONCILING]: [PackStatus.SEAL, PackStatus.STOP_AND_FIX, PackStatus.MANUAL_REVIEW],
  [PackStatus.STOP_AND_FIX]: [PackStatus.VALIDATING, PackStatus.SEAL, PackStatus.MANUAL_REVIEW],
  [PackStatus.MANUAL_REVIEW]: [PackStatus.VALIDATING, PackStatus.SEAL, PackStatus.STOP_AND_FIX],
  [PackStatus.ANALYSIS_FAILED]: [PackStatus.VALIDATING, PackStatus.STOP_AND_FIX, PackStatus.MANUAL_REVIEW],
  [PackStatus.SEAL]: [], // Terminal state for sealed carton
};

export class PackStateMachine {
  public static canTransition(current: PackStatus, next: PackStatus): boolean {
    const allowed = VALID_TRANSITIONS[current] || [];
    return allowed.includes(next);
  }

  public static transition(
    packId: string,
    current: PackStatus,
    next: PackStatus,
    actorId: string,
    reason?: string
  ): StateTransitionEvent {
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
