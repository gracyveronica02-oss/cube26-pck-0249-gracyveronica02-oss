import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { InMemoryRepositories } from '@pack-manager/database';
import { UserRole } from '@pack-manager/shared';
import { requireRole } from '../middleware/auth.js';

export interface ProductsRouteOptions {
  repos: InMemoryRepositories;
}

const CreateProductBodySchema = z.object({
  sku: z.string().min(1),
  asin: z.string().optional(),
  productName: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  criticalAttributes: z.array(z.string()).default(['color', 'size']),
  variants: z.array(
    z.object({
      sku: z.string().min(1),
      variantName: z.string().min(1),
      color: z.string().optional(),
      size: z.string().optional(),
      model: z.string().optional(),
      barcode: z.string().optional(),
      attributes: z.record(z.string(), z.string()).default({}),
    })
  ).default([]),
});

export const productsRoutes: FastifyPluginAsync<ProductsRouteOptions> = async (
  fastify: FastifyInstance,
  opts: ProductsRouteOptions
) => {
  const { repos } = opts;

  // GET /api/v1/products
  fastify.get('/products', async (request, reply) => {
    const orgId = request.auth!.orgId;
    const { query } = request.query as { query?: string };

    let products = await repos.listProducts(orgId);
    if (query) {
      const q = query.toLowerCase();
      products = products.filter(
        p => p.sku.toLowerCase().includes(q) || p.productName.toLowerCase().includes(q)
      );
    }

    return reply.send({ products });
  });

  // POST /api/v1/products
  fastify.post(
    '/products',
    { preHandler: [requireRole([UserRole.ADMIN, UserRole.SUPERVISOR])] },
    async (request, reply) => {
      const orgId = request.auth!.orgId;
      const body = CreateProductBodySchema.parse(request.body);

      const existing = await repos.getProductBySku(orgId, body.sku);
      if (existing) {
        return reply.status(409).send({ error: 'PRODUCT_EXISTS', message: `SKU ${body.sku} already exists` });
      }

      const productId = `prod_${Date.now()}`;
      const product = await repos.createProduct({
        productId,
        orgId,
        sku: body.sku,
        asin: body.asin,
        productName: body.productName,
        description: body.description,
        category: body.category,
        brand: body.brand,
        barcode: body.barcode,
        criticalAttributes: body.criticalAttributes,
        referenceImages: [],
        active: true,
        variants: body.variants.map((v, idx) => ({
          variantId: `var_${productId}_${idx + 1}`,
          productId,
          sku: v.sku,
          variantName: v.variantName,
          color: v.color,
          size: v.size,
          model: v.model,
          barcode: v.barcode,
          attributes: v.attributes,
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return reply.status(201).send(product);
    }
  );

  // PUT /api/v1/products/:sku
  fastify.put(
    '/products/:sku',
    { preHandler: [requireRole([UserRole.ADMIN, UserRole.SUPERVISOR])] },
    async (request, reply) => {
      const orgId = request.auth!.orgId;
      const { sku } = request.params as { sku: string };
      const body = CreateProductBodySchema.partial().parse(request.body);

      const existing = await repos.getProductBySku(orgId, sku);
      if (!existing) {
        return reply.status(404).send({ error: 'PRODUCT_NOT_FOUND', message: `SKU ${sku} not found` });
      }

      if (body.productName) existing.productName = body.productName;
      if (body.description) existing.description = body.description;
      if (body.criticalAttributes) existing.criticalAttributes = body.criticalAttributes;
      existing.updatedAt = new Date();

      await repos.createProduct(existing); // Upsert

      return reply.send(existing);
    }
  );
};
