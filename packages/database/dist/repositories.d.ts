import { Order, Pack, PackImage, Product, Analysis, Detection, SKUMatch, Discrepancy } from '@pack-manager/domain';
import { PackStatus, OperationalDecision } from '@pack-manager/shared';
export interface ProcessingJobRecord {
    jobId: string;
    orgId: string;
    packId: string;
    idempotencyKey: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER';
    attempt: number;
    maxAttempts: number;
    errorMessage?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}
export interface ReviewActionRecord {
    reviewId: string;
    orgId: string;
    packId: string;
    analysisId: string;
    operatorId: string;
    action: 'APPROVED_OVERRIDE' | 'REJECTED_REPACK' | 'RESCAN_REQUESTED';
    operatorVerdict: OperationalDecision;
    reasonCode: string;
    notes?: string;
    createdAt: Date;
}
export interface AuditEventRecord {
    auditId: string;
    orgId: string;
    entityType: string;
    entityId: string;
    actorId: string;
    action: string;
    previousState?: unknown;
    newState?: unknown;
    createdAt: Date;
}
export interface IPackRepository {
    createPack(pack: Pack): Promise<Pack>;
    getPackById(orgId: string, packId: string): Promise<Pack | null>;
    getPackByUnitId(orgId: string, unitId: string): Promise<Pack | null>;
    updatePackStatus(orgId: string, packId: string, status: PackStatus, currentAnalysisId?: string): Promise<void>;
    addPackImage(orgId: string, packId: string, image: PackImage): Promise<void>;
    listPacks(orgId: string, status?: PackStatus, limit?: number, offset?: number): Promise<Pack[]>;
}
export interface IOrderRepository {
    createOrder(order: Order): Promise<Order>;
    getOrderById(orgId: string, orderId: string): Promise<Order | null>;
    getOrderByExternalRef(orgId: string, externalRef: string): Promise<Order | null>;
    listOrders(orgId: string): Promise<Order[]>;
    updateOrder(orgId: string, orderId: string, patch: Partial<Pick<Order, 'externalOrderRef' | 'channel' | 'customerName' | 'items'>>): Promise<Order | null>;
}
export interface IProductRepository {
    createProduct(product: Product): Promise<Product>;
    getProductBySku(orgId: string, sku: string): Promise<Product | null>;
    listProducts(orgId: string): Promise<Product[]>;
}
export interface IAnalysisRepository {
    createAnalysis(analysis: Analysis): Promise<Analysis>;
    getAnalysisById(orgId: string, analysisId: string): Promise<Analysis | null>;
    listAnalysesForPack(orgId: string, packId: string): Promise<Analysis[]>;
    saveAnalysisResults(orgId: string, analysisId: string, results: {
        status: 'COMPLETED' | 'FAILED';
        overallConfidence: number;
        decision: OperationalDecision;
        executionTimeMs: number;
        detections: Detection[];
        skuMatches: SKUMatch[];
        discrepancies: Discrepancy[];
        ruleEvaluations: Record<string, unknown>;
    }): Promise<void>;
}
export interface IJobRepository {
    createJob(job: ProcessingJobRecord): Promise<ProcessingJobRecord>;
    getJobByIdempotencyKey(orgId: string, idempotencyKey: string): Promise<ProcessingJobRecord | null>;
    getJobById(orgId: string, jobId: string): Promise<ProcessingJobRecord | null>;
    updateJobStatus(orgId: string, jobId: string, status: ProcessingJobRecord['status'], errorMessage?: string): Promise<void>;
}
export interface IAuditRepository {
    recordEvent(event: AuditEventRecord): Promise<void>;
    listEventsForEntity(orgId: string, entityType: string, entityId: string): Promise<AuditEventRecord[]>;
}
/**
 * High-Performance In-Memory Repository Implementation
 * Ideal for unit testing, integration tests without live DB, and local fast iteration.
 * Strictly respects org_id tenant boundaries (Engineering Rule 1).
 */
export declare class InMemoryRepositories implements IPackRepository, IOrderRepository, IProductRepository, IAnalysisRepository, IJobRepository, IAuditRepository {
    private packs;
    private orders;
    private products;
    private analyses;
    private jobs;
    private auditEvents;
    reviewActions: ReviewActionRecord[];
    createPack(pack: Pack): Promise<Pack>;
    getPackById(orgId: string, packId: string): Promise<Pack | null>;
    getPackByUnitId(orgId: string, unitId: string): Promise<Pack | null>;
    updatePackStatus(orgId: string, packId: string, status: PackStatus, currentAnalysisId?: string): Promise<void>;
    addPackImage(orgId: string, packId: string, image: PackImage): Promise<void>;
    listPacks(orgId: string, status?: PackStatus, limit?: number, offset?: number): Promise<Pack[]>;
    createOrder(order: Order): Promise<Order>;
    getOrderById(orgId: string, orderId: string): Promise<Order | null>;
    getOrderByExternalRef(orgId: string, externalRef: string): Promise<Order | null>;
    listOrders(orgId: string): Promise<Order[]>;
    updateOrder(orgId: string, orderId: string, patch: Partial<Pick<Order, 'externalOrderRef' | 'channel' | 'customerName' | 'items'>>): Promise<Order | null>;
    createProduct(product: Product): Promise<Product>;
    getProductBySku(orgId: string, sku: string): Promise<Product | null>;
    listProducts(orgId: string): Promise<Product[]>;
    createAnalysis(analysis: Analysis): Promise<Analysis>;
    getAnalysisById(orgId: string, analysisId: string): Promise<Analysis | null>;
    listAnalysesForPack(orgId: string, packId: string): Promise<Analysis[]>;
    saveAnalysisResults(orgId: string, analysisId: string, results: {
        status: 'COMPLETED' | 'FAILED';
        overallConfidence: number;
        decision: OperationalDecision;
        executionTimeMs: number;
        detections: Detection[];
        skuMatches: SKUMatch[];
        discrepancies: Discrepancy[];
        ruleEvaluations: Record<string, unknown>;
    }): Promise<void>;
    createJob(job: ProcessingJobRecord): Promise<ProcessingJobRecord>;
    getJobByIdempotencyKey(orgId: string, idempotencyKey: string): Promise<ProcessingJobRecord | null>;
    getJobById(orgId: string, jobId: string): Promise<ProcessingJobRecord | null>;
    updateJobStatus(orgId: string, jobId: string, status: ProcessingJobRecord['status'], errorMessage?: string): Promise<void>;
    recordEvent(event: AuditEventRecord): Promise<void>;
    listEventsForEntity(orgId: string, entityType: string, entityId: string): Promise<AuditEventRecord[]>;
    clear(): void;
}
//# sourceMappingURL=repositories.d.ts.map