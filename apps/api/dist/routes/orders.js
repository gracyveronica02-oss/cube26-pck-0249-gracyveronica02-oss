"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ordersRoutes = void 0;
exports.parseLookupCode = parseLookupCode;
const zod_1 = require("zod");
const CreateOrderItemSchema = zod_1.z.object({
    sku: zod_1.z.string().min(1),
    expectedQuantity: zod_1.z.number().int().positive(),
    productName: zod_1.z.string().min(1),
    asin: zod_1.z.string().optional(),
    referenceImage: zod_1.z.string().optional(),
    criticalAttributes: zod_1.z.array(zod_1.z.string()).default(['color', 'size']),
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).default({}),
    orderItemId: zod_1.z.string().optional(),
});
const CreateOrderBodySchema = zod_1.z.object({
    orderId: zod_1.z.string().optional(),
    externalOrderRef: zod_1.z.string().optional(),
    channel: zod_1.z.string().default('direct'),
    customerName: zod_1.z.string().optional(),
    shippingAddress: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    items: zod_1.z.array(CreateOrderItemSchema).min(1),
});
const PatchOrderBodySchema = zod_1.z.object({
    externalOrderRef: zod_1.z.string().optional(),
    channel: zod_1.z.string().optional(),
    customerName: zod_1.z.string().optional(),
    items: zod_1.z.array(CreateOrderItemSchema).min(1).optional(),
});
function parseLookupCode(code) {
    const raw = code.trim();
    if (!raw)
        return { raw };
    try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            return {
                orderId: typeof obj.orderId === 'string'
                    ? obj.orderId
                    : typeof obj.order_id === 'string'
                        ? obj.order_id
                        : undefined,
                externalOrderRef: typeof obj.externalOrderRef === 'string' ? obj.externalOrderRef : undefined,
                unitId: typeof obj.unitId === 'string'
                    ? obj.unitId
                    : typeof obj.cartonLpn === 'string'
                        ? obj.cartonLpn
                        : typeof obj.cartonId === 'string'
                            ? obj.cartonId
                            : typeof obj.lpn === 'string'
                                ? obj.lpn
                                : undefined,
                packingStation: typeof obj.packingStation === 'string' ? obj.packingStation : undefined,
                raw,
            };
        }
    }
    catch {
        try {
            const url = new URL(raw);
            const orderId = url.searchParams.get('orderId') || url.searchParams.get('order_id');
            const externalOrderRef = url.searchParams.get('externalOrderRef') || url.searchParams.get('ref');
            const unitId = url.searchParams.get('unitId')
                || url.searchParams.get('cartonLpn')
                || url.searchParams.get('cartonId')
                || url.searchParams.get('lpn')
                || undefined;
            const packingStation = url.searchParams.get('packingStation') || undefined;
            if (orderId || externalOrderRef)
                return { orderId: orderId || undefined, externalOrderRef: externalOrderRef || undefined, unitId, packingStation, raw };
        }
        catch {
            // Treat non-URL payloads as plain order references.
        }
    }
    return { orderId: raw, externalOrderRef: raw, raw };
}
async function findOrderByLookup(repos, orgId, parsed) {
    if (parsed.orderId) {
        const byId = await repos.getOrderById(orgId, parsed.orderId);
        if (byId)
            return byId;
    }
    if (parsed.externalOrderRef) {
        const byRef = await repos.getOrderByExternalRef(orgId, parsed.externalOrderRef);
        if (byRef)
            return byRef;
    }
    return null;
}
const ordersRoutes = async (fastify, opts) => {
    const { repos } = opts;
    // GET /api/v1/orders/lookup?code=  (register before /orders/:orderId)
    fastify.get('/orders/lookup', async (request, reply) => {
        const orgId = request.auth.orgId;
        const { code } = request.query;
        if (!code || !code.trim()) {
            return reply.status(400).send({ error: 'MISSING_CODE', message: 'Query param code is required' });
        }
        const parsed = parseLookupCode(code);
        const order = await findOrderByLookup(repos, orgId, parsed);
        if (!order) {
            return reply.status(404).send({
                error: 'ORDER_NOT_FOUND',
                message: `No order matched code ${code}`,
                parsed,
            });
        }
        return reply.send({ order, unitId: parsed.unitId, packingStation: parsed.packingStation, parsed });
    });
    // GET /api/v1/orders?q=
    fastify.get('/orders', async (request, reply) => {
        const orgId = request.auth.orgId;
        const { q } = request.query;
        let orders = await repos.listOrders(orgId);
        if (q && q.trim()) {
            const needle = q.trim().toLowerCase();
            orders = orders.filter((o) => o.orderId.toLowerCase().includes(needle) ||
                (o.externalOrderRef || '').toLowerCase().includes(needle));
        }
        return reply.send({ total: orders.length, orders });
    });
    // GET /api/v1/orders/:orderId
    fastify.get('/orders/:orderId', async (request, reply) => {
        const orgId = request.auth.orgId;
        const { orderId } = request.params;
        const order = await repos.getOrderById(orgId, orderId);
        if (!order) {
            return reply.status(404).send({ error: 'ORDER_NOT_FOUND', message: `Order ${orderId} not found` });
        }
        return reply.send(order);
    });
    // PATCH /api/v1/orders/:orderId
    fastify.patch('/orders/:orderId', async (request, reply) => {
        const orgId = request.auth.orgId;
        const { orderId } = request.params;
        const body = PatchOrderBodySchema.parse(request.body);
        const updated = await repos.updateOrder(orgId, orderId, {
            externalOrderRef: body.externalOrderRef,
            channel: body.channel,
            customerName: body.customerName,
            items: body.items?.map((item, idx) => ({
                orderItemId: item.orderItemId || `item_${orderId}_${idx + 1}`,
                orderId,
                sku: item.sku,
                expectedQuantity: item.expectedQuantity,
                productName: item.productName,
                asin: item.asin,
                referenceImage: item.referenceImage,
                criticalAttributes: item.criticalAttributes,
                attributes: item.attributes,
            })),
        });
        if (!updated) {
            return reply.status(404).send({ error: 'ORDER_NOT_FOUND', message: `Order ${orderId} not found` });
        }
        return reply.send(updated);
    });
    // POST /api/v1/orders
    fastify.post('/orders', async (request, reply) => {
        const orgId = request.auth.orgId;
        const body = CreateOrderBodySchema.parse(request.body);
        const orderId = body.orderId || `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
        const existing = await repos.getOrderById(orgId, orderId);
        if (existing) {
            return reply.status(409).send({ error: 'ORDER_EXISTS', message: `Order ${orderId} already exists` });
        }
        const order = await repos.createOrder({
            orderId,
            orgId,
            externalOrderRef: body.externalOrderRef || orderId,
            channel: body.channel,
            customerName: body.customerName,
            shippingAddress: body.shippingAddress,
            createdAt: new Date(),
            items: body.items.map((item, idx) => ({
                orderItemId: `item_${orderId}_${idx + 1}`,
                orderId,
                sku: item.sku,
                expectedQuantity: item.expectedQuantity,
                productName: item.productName,
                asin: item.asin,
                referenceImage: item.referenceImage,
                criticalAttributes: item.criticalAttributes,
                attributes: item.attributes,
            })),
        });
        return reply.status(201).send(order);
    });
};
exports.ordersRoutes = ordersRoutes;
//# sourceMappingURL=orders.js.map