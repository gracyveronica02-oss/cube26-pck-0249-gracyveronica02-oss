"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysesRoutes = void 0;
const zod_1 = require("zod");
const shared_1 = require("@pack-manager/shared");
const auth_js_1 = require("../middleware/auth.js");
const ReviewBodySchema = zod_1.z.object({
    action: zod_1.z.enum(['APPROVED_OVERRIDE', 'REJECTED_REPACK', 'RESCAN_REQUESTED']),
    operatorVerdict: zod_1.z.nativeEnum(shared_1.OperationalDecision),
    reasonCode: zod_1.z.string().min(1),
    notes: zod_1.z.string().optional(),
});
const analysesRoutes = async (fastify, opts) => {
    const { repos, storage } = opts;
    // GET /api/v1/packs/:packId/analyses (Section 19: All historical runs)
    fastify.get('/packs/:packId/analyses', async (request, reply) => {
        const orgId = request.auth.orgId;
        const { packId } = request.params;
        const analyses = await repos.listAnalysesForPack(orgId, packId);
        return reply.send({
            packId,
            analyses,
        });
    });
    // GET /api/v1/analyses/:analysisId (Section 16: Complete Evidence Dossier)
    fastify.get('/analyses/:analysisId', async (request, reply) => {
        const orgId = request.auth.orgId;
        const { analysisId } = request.params;
        const analysis = await repos.getAnalysisById(orgId, analysisId);
        if (!analysis) {
            return reply.status(404).send({ error: 'ANALYSIS_NOT_FOUND', message: `Analysis ${analysisId} not found` });
        }
        const pack = await repos.getPackById(orgId, analysis.packId);
        const order = pack ? await repos.getOrderById(orgId, pack.orderId) : null;
        // Attach presigned URLs to detection crops
        const detectionsWithUrls = await Promise.all(analysis.detections.map(async (d) => ({
            ...d,
            cropUrl: d.cropStoragePath ? await storage.getPresignedUrl(d.cropStoragePath).catch(() => undefined) : undefined,
        })));
        return reply.send({
            analysis: {
                ...analysis,
                detections: detectionsWithUrls,
            },
            pack,
            order,
        });
    });
    // POST /api/v1/analyses/:analysisId/review (Section 18: QC operator override)
    fastify.post('/analyses/:analysisId/review', { preHandler: [(0, auth_js_1.requireRole)([shared_1.UserRole.SUPERVISOR, shared_1.UserRole.ADMIN, shared_1.UserRole.QC_OPERATOR])] }, async (request, reply) => {
        const orgId = request.auth.orgId;
        const { analysisId } = request.params;
        const body = ReviewBodySchema.parse(request.body);
        const analysis = await repos.getAnalysisById(orgId, analysisId);
        if (!analysis) {
            return reply.status(404).send({ error: 'ANALYSIS_NOT_FOUND', message: `Analysis ${analysisId} not found` });
        }
        const reviewRecord = {
            reviewId: `rev_${Date.now()}`,
            orgId,
            packId: analysis.packId,
            analysisId,
            operatorId: request.auth.userId,
            action: body.action,
            operatorVerdict: body.operatorVerdict,
            reasonCode: body.reasonCode,
            notes: body.notes,
            createdAt: new Date(),
        };
        repos.reviewActions.push(reviewRecord);
        // Record audit event
        await repos.recordEvent({
            auditId: `aud_rev_${Date.now()}`,
            orgId,
            entityType: 'ANALYSIS',
            entityId: analysisId,
            actorId: request.auth.userId,
            action: 'OPERATOR_REVIEW',
            previousState: { decision: analysis.decision },
            newState: { operatorVerdict: body.operatorVerdict, action: body.action, reason: body.reasonCode },
            createdAt: new Date(),
        });
        return reply.status(201).send(reviewRecord);
    });
    // GET /api/v1/audits (Retrieve immutable audit trail)
    fastify.get('/audits', async (request, reply) => {
        const orgId = request.auth.orgId;
        const query = request.query;
        let events = repos.auditEvents.filter(e => e.orgId === orgId);
        if (query.entityId) {
            events = events.filter(e => e.entityId === query.entityId);
        }
        if (query.entityType) {
            events = events.filter(e => e.entityType === query.entityType);
        }
        if (query.actorId) {
            events = events.filter(e => e.actorId === query.actorId);
        }
        const limit = query.limit ? parseInt(query.limit, 10) : 50;
        return reply.send({
            total: events.length,
            events: events.slice(-limit).reverse(),
        });
    });
};
exports.analysesRoutes = analysesRoutes;
//# sourceMappingURL=analyses.js.map