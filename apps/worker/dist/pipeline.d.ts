import { AppConfig } from '@pack-manager/config';
import { IPackRepository, IOrderRepository, IProductRepository, IAnalysisRepository, IJobRepository, IAuditRepository, IObjectStorage } from '@pack-manager/database';
import { AnalysisResultDTO } from '@pack-manager/shared';
import { VisionProvider } from '@pack-manager/vision';
import { WebhookDispatcher } from './webhook.js';
export interface PipelineDependencies {
    packRepo: IPackRepository;
    orderRepo: IOrderRepository;
    productRepo: IProductRepository;
    analysisRepo: IAnalysisRepository;
    jobRepo: IJobRepository;
    auditRepo: IAuditRepository;
    storage: IObjectStorage;
    visionProvider: VisionProvider;
    webhookDispatcher?: WebhookDispatcher;
    config?: AppConfig;
}
export interface PipelineExecutionOptions {
    orgId: string;
    packId: string;
    jobId: string;
    actorId?: string;
}
export declare class PackVerificationPipeline {
    private deps;
    private deduplicator;
    private skuIdentifier;
    private reconciler;
    private decisionEngine;
    private imageValidator;
    private config;
    constructor(deps: PipelineDependencies);
    execute(opts: PipelineExecutionOptions): Promise<AnalysisResultDTO>;
    private finalizeAnalysis;
}
//# sourceMappingURL=pipeline.d.ts.map