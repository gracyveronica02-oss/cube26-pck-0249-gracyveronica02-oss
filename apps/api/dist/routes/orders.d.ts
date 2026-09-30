import { FastifyPluginAsync } from 'fastify';
import { InMemoryRepositories } from '@pack-manager/database';
export interface OrdersRouteOptions {
    repos: InMemoryRepositories;
}
export declare function parseLookupCode(code: string): {
    orderId?: string;
    externalOrderRef?: string;
    unitId?: string;
    packingStation?: string;
    raw: string;
};
export declare const ordersRoutes: FastifyPluginAsync<OrdersRouteOptions>;
//# sourceMappingURL=orders.d.ts.map