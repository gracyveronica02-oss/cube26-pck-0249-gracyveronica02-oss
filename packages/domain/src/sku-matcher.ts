import { SKUMatchCandidate, SKUMatchDTO } from '@pack-manager/shared';
import { Product, ProductVariant } from './entities.js';
import { PhysicalItemCluster } from './deduplicator.js';

export interface SKUMatchingOptions {
  minConfidenceThreshold?: number;
  ambiguityMarginThreshold?: number; // Minimum gap between top candidate and runner-up
}

export class SKUIdentifier {
  private minConfidence: number;
  private ambiguityMargin: number;

  constructor(options?: SKUMatchingOptions) {
    this.minConfidence = options?.minConfidenceThreshold ?? 0.90;
    this.ambiguityMargin = options?.ambiguityMarginThreshold ?? 0.10;
  }

  /**
   * Matches a detected physical item against the product catalog using multi-signal scoring.
   */
  public matchDetectedItem(
    item: PhysicalItemCluster,
    catalog: Product[]
  ): SKUMatchDTO {
    const candidates: SKUMatchCandidate[] = [];
    const detection = item.representativeDetection;

    for (const product of catalog) {
      // Check parent product and each variant
      const candidatesForProduct = this.scoreProductAndVariants(item, product);
      candidates.push(...candidatesForProduct);
    }

    // Sort descending by score
    candidates.sort((a, b) => b.score - a.score);

    // Filter duplicates by SKU keeping highest score
    const uniqueCandidatesMap = new Map<string, number>();
    for (const c of candidates) {
      const existing = uniqueCandidatesMap.get(c.sku) || 0;
      if (c.score > existing) {
        uniqueCandidatesMap.set(c.sku, c.score);
      }
    }

    const uniqueCandidates: SKUMatchCandidate[] = Array.from(uniqueCandidatesMap.entries())
      .map(([sku, score]) => ({ sku, score }))
      .sort((a, b) => b.score - a.score);

    let selectedSku: string | undefined;
    let confidence = 0;

    if (uniqueCandidates.length > 0) {
      const topCandidate = uniqueCandidates[0];
      const runnerUp = uniqueCandidates[1];

      // Safe threshold checking:
      // 1. Must satisfy minConfidence
      // 2. Must not be ambiguous (if runner-up exists, margin must exceed threshold unless top is near 1.0)
      const meetsConfidence = topCandidate.score >= this.minConfidence;
      const isNotAmbiguous = !runnerUp || (topCandidate.score - runnerUp.score >= this.ambiguityMargin) || topCandidate.score >= 0.98;

      if (meetsConfidence && isNotAmbiguous) {
        selectedSku = topCandidate.sku;
        confidence = topCandidate.score;
      } else {
        // "Never force an uncertain detection into a SKU"
        confidence = topCandidate.score;
        selectedSku = undefined;
      }
    }

    return {
      detectionId: detection.detectionId,
      candidates: uniqueCandidates.slice(0, 5), // Top 5
      selectedSku,
      confidence,
      matchSignals: {
        rawLabel: detection.label,
        attributes: item.attributes,
        barcode: item.barcode,
      },
    };
  }

  private scoreProductAndVariants(
    item: PhysicalItemCluster,
    product: Product
  ): SKUMatchCandidate[] {
    const candidates: SKUMatchCandidate[] = [];
    const det = item.representativeDetection;

    // 1. Check exact barcode match
    if (item.barcode) {
      if (product.barcode && product.barcode === item.barcode) {
        candidates.push({ sku: product.sku, score: 1.0 });
      }
      for (const variant of product.variants) {
        if (variant.barcode && variant.barcode === item.barcode) {
          candidates.push({ sku: variant.sku, score: 1.0 });
        }
      }
      if (candidates.length > 0) return candidates;
    }

    // 2. Score parent product
    const parentScore = this.computeAttributeScore(item, product.productName, product.criticalAttributes, {
      ...product.dimensionsCm ? { dimensions: JSON.stringify(product.dimensionsCm) } : {},
    }, product.variants.some(variant => variant.sku !== product.sku) ? 0.55 : 0.70);
    candidates.push({ sku: product.sku, score: parentScore });

    // 3. Score variants
    for (const variant of product.variants) {
      const variantAttributes: Record<string, string> = {
        ...variant.attributes,
        ...variant.color ? { color: variant.color } : {},
        ...variant.size ? { size: variant.size } : {},
        ...variant.model ? { model: variant.model } : {},
      };

      const variantScore = this.computeAttributeScore(
        item,
        `${product.productName} ${variant.variantName}`,
        product.criticalAttributes,
        variantAttributes
      );
      candidates.push({ sku: variant.sku, score: variantScore });
    }

    return candidates;
  }

  private computeAttributeScore(
    item: PhysicalItemCluster,
    targetName: string,
    criticalAttributes: string[],
    targetAttributes: Record<string, string>,
    exactNameWeight = 0.70
  ): number {
    const det = item.representativeDetection;
    let score = 0;

    // Name / label similarity
    const labelLower = det.label.toLowerCase();
    const targetNameLower = targetName.toLowerCase();

    if (labelLower === targetNameLower) {
      score += exactNameWeight;
    } else if (targetNameLower.includes(labelLower) || labelLower.includes(targetNameLower)) {
      score += 0.50;
    } else {
      // Partial token overlap
      const detTokens = new Set(labelLower.split(/\s+/));
      const targetTokens = targetNameLower.split(/\s+/);
      const matches = targetTokens.filter(t => detTokens.has(t)).length;
      if (matches > 0) {
        score += 0.35 * (matches / targetTokens.length);
      }
    }

    // Attribute matching
    let attrMatches = 0;
    let attrTotal = 0;

    for (const [key, targetVal] of Object.entries(targetAttributes)) {
      attrTotal++;
      const detectedVal = item.attributes[key];
      if (detectedVal) {
        if (detectedVal.toLowerCase() === targetVal.toLowerCase()) {
          attrMatches += 1;
        } else {
          // Explicit mismatch on a known attribute penalizes heavily
          score -= 0.40;
        }
      }
    }

    if (attrTotal > 0) {
      score += 0.45 * (attrMatches / attrTotal);
    } else {
      score += 0.25;
    }

    // Factor in raw detection confidence
    score = score * (0.8 + 0.2 * det.confidence);

    return Math.max(0, Math.min(1, Number(score.toFixed(4))));
  }
}
