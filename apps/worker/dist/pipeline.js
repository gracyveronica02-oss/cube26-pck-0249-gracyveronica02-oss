"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackVerificationPipeline = void 0;
const config_1 = require("@pack-manager/config");
const database_1 = require("@pack-manager/database");
const domain_1 = require("@pack-manager/domain");
const shared_1 = require("@pack-manager/shared");
const vision_1 = require("@pack-manager/vision");
class PackVerificationPipeline {
    deps;
    deduplicator;
    skuIdentifier;
    reconciler;
    decisionEngine;
    imageValidator;
    config;
    constructor(deps) {
        this.deps = deps;
        this.config = deps.config || config_1.DefaultAppConfig;
        this.deduplicator = new domain_1.MultiImageDeduplicator({
            minIoUForSameItemCluster: this.config.thresholds.minIoUForSameItemCluster,
        });
        this.skuIdentifier = new domain_1.SKUIdentifier({
            minConfidenceThreshold: this.config.thresholds.minSKUMatchConfidence,
        });
        this.reconciler = new domain_1.OrderReconciler({
            minConfidenceThreshold: this.config.thresholds.minDetectionConfidence,
        });
        this.decisionEngine = new domain_1.DeterministicDecisionEngine();
        this.imageValidator = new vision_1.ImageQualityValidator(this.config.thresholds);
    }
    async execute(opts) {
        const { orgId, packId, jobId, actorId = 'system_worker' } = opts;
        const startTime = Date.now();
        // 1. Mark job running
        await this.deps.jobRepo.updateJobStatus(orgId, jobId, 'RUNNING');
        // 2. Fetch pack and order
        const pack = await this.deps.packRepo.getPackById(orgId, packId);
        if (!pack)
            throw new Error(`Pack not found: ${packId}`);
        const order = await this.deps.orderRepo.getOrderById(orgId, pack.orderId);
        if (!order)
            throw new Error(`Order not found: ${pack.orderId}`);
        const previousAnalyses = await this.deps.analysisRepo.listAnalysesForPack(orgId, packId);
        const analysisNumber = previousAnalyses.length + 1;
        const analysisId = `ANL-${packId}-${String(analysisNumber).padStart(2, '0')}`;
        let currentStatus = pack.status;
        // 3. State transition: -> VALIDATING
        domain_1.PackStateMachine.transition(packId, currentStatus, shared_1.PackStatus.VALIDATING, actorId);
        currentStatus = shared_1.PackStatus.VALIDATING;
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
        const imageBuffers = [];
        const imageValidationIssues = [];
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
            }
            catch (err) {
                imageValidationPassed = false;
                imageValidationIssues.push(`Failed to download image ${img.packImageId}: ${err.message}`);
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
                type: shared_1.DiscrepancyType.POOR_IMAGE_QUALITY,
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
        domain_1.PackStateMachine.transition(packId, currentStatus, shared_1.PackStatus.ANALYZING, actorId);
        currentStatus = shared_1.PackStatus.ANALYZING;
        await this.deps.packRepo.updatePackStatus(orgId, packId, currentStatus);
        // 6. Invoke Vision Provider
        let rawDetections = [];
        let visionFailed = false;
        let visionFailureReason;
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
        }
        catch (err) {
            visionFailed = true;
            visionFailureReason = err.message;
        }
        // If Vision Provider failed -> fail safe to STOP_AND_FIX (Conveyor does not lock, routes to QC)
        if (visionFailed) {
            const emptyReconciliation = this.reconciler.reconcile(order.items, []);
            emptyReconciliation.discrepancies.push({
                type: shared_1.DiscrepancyType.VISION_FAILURE,
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
        domain_1.PackStateMachine.transition(packId, currentStatus, shared_1.PackStatus.RECONCILING, actorId);
        currentStatus = shared_1.PackStatus.RECONCILING;
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
        const domainDetections = rawDetections.map((d, idx) => ({
            detectionId: d.detectionId || `det_${analysisId}_${idx + 1}`,
            packImageId: pack.images[d.imageIndex]?.packImageId || pack.images[0]?.packImageId || 'img_1',
            imageIndex: d.imageIndex,
            label: d.label,
            confidence: d.confidence,
            boundingBox: d.boundingBox,
            attributes: d.attributes,
            barcodeDetected: d.barcodeDetected,
            physicalItemClusterId: d.physicalItemClusterId,
            cropStoragePath: database_1.StoragePaths.packCrop(orgId, packId, analysisId, d.detectionId),
        }));
        const domainSkuMatches = identifiedClusters.map((ic, idx) => ({
            skuMatchId: `sm_${analysisId}_${idx + 1}`,
            detectionId: ic.cluster.representativeDetection.detectionId,
            candidates: ic.match.candidates,
            selectedSku: ic.match.selectedSku,
            confidence: ic.match.confidence,
            matchSignals: ic.match.matchSignals,
        }));
        const domainDiscrepancies = reconciliation.discrepancies.map((d, idx) => ({
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
    async finalizeAnalysis(params) {
        const { orgId, pack, order, analysisId, analysisNumber, jobId, decisionResult, reconciliation, detections, skuMatches, discrepancies, executionTimeMs, actorId, currentStatus, } = params;
        // 1. Create Analysis Record
        const analysis = {
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
        const targetStatus = decisionResult.decision === shared_1.OperationalDecision.SEAL
            ? shared_1.PackStatus.SEAL
            : decisionResult.decision === shared_1.OperationalDecision.MANUAL_REVIEW || decisionResult.decision === shared_1.OperationalDecision.UNCERTAIN
                ? shared_1.PackStatus.MANUAL_REVIEW
                : shared_1.PackStatus.STOP_AND_FIX;
        domain_1.PackStateMachine.transition(pack.packId, currentStatus, targetStatus, actorId);
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
        const resultDto = {
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
                originalImages: pack.images.map((i) => i.storagePath),
                processedImages: [database_1.StoragePaths.packProcessed(orgId, pack.packId, analysisId, 'main')],
                detectionCrops: detections.map(d => d.cropStoragePath).filter(Boolean),
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
                expectedItems: reconciliation.expectedItemsSummary.map((i) => ({
                    sku: i.sku,
                    quantity: i.quantity,
                })),
                detectedItems: reconciliation.detectedItemsSummary.map((i) => ({
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
exports.PackVerificationPipeline = PackVerificationPipeline;
//# sourceMappingURL=pipeline.js.map