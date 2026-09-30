"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsRoutes = void 0;
const zod_1 = require("zod");
const shared_1 = require("@pack-manager/shared");
const auth_js_1 = require("../middleware/auth.js");
const CreateProductBodySchema = zod_1.z.object({
    sku: zod_1.z.string().min(1),
    asin: zod_1.z.string().optional(),
    productName: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    brand: zod_1.z.string().optional(),
    barcode: zod_1.z.string().optional(),
    criticalAttributes: zod_1.z.array(zod_1.z.string()).default(['color', 'size']),
    variants: zod_1.z.array(zod_1.z.object({
        sku: zod_1.z.string().min(1),
        variantName: zod_1.z.string().min(1),
        color: zod_1.z.string().optional(),
        size: zod_1.z.string().optional(),
        model: zod_1.z.string().optional(),
        barcode: zod_1.z.string().optional(),
        attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).default({}),
    })).default([]),
});
const productsRoutes = async (fastify, opts) => {
    const { repos } = opts;
    // GET /api/v1/products
    fastify.get('/products', async (request, reply) => {
        const orgId = request.auth.orgId;
        const { query } = request.query;
        let products = await repos.listProducts(orgId);
        if (query) {
            const q = query.toLowerCase();
            products = products.filter(p => p.sku.toLowerCase().includes(q) || p.productName.toLowerCase().includes(q));
        }
        return reply.send({ products });
    });
    // POST /api/v1/products
    fastify.post('/products', { preHandler: [(0, auth_js_1.requireRole)([shared_1.UserRole.ADMIN, shared_1.UserRole.SUPERVISOR])] }, async (request, reply) => {
        const orgId = request.auth.orgId;
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
    });
    // PUT /api/v1/products/:sku
    fastify.put('/products/:sku', { preHandler: [(0, auth_js_1.requireRole)([shared_1.UserRole.ADMIN, shared_1.UserRole.SUPERVISOR])] }, async (request, reply) => {
        const orgId = request.auth.orgId;
        const { sku } = request.params;
        const body = CreateProductBodySchema.partial().parse(request.body);
        const existing = await repos.getProductBySku(orgId, sku);
        if (!existing) {
            return reply.status(404).send({ error: 'PRODUCT_NOT_FOUND', message: `SKU ${sku} not found` });
        }
        if (body.productName)
            existing.productName = body.productName;
        if (body.description)
            existing.description = body.description;
        if (body.criticalAttributes)
            existing.criticalAttributes = body.criticalAttributes;
        existing.updatedAt = new Date();
        await repos.createProduct(existing); // Upsert
        return reply.send(existing);
    });
};
exports.productsRoutes = productsRoutes;
//# sourceMappingURL=products.js.map