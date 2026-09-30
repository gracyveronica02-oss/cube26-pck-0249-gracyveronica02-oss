import { z } from 'zod';

export const ThresholdsConfigSchema = z.object({
  minDetectionConfidence: z.number().min(0).max(1).default(0.85),
  minSKUMatchConfidence: z.number().min(0).max(1).default(0.90),
  minAttributeConfidence: z.number().min(0).max(1).default(0.85),
  minOverallConfidence: z.number().min(0).max(1).default(0.88),
  minImageWidth: z.number().int().positive().default(1280),
  minImageHeight: z.number().int().positive().default(720),
  minLaplacianBlurScore: z.number().positive().default(100.0),
  maxExposureSaturationPercent: z.number().min(0).max(1).default(0.35),
  minIoUForSameItemCluster: z.number().min(0).max(1).default(0.50),
  minVisualEmbeddingSimilarity: z.number().min(0).max(1).default(0.88),
});

export type ThresholdsConfig = z.infer<typeof ThresholdsConfigSchema>;

export const WorkerConfigSchema = z.object({
  jobTimeoutMs: z.number().int().positive().default(60000),
  maxRetries: z.number().int().nonnegative().default(3),
  backoffDelayMs: z.number().int().positive().default(2000),
  concurrency: z.number().int().positive().default(5),
});

export type WorkerConfig = z.infer<typeof WorkerConfigSchema>;

export const AppConfigSchema = z.object({
  environment: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  port: z.number().int().default(4000),
  thresholds: ThresholdsConfigSchema.default({}),
  worker: WorkerConfigSchema.default({}),
  webhook: z.object({
    maxRetries: z.number().int().default(5),
    retryBackoffMs: z.number().int().default(1000),
    signatureHeader: z.string().default('x-packmanager-signature-256'),
  }).default({}),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const DefaultAppConfig: AppConfig = AppConfigSchema.parse({});

export function createConfig(overrides?: Partial<AppConfig>): AppConfig {
  return AppConfigSchema.parse(overrides || {});
}
