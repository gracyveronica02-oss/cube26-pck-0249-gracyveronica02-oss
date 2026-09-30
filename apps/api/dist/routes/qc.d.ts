import { FastifyPluginAsync } from 'fastify';
import { InMemoryRepositories } from '@pack-manager/database';
export interface QCRouteOptions {
    repos: InMemoryRepositories;
}
export declare const qcRoutes: FastifyPluginAsync<QCRouteOptions>;
//# sourceMappingURL=qc.d.ts.map