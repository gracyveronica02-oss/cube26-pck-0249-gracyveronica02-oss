import { BoundingBox, DetectionDTO } from '@pack-manager/shared';

export interface DeduplicationOptions {
  minIoUForSameItemCluster?: number;
}

/**
 * Calculates Intersection over Union (IoU) of two normalized 2D bounding boxes.
 */
export function calculateIoU(boxA: BoundingBox, boxB: BoundingBox): number {
  const xA = Math.max(boxA.x, boxB.x);
  const yA = Math.max(boxA.y, boxB.y);
  const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
  const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

  const interWidth = Math.max(0, xB - xA);
  const interHeight = Math.max(0, yB - yA);
  const interArea = interWidth * interHeight;

  const boxAArea = boxA.width * boxA.height;
  const boxBArea = boxB.width * boxB.height;
  const unionArea = boxAArea + boxBArea - interArea;

  if (unionArea <= 0) return 0;
  return interArea / unionArea;
}

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
export class MultiImageDeduplicator {
  private minIoUForSameItemCluster: number;

  constructor(options?: DeduplicationOptions) {
    this.minIoUForSameItemCluster = options?.minIoUForSameItemCluster ?? 0.50;
  }

  /**
   * Deduplicates detections across all photos for a pack.
   */
  public deduplicate(detections: DetectionDTO[]): PhysicalItemCluster[] {
    if (detections.length === 0) return [];

    // Keep every within-image instance; spatial overlap alone cannot prove two detections are one item.
    // Cross-image clustering prevents the same physical item being counted again from another view.
    const clusters: PhysicalItemCluster[] = [];
    let clusterCounter = 1;

    for (const det of detections) {
      let matchedCluster: PhysicalItemCluster | null = null;

      for (const cluster of clusters) {
        // Detections from the SAME photo cannot be the same physical object
        if (cluster.associatedImages.includes(det.imageIndex)) {
          continue;
        }

        // Condition A: Matching barcode across DIFFERENT photos
        if (
          det.barcodeDetected &&
          cluster.barcode &&
          det.barcodeDetected === cluster.barcode
        ) {
          matchedCluster = cluster;
          break;
        }

        // Condition B: High spatial overlap (IoU) across fixed cameras with matching label
        const iou = calculateIoU(det.boundingBox, cluster.representativeDetection.boundingBox);
        const sameLabel = det.label.toLowerCase() === cluster.representativeDetection.label.toLowerCase();

        if (iou >= this.minIoUForSameItemCluster && sameLabel) {
          // Compare attributes if available
          let attributesCompatible = true;
          for (const key of Object.keys(det.attributes)) {
            if (cluster.attributes[key] && cluster.attributes[key].toLowerCase() !== det.attributes[key].toLowerCase()) {
              attributesCompatible = false;
              break;
            }
          }

          if (attributesCompatible) {
            matchedCluster = cluster;
            break;
          }
        }
      }

      if (matchedCluster) {
        matchedCluster.allDetections.push(det);
        if (!matchedCluster.associatedImages.includes(det.imageIndex)) {
          matchedCluster.associatedImages.push(det.imageIndex);
        }
        // Update representative if higher confidence
        if (det.confidence > matchedCluster.confidence) {
          matchedCluster.representativeDetection = det;
          matchedCluster.confidence = det.confidence;
        }
        // Merge attributes
        matchedCluster.attributes = { ...matchedCluster.attributes, ...det.attributes };
        if (det.barcodeDetected && !matchedCluster.barcode) {
          matchedCluster.barcode = det.barcodeDetected;
        }
        det.physicalItemClusterId = matchedCluster.clusterId;
      } else {
        const clusterId = `cluster_${String(clusterCounter++).padStart(3, '0')}`;
        det.physicalItemClusterId = clusterId;
        clusters.push({
          clusterId,
          representativeDetection: det,
          allDetections: [det],
          associatedImages: [det.imageIndex],
          barcode: det.barcodeDetected,
          attributes: { ...det.attributes },
          confidence: det.confidence,
        });
      }
    }

    return clusters;
  }
}
