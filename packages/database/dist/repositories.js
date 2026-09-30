"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryRepositories = void 0;
/**
 * High-Performance In-Memory Repository Implementation
 * Ideal for unit testing, integration tests without live DB, and local fast iteration.
 * Strictly respects org_id tenant boundaries (Engineering Rule 1).
 */
class InMemoryRepositories {
    packs = new Map();
    orders = new Map();
    products = new Map();
    analyses = new Map();
    jobs = new Map();
    auditEvents = [];
    reviewActions = [];
    // Pack Repository
    async createPack(pack) {
        const key = `${pack.orgId}:${pack.packId}`;
        this.packs.set(key, { ...pack, images: [...pack.images], analyses: [...pack.analyses] });
        return pack;
    }
    async getPackById(orgId, packId) {
        const pack = this.packs.get(`${orgId}:${packId}`);
        return pack ? JSON.parse(JSON.stringify(pack)) : null;
    }
    async getPackByUnitId(orgId, unitId) {
        for (const p of this.packs.values()) {
            if (p.orgId === orgId && p.unitId === unitId) {
                return JSON.parse(JSON.stringify(p));
            }
        }
        return null;
    }
    async updatePackStatus(orgId, packId, status, currentAnalysisId) {
        const key = `${orgId}:${packId}`;
        const pack = this.packs.get(key);
        if (!pack)
            throw new Error(`Pack not found: ${packId}`);
        pack.status = status;
        if (currentAnalysisId)
            pack.currentAnalysisId = currentAnalysisId;
        pack.updatedAt = new Date();
    }
    async addPackImage(orgId, packId, image) {
        const key = `${orgId}:${packId}`;
        const pack = this.packs.get(key);
        if (!pack)
            throw new Error(`Pack not found: ${packId}`);
        pack.images.push(image);
    }
    async listPacks(orgId, status, limit = 50, offset = 0) {
        const result = [];
        for (const p of this.packs.values()) {
            if (p.orgId === orgId && (!status || p.status === status)) {
                result.push(JSON.parse(JSON.stringify(p)));
            }
        }
        return result.slice(offset, offset + limit);
    }
    // Order Repository
    async createOrder(order) {
        this.orders.set(`${order.orgId}:${order.orderId}`, JSON.parse(JSON.stringify(order)));
        return order;
    }
    async getOrderById(orgId, orderId) {
        const order = this.orders.get(`${orgId}:${orderId}`);
        return order ? JSON.parse(JSON.stringify(order)) : null;
    }
    async getOrderByExternalRef(orgId, externalRef) {
        for (const o of this.orders.values()) {
            if (o.orgId === orgId && o.externalOrderRef === externalRef) {
                return JSON.parse(JSON.stringify(o));
            }
        }
        return null;
    }
    async listOrders(orgId) {
        const result = [];
        for (const o of this.orders.values()) {
            if (o.orgId === orgId) {
                result.push(JSON.parse(JSON.stringify(o)));
            }
        }
        return result;
    }
    async updateOrder(orgId, orderId, patch) {
        const key = `${orgId}:${orderId}`;
        const order = this.orders.get(key);
        if (!order)
            return null;
        if (patch.externalOrderRef !== undefined)
            order.externalOrderRef = patch.externalOrderRef;
        if (patch.channel !== undefined)
            order.channel = patch.channel;
        if (patch.customerName !== undefined)
            order.customerName = patch.customerName;
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
    async createProduct(product) {
        this.products.set(`${product.orgId}:${product.sku}`, JSON.parse(JSON.stringify(product)));
        return product;
    }
    async getProductBySku(orgId, sku) {
        const prod = this.products.get(`${orgId}:${sku}`);
        return prod ? JSON.parse(JSON.stringify(prod)) : null;
    }
    async listProducts(orgId) {
        const list = [];
        for (const p of this.products.values()) {
            if (p.orgId === orgId) {
                list.push(JSON.parse(JSON.stringify(p)));
            }
        }
        return list;
    }
    // Analysis Repository
    async createAnalysis(analysis) {
        this.analyses.set(`${analysis.orgId}:${analysis.analysisId}`, JSON.parse(JSON.stringify(analysis)));
        // Also associate to pack
        const pack = this.packs.get(`${analysis.orgId}:${analysis.packId}`);
        if (pack) {
            pack.analyses.push(analysis);
            pack.currentAnalysisId = analysis.analysisId;
        }
        return analysis;
    }
    async getAnalysisById(orgId, analysisId) {
        const anl = this.analyses.get(`${orgId}:${analysisId}`);
        return anl ? JSON.parse(JSON.stringify(anl)) : null;
    }
    async listAnalysesForPack(orgId, packId) {
        const list = [];
        for (const a of this.analyses.values()) {
            if (a.orgId === orgId && a.packId === packId) {
                list.push(JSON.parse(JSON.stringify(a)));
            }
        }
        return list.sort((a, b) => a.analysisNumber - b.analysisNumber);
    }
    async saveAnalysisResults(orgId, analysisId, results) {
        const anl = this.analyses.get(`${orgId}:${analysisId}`);
        if (!anl)
            throw new Error(`Analysis not found: ${analysisId}`);
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
    async createJob(job) {
        const existing = await this.getJobByIdempotencyKey(job.orgId, job.idempotencyKey);
        if (existing) {
            throw new Error(`Duplicate idempotency key: ${job.idempotencyKey}`);
        }
        this.jobs.set(`${job.orgId}:${job.jobId}`, JSON.parse(JSON.stringify(job)));
        return job;
    }
    async getJobByIdempotencyKey(orgId, idempotencyKey) {
        for (const j of this.jobs.values()) {
            if (j.orgId === orgId && j.idempotencyKey === idempotencyKey) {
                return JSON.parse(JSON.stringify(j));
            }
        }
        return null;
    }
    async getJobById(orgId, jobId) {
        const job = this.jobs.get(`${orgId}:${jobId}`);
        return job ? JSON.parse(JSON.stringify(job)) : null;
    }
    async updateJobStatus(orgId, jobId, status, errorMessage) {
        const job = this.jobs.get(`${orgId}:${jobId}`);
        if (!job)
            throw new Error(`Job not found: ${jobId}`);
        job.status = status;
        if (errorMessage)
            job.errorMessage = errorMessage;
        if (status === 'RUNNING')
            job.startedAt = new Date();
        if (status === 'COMPLETED' || status === 'FAILED' || status === 'DEAD_LETTER') {
            job.completedAt = new Date();
        }
    }
    // Audit Repository
    async recordEvent(event) {
        this.auditEvents.push(JSON.parse(JSON.stringify(event)));
    }
    async listEventsForEntity(orgId, entityType, entityId) {
        return this.auditEvents
            .filter(e => e.orgId === orgId && e.entityType === entityType && e.entityId === entityId)
            .map(e => JSON.parse(JSON.stringify(e)));
    }
    async listEventsForOrg(orgId) {
        return this.auditEvents
            .filter(event => event.orgId === orgId)
            .map(event => JSON.parse(JSON.stringify(event)));
    }
    clear() {
        this.packs.clear();
        this.orders.clear();
        this.products.clear();
        this.analyses.clear();
        this.jobs.clear();
        this.auditEvents = [];
        this.reviewActions = [];
    }
}
exports.InMemoryRepositories = InMemoryRepositories;
//# sourceMappingURL=repositories.js.map