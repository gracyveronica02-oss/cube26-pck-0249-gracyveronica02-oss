import { DetectionDTO } from '@pack-manager/shared';
export interface VisionInputImage {
    imageId: string;
    buffer: Buffer;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | string;
}
export interface ExpectedCatalogHint {
    sku: string;
    name: string;
    criticalAttributes: string[];
    expectedQuantity?: number;
}
export interface VisionInput {
    packId: string;
    images: VisionInputImage[];
    expectedCatalogHints?: ExpectedCatalogHint[];
}
export interface VisionResult {
    provider: string;
    model: string;
    modelVersion: string;
    detections: DetectionDTO[];
    rawResponse?: unknown;
}
export interface VisionProvider {
    readonly providerName: string;
    readonly modelName: string;
    readonly modelVersion: string;
    analyzeImage(input: VisionInput): Promise<VisionResult>;
}
export interface EmbeddingInput {
    imageBuffer: Buffer;
}
export interface EmbeddingResult {
    provider: string;
    model: string;
    embedding: number[];
}
export interface EmbeddingProvider {
    generateEmbedding(input: EmbeddingInput): Promise<EmbeddingResult>;
}
//# sourceMappingURL=types.d.ts.map