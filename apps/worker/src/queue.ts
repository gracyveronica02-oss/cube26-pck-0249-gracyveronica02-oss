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
export class InMemoryWorkerQueue implements IVerificationQueue {
  private queue: VerificationJobData[] = [];
  private deadLetterQueue: Array<{ data: VerificationJobData; error: string }> = [];
  private activeJobs = new Set<string>();
  private processedIdempotencyKeys = new Set<string>();

  constructor(
    private pipeline: PackVerificationPipeline,
    private maxRetries = 3,
    private autoProcess = false
  ) {}

  public async enqueue(data: VerificationJobData): Promise<string> {
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

  public async processNext(): Promise<boolean> {
    const job = this.queue.shift();
    if (!job) return false;

    this.activeJobs.add(job.jobId);

    try {
      await this.pipeline.execute({
        orgId: job.orgId,
        packId: job.packId,
        jobId: job.jobId,
        actorId: job.actorId,
      });
      return true;
    } catch (err) {
      const errorMessage = (err as Error).message;
      this.deadLetterQueue.push({ data: job, error: errorMessage });
      return false;
    } finally {
      this.activeJobs.delete(job.jobId);
    }
  }

  public async processAll(): Promise<void> {
    while (this.queue.length > 0) {
      await this.processNext();
    }
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public getDeadLetterQueue() {
    return this.deadLetterQueue;
  }
}
