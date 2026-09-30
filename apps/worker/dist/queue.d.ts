import { PackVerificationPipeline } from './pipeline.js';
export interface VerificationJobData {
    orgId: string;
    packId: string;
    jobId: string;
    idempotencyKey: string;
    actorId?: string;
}
export interface IVerificationQueue {
    enqueue(data: VerificationJobData): Promise<string>;
    processNext(): Promise<boolean>;
}
/**
 * Resilient In-Memory Async Worker Queue.
 * Supports idempotency, concurrency, exponential backoff retries, and dead-letter queue.
 */
export declare class InMemoryWorkerQueue implements IVerificationQueue {
    private pipeline;
    private maxRetries;
    private autoProcess;
    private queue;
    private deadLetterQueue;
    private activeJobs;
    private processedIdempotencyKeys;
    constructor(pipeline: PackVerificationPipeline, maxRetries?: number, autoProcess?: boolean);
    enqueue(data: VerificationJobData): Promise<string>;
    processNext(): Promise<boolean>;
    processAll(): Promise<void>;
    getQueueLength(): number;
    getDeadLetterQueue(): {
        data: VerificationJobData;
        error: string;
    }[];
}
//# sourceMappingURL=queue.d.ts.map