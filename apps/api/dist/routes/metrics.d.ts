import { FastifyPluginAsync } from 'fastify';
import { InMemoryRepositories } from '@pack-manager/database';
export interface MetricsRouteOptions {
    repos: InMemoryRepositories;
}
export declare const metricsRoutes: FastifyPluginAsync<MetricsRouteOptions>;
//# sourceMappingURL=metrics.d.ts.map