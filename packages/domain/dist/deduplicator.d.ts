import { BoundingBox, DetectionDTO } from '@pack-manager/shared';
export interface DeduplicationOptions {
    minIoUForSameItemCluster?: number;
}
/**
 * Calculates Intersection over Union (IoU) of two normalized 2D bounding boxes.
 */
export declare function calculateIoU(boxA: BoundingBox, boxB: BoundingBox): number;
export interface PhysicalItemCluster {
    clusterId: string;
    representativeDetection: DetectionDTO;
    allDetections: DetectionDTO[];
    associatedImages: number[];
    barcode?: string;
    attributes: Record<string, string>;
    confidence: number;
}
/**
 * Deduplicates detections across single or multiple photographs.
 * Prevents double-counting the same physical item observed in multiple angles.
 */
export declare class MultiImageDeduplicator {
    private minIoUForSameItemCluster;
    constructor(options?: DeduplicationOptions);
    /**
     * Deduplicates detections across all photos for a pack.
     */
    deduplicate(detections: DetectionDTO[]): PhysicalItemCluster[];
}
//# sourceMappingURL=deduplicator.d.ts.map