import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { InMemoryRepositories } from '@pack-manager/database';

export interface OrdersRouteOptions {
  repos: InMemoryRepositories;
}

const CreateOrderItemSchema = z.object({
  sku: z.string().min(1),
  expectedQuantity: z.number().int().positive(),
  productName: z.string().min(1),
  asin: z.string().optional(),
  referenceImage: z.string().optional(),
  criticalAttributes: z.array(z.string()).default(['color', 'size']),
  attributes: z.record(z.string(), z.string()).default({}),
  orderItemId: z.string().optional(),
});

const CreateOrderBodySchema = z.object({
  orderId: z.string().optional(),
  externalOrderRef: z.string().optional(),
  channel: z.string().default('direct'),
  customerName: z.string().optional(),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
  items: z.array(CreateOrderItemSchema).min(1),
});

const PatchOrderBodySchema = z.object({
  externalOrderRef: z.string().optional(),
  channel: z.string().optional(),
  customerName: z.string().optional(),
  items: z.array(CreateOrderItemSchema).min(1).optional(),
});

export function parseLookupCode(code: string): {
  orderId?: string;
  externalOrderRef?: string;
  unitId?: string;
  packingStation?: string;
  raw: string;
} {
  const raw = code.trim();
  if (!raw) return { raw };
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
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
  } catch {
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
      if (orderId || externalOrderRef) return { orderId: orderId || undefined, externalOrderRef: externalOrderRef || undefined, unitId, packingStation, raw };
    } catch {
      // Treat non-URL payloads as plain order references.
    }
  }
  return { orderId: raw, externalOrderRef: raw, raw };
}

async function findOrderByLookup(
  repos: InMemoryRepositories,
  orgId: string,
  parsed: ReturnType<typeof parseLookupCode>
) {
  if (parsed.orderId) {
    const byId = await repos.getOrderById(orgId, parsed.orderId);
    if (byId) return byId;
  }
  if (parsed.externalOrderRef) {
    const byRef = await repos.getOrderByExternalRef(orgId, parsed.externalOrderRef);
    if (byRef) return byRef;
  }
  return null;
}

export const ordersRoutes: FastifyPluginAsync<OrdersRouteOptions> = async (
  fastify: FastifyInstance,
  opts: OrdersRouteOptions
) => {
  const { repos } = opts;

  // GET /api/v1/orders/lookup?code=  (register before /orders/:orderId)
  fastify.get('/orders/lookup', async (request, reply) => {
    const orgId = request.auth!.orgId;
    const { code } = request.query as { code?: string };
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
    const orgId = request.auth!.orgId;
    const { q } = request.query as { q?: string };
    let orders = await repos.listOrders(orgId);

    if (q && q.trim()) {
      const needle = q.trim().toLowerCase();
      orders = orders.filter(
        (o) =>
          o.orderId.toLowerCase().includes(needle) ||
          (o.externalOrderRef || '').toLowerCase().includes(needle)
      );
    }

    return reply.send({ total: orders.length, orders });
  });

  // GET /api/v1/orders/:orderId
  fastify.get('/orders/:orderId', async (request, reply) => {
    const orgId = request.auth!.orgId;
    const { orderId } = request.params as { orderId: string };

    const order = await repos.getOrderById(orgId, orderId);
    if (!order) {
      return reply.status(404).send({ error: 'ORDER_NOT_FOUND', message: `Order ${orderId} not found` });
    }

    return reply.send(order);
  });

  // PATCH /api/v1/orders/:orderId
  fastify.patch('/orders/:orderId', async (request, reply) => {
    const orgId = request.auth!.orgId;
    const { orderId } = request.params as { orderId: string };
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
    const orgId = request.auth!.orgId;
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
