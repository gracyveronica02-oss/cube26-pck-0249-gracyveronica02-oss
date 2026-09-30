import { PackStatus } from '@pack-manager/shared';
export interface StateTransitionEvent {
    packId: string;
    fromStatus: PackStatus;
    toStatus: PackStatus;
    actorId: string;
    reason?: string;
    timestamp: Date;
}
export declare class InvalidStateTransitionError extends Error {
    readonly fromStatus: PackStatus;
    readonly toStatus: PackStatus;
    constructor(fromStatus: PackStatus, toStatus: PackStatus, message?: string);
}
export declare class PackStateMachine {
    static canTransition(current: PackStatus, next: PackStatus): boolean;
    static transition(packId: string, current: PackStatus, next: PackStatus, actorId: string, reason?: string): StateTransitionEvent;
}
//# sourceMappingURL=state-machine.d.ts.map