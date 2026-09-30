"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultAppConfig = exports.AppConfigSchema = exports.WorkerConfigSchema = exports.ThresholdsConfigSchema = void 0;
exports.createConfig = createConfig;
const zod_1 = require("zod");
exports.ThresholdsConfigSchema = zod_1.z.object({
    minDetectionConfidence: zod_1.z.number().min(0).max(1).default(0.85),
    minSKUMatchConfidence: zod_1.z.number().min(0).max(1).default(0.90),
    minAttributeConfidence: zod_1.z.number().min(0).max(1).default(0.85),
    minOverallConfidence: zod_1.z.number().min(0).max(1).default(0.88),
    minImageWidth: zod_1.z.number().int().positive().default(1280),
    minImageHeight: zod_1.z.number().int().positive().default(720),
    minLaplacianBlurScore: zod_1.z.number().positive().default(100.0),
    maxExposureSaturationPercent: zod_1.z.number().min(0).max(1).default(0.35),
    minIoUForSameItemCluster: zod_1.z.number().min(0).max(1).default(0.50),
    minVisualEmbeddingSimilarity: zod_1.z.number().min(0).max(1).default(0.88),
});
exports.WorkerConfigSchema = zod_1.z.object({
    jobTimeoutMs: zod_1.z.number().int().positive().default(60000),
    maxRetries: zod_1.z.number().int().nonnegative().default(3),
    backoffDelayMs: zod_1.z.number().int().positive().default(2000),
    concurrency: zod_1.z.number().int().positive().default(5),
});
exports.AppConfigSchema = zod_1.z.object({
    environment: zod_1.z.enum(['development', 'test', 'staging', 'production']).default('development'),
    port: zod_1.z.number().int().default(4000),
    thresholds: exports.ThresholdsConfigSchema.default({}),
    worker: exports.WorkerConfigSchema.default({}),
    webhook: zod_1.z.object({
        maxRetries: zod_1.z.number().int().default(5),
        retryBackoffMs: zod_1.z.number().int().default(1000),
        signatureHeader: zod_1.z.string().default('x-packmanager-signature-256'),
    }).default({}),
});
exports.DefaultAppConfig = exports.AppConfigSchema.parse({});
function createConfig(overrides) {
    return exports.AppConfigSchema.parse(overrides || {});
}
//# sourceMappingURL=index.js.map