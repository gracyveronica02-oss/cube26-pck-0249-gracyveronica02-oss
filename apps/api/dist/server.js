"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildServer = buildServer;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const database_1 = require("@pack-manager/database");
const vision_1 = require("@pack-manager/vision");
const worker_1 = require("@pack-manager/worker");
const auth_js_1 = require("./middleware/auth.js");
const idempotency_js_1 = require("./middleware/idempotency.js");
const packs_js_1 = require("./routes/packs.js");
const analyses_js_1 = require("./routes/analyses.js");
const products_js_1 = require("./routes/products.js");
const orders_js_1 = require("./routes/orders.js");
const webhooks_js_1 = require("./routes/webhooks.js");
const qc_js_1 = require("./routes/qc.js");
const metrics_js_1 = require("./routes/metrics.js");
const health_js_1 = require("./routes/health.js");
function buildServer(options) {
    const fastify = (0, fastify_1.default)({
        logger: false,
    });
    const repos = options?.repos || new database_1.InMemoryRepositories();
    const storage = options?.storage || new database_1.InMemoryObjectStorage();
    const visionProvider = options?.visionProvider || new vision_1.MockVisionProvider();
    const webhookDispatcher = options?.webhookDispatcher || new worker_1.WebhookDispatcher();
    const pipeline = new worker_1.PackVerificationPipeline({
        packRepo: repos,
        orderRepo: repos,
        productRepo: repos,
        analysisRepo: repos,
        jobRepo: repos,
        auditRepo: repos,
        storage,
        visionProvider,
        webhookDispatcher,
    });
    const queue = options?.queue || new worker_1.InMemoryWorkerQueue(pipeline, 3, true);
    // Register CORS
    fastify.register(cors_1.default, {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    });
    // Register OpenAPI Documentation
    fastify.register(swagger_1.default, {
        openapi: {
            info: {
                title: 'AI Outbound Pack Manager API',
                description: 'High-precision computer vision outbound order verification system',
                version: '1.0.0',
            },
            servers: [{ url: 'http://localhost:4000' }],
        },
    });
    fastify.register(swagger_ui_1.default, {
        routePrefix: '/documentation',
    });
    // Global Middlewares
    fastify.addHook('preHandler', auth_js_1.authMiddleware);
    fastify.addHook('preHandler', idempotency_js_1.idempotencyMiddleware);
    // Register Health Routes
    fastify.register(health_js_1.healthRoutes);
    // Register Core API v1 Routes
    fastify.register(async (apiV1) => {
        apiV1.register(packs_js_1.packsRoutes, { repos, storage, queue });
        apiV1.register(analyses_js_1.analysesRoutes, { repos, storage });
        apiV1.register(products_js_1.productsRoutes, { repos });
        apiV1.register(orders_js_1.ordersRoutes, { repos });
        apiV1.register(webhooks_js_1.webhooksRoutes, { webhookDispatcher });
        apiV1.register(qc_js_1.qcRoutes, { repos });
        apiV1.register(metrics_js_1.metricsRoutes, { repos });
    }, { prefix: '/api/v1' });
    return fastify;
}
//# sourceMappingURL=server.js.map