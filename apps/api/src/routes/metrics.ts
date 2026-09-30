import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { InMemoryRepositories } from '@pack-manager/database';
import { PackStatus, OperationalDecision } from '@pack-manager/shared';

export interface MetricsRouteOptions {
  repos: InMemoryRepositories;
}

export const metricsRoutes: FastifyPluginAsync<MetricsRouteOptions> = async (
  fastify: FastifyInstance,
  opts: MetricsRouteOptions
) => {
  const { repos } = opts;

  // GET /api/v1/dashboard/metrics (Section 27 & 29)
  fastify.get('/dashboard/metrics', async (request, reply) => {
    const orgId = request.auth!.orgId;

    const allPacks = await repos.listPacks(orgId);
    const totalPacks = allPacks.length;
    const sealedCount = allPacks.filter(p => p.status === PackStatus.SEAL).length;
    const stopCount = allPacks.filter(p => p.status === PackStatus.STOP_AND_FIX).length;
    const manualReviewCount = allPacks.filter(p => p.status === PackStatus.MANUAL_REVIEW).length;
    const pendingCount = allPacks.filter(
      p => p.status === PackStatus.RECEIVED || p.status === PackStatus.VALIDATING || p.status === PackStatus.ANALYZING || p.status === PackStatus.RECONCILING
    ).length;

    const sealRate = totalPacks > 0 ? Number(((sealedCount / totalPacks) * 100).toFixed(1)) : 0;
    const stopRate = totalPacks > 0 ? Number(((stopCount / totalPacks) * 100).toFixed(1)) : 0;
    const manualReviewRate = totalPacks > 0 ? Number(((manualReviewCount / totalPacks) * 100).toFixed(1)) : 0;
    const latestAnalyses = allPacks
      .map(pack => [...pack.analyses].sort((a, b) => b.analysisNumber - a.analysisNumber)[0])
      .filter((analysis): analysis is NonNullable<typeof analysis> => Boolean(analysis));
    const completedDecisions = latestAnalyses.filter(analysis =>
      analysis.status === 'COMPLETED' && analysis.decision
    );
    const uncertainCount = completedDecisions.filter(
      analysis => analysis.decision === OperationalDecision.UNCERTAIN
    ).length;
    const uncertainRate = completedDecisions.length > 0
      ? Number(((uncertainCount / completedDecisions.length) * 100).toFixed(1))
      : 0;
    const pendingRate = totalPacks > 0
      ? Number(((pendingCount / totalPacks) * 100).toFixed(1))
      : 0;
    const comparableAnalyses = completedDecisions.filter(analysis =>
      (analysis.decision === OperationalDecision.SEAL || analysis.decision === OperationalDecision.STOP_AND_FIX) &&
      Boolean(analysis.expectedItems?.length) &&
      Array.isArray(analysis.detectedItems)
    );
    const allItemsPresentCount = comparableAnalyses.filter(analysis =>
      analysis.expectedItems!.every(expected =>
        (analysis.detectedItems!.find(detected => detected.sku === expected.sku)?.quantity || 0) > 0
      )
    ).length;
    const expectedSkus = (analysis: typeof comparableAnalyses[number]) =>
      new Set(analysis.expectedItems!.map(item => item.sku));
    const quantitiesCorrectCount = comparableAnalyses.filter(analysis => {
      const expected = expectedSkus(analysis);
      return analysis.expectedItems!.every(item =>
        (analysis.detectedItems!.find(detected => detected.sku === item.sku)?.quantity || 0) === item.quantity
      ) && analysis.detectedItems!.every(item => expected.has(item.sku));
    }).length;
    const allItemsPresentRate = comparableAnalyses.length > 0
      ? Number(((allItemsPresentCount / comparableAnalyses.length) * 100).toFixed(1))
      : 0;
    const quantitiesCorrectRate = comparableAnalyses.length > 0
      ? Number(((quantitiesCorrectCount / comparableAnalyses.length) * 100).toFixed(1))
      : 0;

    // Discrepancy statistics
    const discrepancyCounts: Record<string, number> = {};
    let occlusionCount = 0;
    let totalLatencyMs = 0;
    let latencyCount = 0;

    for (const pack of allPacks) {
      const latestAnalysis = [...pack.analyses].sort((a, b) => b.analysisNumber - a.analysisNumber)[0];
      if (latestAnalysis) {
        const hasOcclusion = latestAnalysis.discrepancies.some(disc =>
          disc.type === 'AMBIGUOUS_ITEM' && disc.details?.cause === 'OCCLUSION'
        );
        if (hasOcclusion) occlusionCount++;
      }
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
      uncertainCount,
      uncertainRate,
      completedDecisionCount: completedDecisions.length,
      uncertainRateTarget: 5,
      uncertainRateKillThreshold: 10,
      pendingRate,
      pendingRateTarget: 2,
      allItemsPresentRate,
      quantitiesCorrectRate,
      comparisonSampleCount: comparableAnalyses.length,
      occlusionCount,
      sealRate,
      stopRate,
      manualReviewRate,
      averageLatencyMs,
      manualInterventions: repos.reviewActions.filter(r => r.orgId === orgId).length,
      discrepancyBreakdown: discrepancyCounts,
    });
  });
};
