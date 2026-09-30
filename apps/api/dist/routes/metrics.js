"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsRoutes = void 0;
const shared_1 = require("@pack-manager/shared");
const metricsRoutes = async (fastify, opts) => {
    const { repos } = opts;
    // GET /api/v1/dashboard/metrics (Section 27 & 29)
    fastify.get('/dashboard/metrics', async (request, reply) => {
        const orgId = request.auth.orgId;
        const allPacks = await repos.listPacks(orgId);
        const totalPacks = allPacks.length;
        const sealedCount = allPacks.filter(p => p.status === shared_1.PackStatus.SEAL).length;
        const stopCount = allPacks.filter(p => p.status === shared_1.PackStatus.STOP_AND_FIX).length;
        const manualReviewCount = allPacks.filter(p => p.status === shared_1.PackStatus.MANUAL_REVIEW).length;
        const pendingCount = allPacks.filter(p => p.status === shared_1.PackStatus.RECEIVED || p.status === shared_1.PackStatus.VALIDATING || p.status === shared_1.PackStatus.ANALYZING || p.status === shared_1.PackStatus.RECONCILING).length;
        const sealRate = totalPacks > 0 ? Number(((sealedCount / totalPacks) * 100).toFixed(1)) : 0;
        const stopRate = totalPacks > 0 ? Number(((stopCount / totalPacks) * 100).toFixed(1)) : 0;
        const manualReviewRate = totalPacks > 0 ? Number(((manualReviewCount / totalPacks) * 100).toFixed(1)) : 0;
        // Discrepancy statistics
        const discrepancyCounts = {};
        let totalLatencyMs = 0;
        let latencyCount = 0;
        for (const pack of allPacks) {
            for (const anl of pack.analyses) {
                if (anl.executionTimeMs) {
                    totalLatencyMs += anl.executionTimeMs;
                    latencyCount++;
                }
                for (const disc of anl.discrepancies) {
                    discrepancyCounts[disc.type] = (discrepancyCounts[disc.type] || 0) + 1;
                }
            }
        }
        const averageLatencyMs = latencyCount > 0 ? Math.round(totalLatencyMs / latencyCount) : 0;
        return reply.send({
            totalPacks,
            sealedCount,
            stopCount,
            manualReviewCount,
            pendingCount,
            sealRate,
            stopRate,
            manualReviewRate,
            averageLatencyMs,
            manualInterventions: repos.reviewActions.filter(r => r.orgId === orgId).length,
            discrepancyBreakdown: discrepancyCounts,
        });
    });
};
exports.metricsRoutes = metricsRoutes;
//# sourceMappingURL=metrics.js.map