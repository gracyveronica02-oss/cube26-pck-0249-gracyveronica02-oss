import { FastifyPluginAsync } from 'fastify';
import { InMemoryRepositories } from '@pack-manager/database';
export interface ProductsRouteOptions {
    repos: InMemoryRepositories;
}
export declare const productsRoutes: FastifyPluginAsync<ProductsRouteOptions>;
//# sourceMappingURL=products.d.ts.map