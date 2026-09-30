import {
  AppConfig,
  DefaultAppConfig,
} from '@pack-manager/config';
import {
  IPackRepository,
  IOrderRepository,
  IProductRepository,
  IAnalysisRepository,
  IJobRepository,
  IAuditRepository,
  IObjectStorage,
  StoragePaths,
} from '@pack-manager/database';
import {
  PackStateMachine,
  MultiImageDeduplicator,
  SKUIdentifier,
  OrderReconciler,
  DeterministicDecisionEngine,
  Detection,
  SKUMatch,
  Discrepancy,
  Analysis,
} from '@pack-manager/domain';
import {
  PackStatus,
  OperationalDecision,
  DiscrepancyType,
  AnalysisResultDTO,
  DetectionDTO,
} from '@pack-manager/shared';
import {
  ImageQualityValidator,
  VisionProvider,
  VisionInputImage,
} from '@pack-manager/vision';
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

export class PackVerificationPipeline {
  private deduplicator: MultiImageDeduplicator;
  private skuIdentifier: SKUIdentifier;
  private reconciler: OrderReconciler;
  private decisionEngine: DeterministicDecisionEngine;
  private imageValidator: ImageQualityValidator;
  private config: AppConfig;

  constructor(private deps: PipelineDependencies) {
    this.config = deps.config || DefaultAppConfig;
    this.deduplicator = new MultiImageDeduplicator({
      minIoUForSameItemCluster: this.config.thresholds.minIoUForSameItemCluster,
    });
    this.skuIdentifier = new SKUIdentifier({
      minConfidenceThreshold: this.config.thresholds.minSKUMatchConfidence,
    });
    this.reconciler = new OrderReconciler({
      minConfidenceThreshold: this.config.thresholds.minDetectionConfidence,
    });
    this.decisionEngine = new DeterministicDecisionEngine();
    this.imageValidator = new ImageQualityValidator(this.config.thresholds);
  }

  public async execute(opts: PipelineExecutionOptions): Promise<AnalysisResultDTO> {
    const { orgId, packId, jobId, actorId = 'system_worker' } = opts;
    const startTime = Date.now();

    // 1. Mark job running
    await this.deps.jobRepo.updateJobStatus(orgId, jobId, 'RUNNING');

    // 2. Fetch pack and order
    const pack = await this.deps.packRepo.getPackById(orgId, packId);
    if (!pack) throw new Error(`Pack not found: ${packId}`);

    const order = await this.deps.orderRepo.getOrderById(orgId, pack.orderId);
    if (!order) throw new Error(`Order not found: ${pack.orderId}`);

    const previousAnalyses = await this.deps.analysisRepo.listAnalysesForPack(orgId, packId);
    const analysisNumber = previousAnalyses.length + 1;
    const analysisId = `ANL-${packId}-${String(analysisNumber).padStart(2, '0')}`;

    let currentStatus = pack.status;

    // 3. State transition: -> VALIDATING
    PackStateMachine.transition(packId, currentStatus, PackStatus.VALIDATING, actorId);
    currentStatus = PackStatus.VALIDATING;
    await this.deps.packRepo.updatePackStatus(orgId, packId, currentStatus);
    await this.deps.auditRepo.recordEvent({
      auditId: `aud_${Date.now()}_val`,
      orgId,
      entityType: 'PACK',
      entityId: packId,
      actorId,
      action: 'STATE_TRANSITION',
      previousState: { status: pack.status },
      newState: { status: currentStatus },
      createdAt: new Date(),
    });

    // 4. Download and validate images
    const imageBuffers: VisionInputImage[] = [];
    const imageValidationIssues: string[] = [];
    let imageValidationPassed = true;

    for (let i = 0; i < pack.images.length; i++) {
      const img = pack.images[i];
      try {
        const buf = await this.deps.storage.download(img.storagePath);
        const report = this.imageValidator.validateImage(buf);

        img.isValid = report.isValid;
        img.resolutionW = report.resolution.width;
        img.resolutionH = report.resolution.height;
        img.blurScore = report.blurScore;
        img.exposureScore = report.exposureScore;
        img.validationErrors = report.issues;

        if (!report.isValid) {
          imageValidationPassed = false;
          imageValidationIssues.push(`Image ${i + 1}: ${report.issues.join('; ')}`);
        }

        imageBuffers.push({
          imageId: img.packImageId,
          buffer: buf,
          mimeType: 'image/jpeg',
        });
      } catch (err) {
        imageValidationPassed = false;
        imageValidationIssues.push(`Failed to download image ${img.packImageId}: ${(err as Error).message}`);
      }
    }

    if (imageBuffers.length === 0) {
      imageValidationPassed = false;
      imageValidationIssues.push('No photograph uploaded for package verification');
    }

    // If image validation failed -> immediately halt with STOP_AND_FIX
    if (!imageValidationPassed) {
      const emptyReconciliation = this.reconciler.reconcile(order.items, []);
      emptyReconciliation.discrepancies.push({
        type: DiscrepancyType.POOR_IMAGE_QUALITY,
        details: { issues: imageValidationIssues },
      });

      const decisionResult = this.decisionEngine.evaluate({
        imageValidationPassed: false,
        imageValidationIssues,
        reconciliation: emptyReconciliation,
        overallConfidence: 0,
        configuration: this.config.thresholds,
      });

      return await this.finalizeAnalysis({
        orgId,
        pack,
        order,
        analysisId,
        analysisNumber,
        jobId,
        decisionResult,
        reconciliation: emptyReconciliation,
        detections: [],
        skuMatches: [],
        discrepancies: emptyReconciliation.discrepancies.map(d => ({
          discrepancyId: `disc_${Date.now()}_img`,
          analysisId,
          type: d.type,
          expectedSku: d.expectedSku,
          detectedSku: d.detectedSku,
          expectedQuantity: d.expectedQuantity,
          detectedQuantity: d.detectedQuantity,
          details: d.details,
        })),
        executionTimeMs: Date.now() - startTime,
        actorId,
        currentStatus,
      });
    }

    // 5. State transition: -> ANALYZING
    PackStateMachine.transition(packId, currentStatus, PackStatus.ANALYZING, actorId);
    currentStatus = PackStatus.ANALYZING;
    await this.deps.packRepo.updatePackStatus(orgId, packId, currentStatus);

    // 6. Invoke Vision Provider
    let rawDetections: DetectionDTO[] = [];
    let visionFailed = false;
    let visionFailureReason: string | undefined;

    try {
      const visionResult = await this.deps.visionProvider.analyzeImage({
        packId,
        images: imageBuffers,
        expectedCatalogHints: order.items.map(i => ({
          sku: i.sku,
          name: i.productName,
          criticalAttributes: i.criticalAttributes,
          expectedQuantity: i.expectedQuantity,
        })),
      });
      rawDetections = visionResult.detections;
    } catch (err) {
      visionFailed = true;
      visionFailureReason = (err as Error).message;
    }

    // If Vision Provider failed -> fail safe to STOP_AND_FIX (Conveyor does not lock, routes to QC)
    if (visionFailed) {
      const emptyReconciliation = this.reconciler.reconcile(order.items, []);
      emptyReconciliation.discrepancies.push({
        type: DiscrepancyType.VISION_FAILURE,
        details: { error: visionFailureReason },
      });

      const decisionResult = this.decisionEngine.evaluate({
        imageValidationPassed: true,
        visionFailed: true,
        visionFailureReason,
        reconciliation: emptyReconciliation,
        overallConfidence: 0,
        configuration: this.config.thresholds,
      });

      return await this.finalizeAnalysis({
        orgId,
        pack,
        order,
        analysisId,
        analysisNumber,
        jobId,
        decisionResult,
        reconciliation: emptyReconciliation,
        detections: [],
        skuMatches: [],
        discrepancies: emptyReconciliation.discrepancies.map(d => ({
          discrepancyId: `disc_${Date.now()}_vis`,
          analysisId,
          type: d.type,
          expectedSku: d.expectedSku,
          detectedSku: d.detectedSku,
          details: d.details,
        })),
        executionTimeMs: Date.now() - startTime,
        actorId,
        currentStatus,
      });
    }

    // 7. Multi-image deduplication
    const clusters = this.deduplicator.deduplicate(rawDetections);

    // 8. Match Against Product Catalog
    const catalog = await this.deps.productRepo.listProducts(orgId);
    const catalogSkus = new Set(catalog.flatMap(product => [product.sku, ...product.variants.map(variant => variant.sku)]));
    const manifestProducts = order.items
      .filter(item => !catalogSkus.has(item.sku))
      .map((item, idx) => ({
        productId: `manifest_${pack.packId}_${idx}`,
        orgId,
        sku: item.sku,
        asin: item.asin,
        productName: item.productName,
        criticalAttributes: item.criticalAttributes,
        referenceImages: item.referenceImage ? [item.referenceImage] : [],
        active: true,
        variants: [{
          variantId: `manifest_${pack.packId}_${idx}`,
          productId: `manifest_${pack.packId}_${idx}`,
          sku: item.sku,
          variantName: item.productName,
          attributes: item.attributes || {},
        }],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    catalog.push(...manifestProducts);
    const identifiedClusters = clusters.map(cluster => ({
      cluster,
      match: this.skuIdentifier.matchDetectedItem(cluster, catalog),
    }));

    // 9. State transition: -> RECONCILING
    PackStateMachine.transition(packId, currentStatus, PackStatus.RECONCILING, actorId);
    currentStatus = PackStatus.RECONCILING;
    await this.deps.packRepo.updatePackStatus(orgId, packId, currentStatus);

    // 10. Deterministic Order Reconciliation
    const reconciliation = this.reconciler.reconcile(order.items, identifiedClusters);

    // Compute overall confidence
    const overallConfidence = identifiedClusters.length > 0
      ? Number((identifiedClusters.reduce((acc, c) => acc + c.match.confidence, 0) / identifiedClusters.length).toFixed(4))
      : (order.items.length === 0 ? 1.0 : 0.0);

    // 11. Deterministic Decision Engine
    const decisionResult = this.decisionEngine.evaluate({
      imageValidationPassed: true,
      visionFailed: false,
      reconciliation,
      overallConfidence,
      configuration: this.config.thresholds,
    });

    // 12. Persist Evidence & Finalize
    const domainDetections: Detection[] = rawDetections.map((d, idx) => ({
      detectionId: d.detectionId || `det_${analysisId}_${idx + 1}`,
      packImageId: pack.images[d.imageIndex]?.packImageId || pack.images[0]?.packImageId || 'img_1',
      imageIndex: d.imageIndex,
      label: d.label,
      confidence: d.confidence,
      boundingBox: d.boundingBox,
      attributes: d.attributes,
      barcodeDetected: d.barcodeDetected,
      physicalItemClusterId: d.physicalItemClusterId,
      cropStoragePath: StoragePaths.packCrop(orgId, packId, analysisId, d.detectionId),
    }));

    const domainSkuMatches: SKUMatch[] = identifiedClusters.map((ic, idx) => ({
      skuMatchId: `sm_${analysisId}_${idx + 1}`,
      detectionId: ic.cluster.representativeDetection.detectionId,
      candidates: ic.match.candidates,
      selectedSku: ic.match.selectedSku,
      confidence: ic.match.confidence,
      matchSignals: ic.match.matchSignals,
    }));

    const domainDiscrepancies: Discrepancy[] = reconciliation.discrepancies.map((d, idx) => ({
      discrepancyId: `disc_${analysisId}_${idx + 1}`,
      analysisId,
      type: d.type,
      expectedSku: d.expectedSku,
      detectedSku: d.detectedSku,
      expectedQuantity: d.expectedQuantity,
      detectedQuantity: d.detectedQuantity,
      details: d.details,
    }));

    return await this.finalizeAnalysis({
      orgId,
      pack,
      order,
      analysisId,
      analysisNumber,
      jobId,
      decisionResult,
      reconciliation,
      detections: domainDetections,
      skuMatches: domainSkuMatches,
      discrepancies: domainDiscrepancies,
      executionTimeMs: Date.now() - startTime,
      actorId,
      currentStatus,
    });
  }

  private async finalizeAnalysis(params: {
    orgId: string;
    pack: any;
    order: any;
    analysisId: string;
    analysisNumber: number;
    jobId: string;
    decisionResult: any;
    reconciliation: any;
    detections: Detection[];
    skuMatches: SKUMatch[];
    discrepancies: Discrepancy[];
    executionTimeMs: number;
    actorId: string;
    currentStatus: PackStatus;
  }): Promise<AnalysisResultDTO> {
    const {
      orgId,
      pack,
      order,
      analysisId,
      analysisNumber,
      jobId,
      decisionResult,
      reconciliation,
      detections,
      skuMatches,
      discrepancies,
      executionTimeMs,
      actorId,
      currentStatus,
    } = params;

    // 1. Create Analysis Record
    const analysis: Analysis = {
      analysisId,
      orgId,
      packId: pack.packId,
      analysisNumber,
      status: 'COMPLETED',
      overallConfidence: decisionResult.overallConfidence,
      decision: decisionResult.decision,
      reasonSummary: decisionResult.reasonSummary,
      expectedItems: reconciliation.expectedItemsSummary,
      detectedItems: reconciliation.detectedItemsSummary,
      executionTimeMs,
      detections,
      skuMatches,
      discrepancies,
      ruleEvaluations: { rules: decisionResult.ruleEvaluations },
      createdAt: new Date(),
      completedAt: new Date(),
    };
    await this.deps.analysisRepo.createAnalysis(analysis);

    // 2. State transition: -> SEAL, MANUAL_REVIEW, or STOP_AND_FIX
    const targetStatus = decisionResult.decision === OperationalDecision.SEAL
      ? PackStatus.SEAL
      : decisionResult.decision === OperationalDecision.MANUAL_REVIEW || decisionResult.decision === OperationalDecision.UNCERTAIN
      ? PackStatus.MANUAL_REVIEW
      : PackStatus.STOP_AND_FIX;

    PackStateMachine.transition(pack.packId, currentStatus, targetStatus, actorId);
    await this.deps.packRepo.updatePackStatus(orgId, pack.packId, targetStatus, analysisId);

    await this.deps.auditRepo.recordEvent({
      auditId: `aud_${Date.now()}_dec`,
      orgId,
      entityType: 'PACK',
      entityId: pack.packId,
      actorId,
      action: 'VERIFICATION_DECISION',
      previousState: { status: pack.status },
      newState: { status: targetStatus, decision: decisionResult.decision, reason: decisionResult.reasonSummary },
      createdAt: new Date(),
    });

    // 3. Mark job completed
    await this.deps.jobRepo.updateJobStatus(orgId, jobId, 'COMPLETED');

    // 4. Construct Full Analysis Result DTO
    const resultDto: AnalysisResultDTO = {
      packId: pack.packId,
      analysisId,
      decision: decisionResult.decision,
      confidence: decisionResult.overallConfidence,
      reasonSummary: decisionResult.reasonSummary,
      expectedItems: reconciliation.expectedItemsSummary,
      detectedItems: reconciliation.detectedItemsSummary,
      discrepancies: reconciliation.discrepancies,
      evidence: {
        analysisId,
        originalImages: pack.images.map((i: any) => i.storagePath),
        processedImages: [StoragePaths.packProcessed(orgId, pack.packId, analysisId, 'main')],
        detectionCrops: detections.map(d => d.cropStoragePath).filter(Boolean) as string[],
      },
      modelInfo: {
        provider: this.deps.visionProvider.providerName,
        model: this.deps.visionProvider.modelName,
        modelVersion: this.deps.visionProvider.modelVersion,
      },
      timestamp: new Date().toISOString(),
    };

    // 5. Dispatch Webhook
    if (this.deps.webhookDispatcher) {
      await this.deps.webhookDispatcher.dispatchVerificationCompleted({
        orgId,
        unitId: pack.unitId,
        packId: pack.packId,
        orderId: order.orderId,
        decision: decisionResult.decision,
        reasonSummary: decisionResult.reasonSummary,
        discrepancies: reconciliation.discrepancies,
        expectedItems: reconciliation.expectedItemsSummary.map((i: any) => ({
          sku: i.sku,
          quantity: i.quantity,
        })),
        detectedItems: reconciliation.detectedItemsSummary.map((i: any) => ({
          sku: i.sku,
          quantity: i.quantity,
          confidence: i.confidence,
        })),
        evidence: {
          analysisId,
          photoCount: pack.images.length,
          annotatedImageUrls: resultDto.evidence.processedImages,
          cropUrls: resultDto.evidence.detectionCrops,
        },
      });
    }

    return resultDto;
  }
}
