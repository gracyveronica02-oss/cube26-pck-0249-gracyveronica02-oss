"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qcRoutes = void 0;
const shared_1 = require("@pack-manager/shared");
const qcRoutes = async (fastify, opts) => {
    const { repos } = opts;
    // GET /api/v1/qc/queue (QC Queue for STOP_AND_FIX and MANUAL_REVIEW packs)
    fastify.get('/qc/queue', async (request, reply) => {
        const orgId = request.auth.orgId;
        const stopPacks = await repos.listPacks(orgId, shared_1.PackStatus.STOP_AND_FIX);
        const reviewPacks = await repos.listPacks(orgId, shared_1.PackStatus.MANUAL_REVIEW);
        const queuePacks = [...stopPacks, ...reviewPacks];
        const queueItems = await Promise.all(queuePacks.map(async (pack) => {
            const order = await repos.getOrderById(orgId, pack.orderId);
            const analyses = await repos.listAnalysesForPack(orgId, pack.packId);
            const latestAnalysis = analyses[analyses.length - 1];
            const waitTimeMinutes = Math.floor((Date.now() - new Date(pack.updatedAt).getTime()) / 60000);
            return {
                packId: pack.packId,
                unitId: pack.unitId,
                orderId: pack.orderId,
                channel: order?.channel || 'direct',
                packingStation: pack.packingStation,
                operatorId: pack.operatorId,
                status: pack.status,
                waitTimeMinutes,
                discrepancies: latestAnalysis?.discrepancies || [],
                latestAnalysisId: latestAnalysis?.analysisId,
                photoCount: pack.images.length,
                updatedAt: pack.updatedAt,
            };
        }));
        // Sort by longest wait time first (highest priority)
        queueItems.sort((a, b) => b.waitTimeMinutes - a.waitTimeMinutes);
        return reply.send({
            totalCount: queueItems.length,
            items: queueItems,
        });
    });
};
exports.qcRoutes = qcRoutes;
//# sourceMappingURL=qc.js.map