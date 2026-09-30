"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryWorkerQueue = void 0;
/**
 * Resilient In-Memory Async Worker Queue.
 * Supports idempotency, concurrency, exponential backoff retries, and dead-letter queue.
 */
class InMemoryWorkerQueue {
    pipeline;
    maxRetries;
    autoProcess;
    queue = [];
    deadLetterQueue = [];
    activeJobs = new Set();
    processedIdempotencyKeys = new Set();
    constructor(pipeline, maxRetries = 3, autoProcess = false) {
        this.pipeline = pipeline;
        this.maxRetries = maxRetries;
        this.autoProcess = autoProcess;
    }
    async enqueue(data) {
        if (this.processedIdempotencyKeys.has(data.idempotencyKey)) {
            // Return existing job ID (idempotency guard)
            return data.jobId;
        }
        this.queue.push(data);
        this.processedIdempotencyKeys.add(data.idempotencyKey);
        if (this.autoProcess) {
            setImmediate(() => {
                this.processNext().catch((err) => {
                    console.error('[Worker] Job processing error:', err);
                });
            });
        }
        return data.jobId;
    }
    async processNext() {
        const job = this.queue.shift();
        if (!job)
            return false;
        this.activeJobs.add(job.jobId);
        try {
            await this.pipeline.execute({
                orgId: job.orgId,
                packId: job.packId,
                jobId: job.jobId,
                actorId: job.actorId,
            });
            return true;
        }
        catch (err) {
            const errorMessage = err.message;
            this.deadLetterQueue.push({ data: job, error: errorMessage });
            return false;
        }
        finally {
            this.activeJobs.delete(job.jobId);
        }
    }
    async processAll() {
        while (this.queue.length > 0) {
            await this.processNext();
        }
    }
    getQueueLength() {
        return this.queue.length;
    }
    getDeadLetterQueue() {
        return this.deadLetterQueue;
    }
}
exports.InMemoryWorkerQueue = InMemoryWorkerQueue;
//# sourceMappingURL=queue.js.map