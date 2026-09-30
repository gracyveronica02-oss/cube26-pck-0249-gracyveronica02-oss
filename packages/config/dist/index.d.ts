import { z } from 'zod';
export declare const ThresholdsConfigSchema: z.ZodObject<{
    minDetectionConfidence: z.ZodDefault<z.ZodNumber>;
    minSKUMatchConfidence: z.ZodDefault<z.ZodNumber>;
    minAttributeConfidence: z.ZodDefault<z.ZodNumber>;
    minOverallConfidence: z.ZodDefault<z.ZodNumber>;
    minImageWidth: z.ZodDefault<z.ZodNumber>;
    minImageHeight: z.ZodDefault<z.ZodNumber>;
    minLaplacianBlurScore: z.ZodDefault<z.ZodNumber>;
    maxExposureSaturationPercent: z.ZodDefault<z.ZodNumber>;
    minIoUForSameItemCluster: z.ZodDefault<z.ZodNumber>;
    minVisualEmbeddingSimilarity: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    minDetectionConfidence: number;
    minSKUMatchConfidence: number;
    minAttributeConfidence: number;
    minOverallConfidence: number;
    minImageWidth: number;
    minImageHeight: number;
    minLaplacianBlurScore: number;
    maxExposureSaturationPercent: number;
    minIoUForSameItemCluster: number;
    minVisualEmbeddingSimilarity: number;
}, {
    minDetectionConfidence?: number | undefined;
    minSKUMatchConfidence?: number | undefined;
    minAttributeConfidence?: number | undefined;
    minOverallConfidence?: number | undefined;
    minImageWidth?: number | undefined;
    minImageHeight?: number | undefined;
    minLaplacianBlurScore?: number | undefined;
    maxExposureSaturationPercent?: number | undefined;
    minIoUForSameItemCluster?: number | undefined;
    minVisualEmbeddingSimilarity?: number | undefined;
}>;
export type ThresholdsConfig = z.infer<typeof ThresholdsConfigSchema>;
export declare const WorkerConfigSchema: z.ZodObject<{
    jobTimeoutMs: z.ZodDefault<z.ZodNumber>;
    maxRetries: z.ZodDefault<z.ZodNumber>;
    backoffDelayMs: z.ZodDefault<z.ZodNumber>;
    concurrency: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    jobTimeoutMs: number;
    maxRetries: number;
    backoffDelayMs: number;
    concurrency: number;
}, {
    jobTimeoutMs?: number | undefined;
    maxRetries?: number | undefined;
    backoffDelayMs?: number | undefined;
    concurrency?: number | undefined;
}>;
export type WorkerConfig = z.infer<typeof WorkerConfigSchema>;
export declare const AppConfigSchema: z.ZodObject<{
    environment: z.ZodDefault<z.ZodEnum<["development", "test", "staging", "production"]>>;
    port: z.ZodDefault<z.ZodNumber>;
    thresholds: z.ZodDefault<z.ZodObject<{
        minDetectionConfidence: z.ZodDefault<z.ZodNumber>;
        minSKUMatchConfidence: z.ZodDefault<z.ZodNumber>;
        minAttributeConfidence: z.ZodDefault<z.ZodNumber>;
        minOverallConfidence: z.ZodDefault<z.ZodNumber>;
        minImageWidth: z.ZodDefault<z.ZodNumber>;
        minImageHeight: z.ZodDefault<z.ZodNumber>;
        minLaplacianBlurScore: z.ZodDefault<z.ZodNumber>;
        maxExposureSaturationPercent: z.ZodDefault<z.ZodNumber>;
        minIoUForSameItemCluster: z.ZodDefault<z.ZodNumber>;
        minVisualEmbeddingSimilarity: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        minDetectionConfidence: number;
        minSKUMatchConfidence: number;
        minAttributeConfidence: number;
        minOverallConfidence: number;
        minImageWidth: number;
        minImageHeight: number;
        minLaplacianBlurScore: number;
        maxExposureSaturationPercent: number;
        minIoUForSameItemCluster: number;
        minVisualEmbeddingSimilarity: number;
    }, {
        minDetectionConfidence?: number | undefined;
        minSKUMatchConfidence?: number | undefined;
        minAttributeConfidence?: number | undefined;
        minOverallConfidence?: number | undefined;
        minImageWidth?: number | undefined;
        minImageHeight?: number | undefined;
        minLaplacianBlurScore?: number | undefined;
        maxExposureSaturationPercent?: number | undefined;
        minIoUForSameItemCluster?: number | undefined;
        minVisualEmbeddingSimilarity?: number | undefined;
    }>>;
    worker: z.ZodDefault<z.ZodObject<{
        jobTimeoutMs: z.ZodDefault<z.ZodNumber>;
        maxRetries: z.ZodDefault<z.ZodNumber>;
        backoffDelayMs: z.ZodDefault<z.ZodNumber>;
        concurrency: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        jobTimeoutMs: number;
        maxRetries: number;
        backoffDelayMs: number;
        concurrency: number;
    }, {
        jobTimeoutMs?: number | undefined;
        maxRetries?: number | undefined;
        backoffDelayMs?: number | undefined;
        concurrency?: number | undefined;
    }>>;
    webhook: z.ZodDefault<z.ZodObject<{
        maxRetries: z.ZodDefault<z.ZodNumber>;
        retryBackoffMs: z.ZodDefault<z.ZodNumber>;
        signatureHeader: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        maxRetries: number;
        retryBackoffMs: number;
        signatureHeader: string;
    }, {
        maxRetries?: number | undefined;
        retryBackoffMs?: number | undefined;
        signatureHeader?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    environment: "development" | "test" | "staging" | "production";
    port: number;
    thresholds: {
        minDetectionConfidence: number;
        minSKUMatchConfidence: number;
        minAttributeConfidence: number;
        minOverallConfidence: number;
        minImageWidth: number;
        minImageHeight: number;
        minLaplacianBlurScore: number;
        maxExposureSaturationPercent: number;
        minIoUForSameItemCluster: number;
        minVisualEmbeddingSimilarity: number;
    };
    worker: {
        jobTimeoutMs: number;
        maxRetries: number;
        backoffDelayMs: number;
        concurrency: number;
    };
    webhook: {
        maxRetries: number;
        retryBackoffMs: number;
        signatureHeader: string;
    };
}, {
    environment?: "development" | "test" | "staging" | "production" | undefined;
    port?: number | undefined;
    thresholds?: {
        minDetectionConfidence?: number | undefined;
        minSKUMatchConfidence?: number | undefined;
        minAttributeConfidence?: number | undefined;
        minOverallConfidence?: number | undefined;
        minImageWidth?: number | undefined;
        minImageHeight?: number | undefined;
        minLaplacianBlurScore?: number | undefined;
        maxExposureSaturationPercent?: number | undefined;
        minIoUForSameItemCluster?: number | undefined;
        minVisualEmbeddingSimilarity?: number | undefined;
    } | undefined;
    worker?: {
        jobTimeoutMs?: number | undefined;
        maxRetries?: number | undefined;
        backoffDelayMs?: number | undefined;
        concurrency?: number | undefined;
    } | undefined;
    webhook?: {
        maxRetries?: number | undefined;
        retryBackoffMs?: number | undefined;
        signatureHeader?: string | undefined;
    } | undefined;
}>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
export declare const DefaultAppConfig: AppConfig;
export declare function createConfig(overrides?: Partial<AppConfig>): AppConfig;
//# sourceMappingURL=index.d.ts.map