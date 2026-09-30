import { FastifyPluginAsync } from 'fastify';
import { InMemoryRepositories, IObjectStorage } from '@pack-manager/database';
export interface AnalysesRouteOptions {
    repos: InMemoryRepositories;
    storage: IObjectStorage;
}
export declare const analysesRoutes: FastifyPluginAsync<AnalysesRouteOptions>;
//# sourceMappingURL=analyses.d.ts.map