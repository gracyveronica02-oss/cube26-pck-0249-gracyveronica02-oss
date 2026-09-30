import {
  Order,
  OrderItem,
  Pack,
  PackImage,
  Product,
  Analysis,
  Detection,
  SKUMatch,
  Discrepancy,
  Decision,
} from '@pack-manager/domain';
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
  updateOrder(
    orgId: string,
    orderId: string,
    patch: Partial<Pick<Order, 'externalOrderRef' | 'channel' | 'customerName' | 'items'>>
  ): Promise<Order | null>;
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
  saveAnalysisResults(
    orgId: string,
    analysisId: string,
    results: {
      status: 'COMPLETED' | 'FAILED';
      overallConfidence: number;
      decision: OperationalDecision;
      executionTimeMs: number;
      detections: Detection[];
      skuMatches: SKUMatch[];
      discrepancies: Discrepancy[];
      ruleEvaluations: Record<string, unknown>;
    }
  ): Promise<void>;
}

export interface IJobRepository {
  createJob(job: ProcessingJobRecord): Promise<ProcessingJobRecord>;
  getJobByIdempotencyKey(orgId: string, idempotencyKey: string): Promise<ProcessingJobRecord | null>;
  getJobById(orgId: string, jobId: string): Promise<ProcessingJobRecord | null>;
  updateJobStatus(
    orgId: string,
    jobId: string,
    status: ProcessingJobRecord['status'],
    errorMessage?: string
  ): Promise<void>;
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
export class InMemoryRepositories implements 
  IPackRepository,
  IOrderRepository,
  IProductRepository,
  IAnalysisRepository,
  IJobRepository,
  IAuditRepository {

  private packs = new Map<string, Pack>();
  private orders = new Map<string, Order>();
  private products = new Map<string, Product>();
  private analyses = new Map<string, Analysis>();
  private jobs = new Map<string, ProcessingJobRecord>();
  private auditEvents: AuditEventRecord[] = [];
  public reviewActions: ReviewActionRecord[] = [];

  // Pack Repository
  public async createPack(pack: Pack): Promise<Pack> {
    const key = `${pack.orgId}:${pack.packId}`;
    this.packs.set(key, { ...pack, images: [...pack.images], analyses: [...pack.analyses] });
    return pack;
  }

  public async getPackById(orgId: string, packId: string): Promise<Pack | null> {
    const pack = this.packs.get(`${orgId}:${packId}`);
    return pack ? JSON.parse(JSON.stringify(pack)) : null;
  }

  public async getPackByUnitId(orgId: string, unitId: string): Promise<Pack | null> {
    for (const p of this.packs.values()) {
      if (p.orgId === orgId && p.unitId === unitId) {
        return JSON.parse(JSON.stringify(p));
      }
    }
    return null;
  }

  public async updatePackStatus(
    orgId: string,
    packId: string,
    status: PackStatus,
    currentAnalysisId?: string
  ): Promise<void> {
    const key = `${orgId}:${packId}`;
    const pack = this.packs.get(key);
    if (!pack) throw new Error(`Pack not found: ${packId}`);
    pack.status = status;
    if (currentAnalysisId) pack.currentAnalysisId = currentAnalysisId;
    pack.updatedAt = new Date();
  }

  public async addPackImage(orgId: string, packId: string, image: PackImage): Promise<void> {
    const key = `${orgId}:${packId}`;
    const pack = this.packs.get(key);
    if (!pack) throw new Error(`Pack not found: ${packId}`);
    pack.images.push(image);
  }

  public async listPacks(
    orgId: string,
    status?: PackStatus,
    limit = 50,
    offset = 0
  ): Promise<Pack[]> {
    const result: Pack[] = [];
    for (const p of this.packs.values()) {
      if (p.orgId === orgId && (!status || p.status === status)) {
        result.push(JSON.parse(JSON.stringify(p)));
      }
    }
    return result.slice(offset, offset + limit);
  }

  // Order Repository
  public async createOrder(order: Order): Promise<Order> {
    this.orders.set(`${order.orgId}:${order.orderId}`, JSON.parse(JSON.stringify(order)));
    return order;
  }

  public async getOrderById(orgId: string, orderId: string): Promise<Order | null> {
    const order = this.orders.get(`${orgId}:${orderId}`);
    return order ? JSON.parse(JSON.stringify(order)) : null;
  }

  public async getOrderByExternalRef(orgId: string, externalRef: string): Promise<Order | null> {
    for (const o of this.orders.values()) {
      if (o.orgId === orgId && o.externalOrderRef === externalRef) {
        return JSON.parse(JSON.stringify(o));
      }
    }
    return null;
  }

  public async listOrders(orgId: string): Promise<Order[]> {
    const result: Order[] = [];
    for (const o of this.orders.values()) {
      if (o.orgId === orgId) {
        result.push(JSON.parse(JSON.stringify(o)));
      }
    }
    return result;
  }

  public async updateOrder(
    orgId: string,
    orderId: string,
    patch: Partial<Pick<Order, 'externalOrderRef' | 'channel' | 'customerName' | 'items'>>
  ): Promise<Order | null> {
    const key = `${orgId}:${orderId}`;
    const order = this.orders.get(key);
    if (!order) return null;
    if (patch.externalOrderRef !== undefined) order.externalOrderRef = patch.externalOrderRef;
    if (patch.channel !== undefined) order.channel = patch.channel;
    if (patch.customerName !== undefined) order.customerName = patch.customerName;
    if (patch.items) {
      order.items = patch.items.map((item, idx) => ({
        orderItemId: item.orderItemId || `item_${orderId}_${idx + 1}`,
        orderId,
        sku: item.sku,
        expectedQuantity: item.expectedQuantity,
        productName: item.productName,
        asin: item.asin,
        referenceImage: item.referenceImage,
        criticalAttributes: item.criticalAttributes || ['color', 'size'],
        attributes: item.attributes || {},
      }));
    }
    this.orders.set(key, order);
    return JSON.parse(JSON.stringify(order));
  }

  // Product Repository
  public async createProduct(product: Product): Promise<Product> {
    this.products.set(`${product.orgId}:${product.sku}`, JSON.parse(JSON.stringify(product)));
    return product;
  }

  public async getProductBySku(orgId: string, sku: string): Promise<Product | null> {
    const prod = this.products.get(`${orgId}:${sku}`);
    return prod ? JSON.parse(JSON.stringify(prod)) : null;
  }

  public async listProducts(orgId: string): Promise<Product[]> {
    const list: Product[] = [];
    for (const p of this.products.values()) {
      if (p.orgId === orgId) {
        list.push(JSON.parse(JSON.stringify(p)));
      }
    }
    return list;
  }

  // Analysis Repository
  public async createAnalysis(analysis: Analysis): Promise<Analysis> {
    this.analyses.set(`${analysis.orgId}:${analysis.analysisId}`, JSON.parse(JSON.stringify(analysis)));
    // Also associate to pack
    const pack = this.packs.get(`${analysis.orgId}:${analysis.packId}`);
    if (pack) {
      pack.analyses.push(analysis);
      pack.currentAnalysisId = analysis.analysisId;
    }
    return analysis;
  }

  public async getAnalysisById(orgId: string, analysisId: string): Promise<Analysis | null> {
    const anl = this.analyses.get(`${orgId}:${analysisId}`);
    return anl ? JSON.parse(JSON.stringify(anl)) : null;
  }

  public async listAnalysesForPack(orgId: string, packId: string): Promise<Analysis[]> {
    const list: Analysis[] = [];
    for (const a of this.analyses.values()) {
      if (a.orgId === orgId && a.packId === packId) {
        list.push(JSON.parse(JSON.stringify(a)));
      }
    }
    return list.sort((a, b) => a.analysisNumber - b.analysisNumber);
  }

  public async saveAnalysisResults(
    orgId: string,
    analysisId: string,
    results: {
      status: 'COMPLETED' | 'FAILED';
      overallConfidence: number;
      decision: OperationalDecision;
      executionTimeMs: number;
      detections: Detection[];
      skuMatches: SKUMatch[];
      discrepancies: Discrepancy[];
      ruleEvaluations: Record<string, unknown>;
    }
  ): Promise<void> {
    const anl = this.analyses.get(`${orgId}:${analysisId}`);
    if (!anl) throw new Error(`Analysis not found: ${analysisId}`);
    anl.status = results.status;
    anl.overallConfidence = results.overallConfidence;
    anl.decision = results.decision;
    anl.executionTimeMs = results.executionTimeMs;
    anl.detections = results.detections;
    anl.skuMatches = results.skuMatches;
    anl.discrepancies = results.discrepancies;
    anl.ruleEvaluations = results.ruleEvaluations;
    anl.completedAt = new Date();
  }

  // Job Repository
  public async createJob(job: ProcessingJobRecord): Promise<ProcessingJobRecord> {
    const existing = await this.getJobByIdempotencyKey(job.orgId, job.idempotencyKey);
    if (existing) {
      throw new Error(`Duplicate idempotency key: ${job.idempotencyKey}`);
    }
    this.jobs.set(`${job.orgId}:${job.jobId}`, JSON.parse(JSON.stringify(job)));
    return job;
  }

  public async getJobByIdempotencyKey(orgId: string, idempotencyKey: string): Promise<ProcessingJobRecord | null> {
    for (const j of this.jobs.values()) {
      if (j.orgId === orgId && j.idempotencyKey === idempotencyKey) {
        return JSON.parse(JSON.stringify(j));
      }
    }
    return null;
  }

  public async getJobById(orgId: string, jobId: string): Promise<ProcessingJobRecord | null> {
    const job = this.jobs.get(`${orgId}:${jobId}`);
    return job ? JSON.parse(JSON.stringify(job)) : null;
  }

  public async updateJobStatus(
    orgId: string,
    jobId: string,
    status: ProcessingJobRecord['status'],
    errorMessage?: string
  ): Promise<void> {
    const job = this.jobs.get(`${orgId}:${jobId}`);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    job.status = status;
    if (errorMessage) job.errorMessage = errorMessage;
    if (status === 'RUNNING') job.startedAt = new Date();
    if (status === 'COMPLETED' || status === 'FAILED' || status === 'DEAD_LETTER') {
      job.completedAt = new Date();
    }
  }

  // Audit Repository
  public async recordEvent(event: AuditEventRecord): Promise<void> {
    this.auditEvents.push(JSON.parse(JSON.stringify(event)));
  }

  public async listEventsForEntity(
    orgId: string,
    entityType: string,
    entityId: string
  ): Promise<AuditEventRecord[]> {
    return this.auditEvents
      .filter(e => e.orgId === orgId && e.entityType === entityType && e.entityId === entityId)
      .map(e => JSON.parse(JSON.stringify(e)));
  }

  public clear(): void {
    this.packs.clear();
    this.orders.clear();
    this.products.clear();
    this.analyses.clear();
    this.jobs.clear();
    this.auditEvents = [];
    this.reviewActions = [];
  }
}
