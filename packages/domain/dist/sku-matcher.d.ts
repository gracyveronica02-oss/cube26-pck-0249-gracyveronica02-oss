import { SKUMatchDTO } from '@pack-manager/shared';
import { Product } from './entities.js';
import { PhysicalItemCluster } from './deduplicator.js';
export interface SKUMatchingOptions {
    minConfidenceThreshold?: number;
    ambiguityMarginThreshold?: number;
}
export declare class SKUIdentifier {
    private minConfidence;
    private ambiguityMargin;
    constructor(options?: SKUMatchingOptions);
    /**
     * Matches a detected physical item against the product catalog using multi-signal scoring.
     */
    matchDetectedItem(item: PhysicalItemCluster, catalog: Product[]): SKUMatchDTO;
    private scoreProductAndVariants;
    private computeAttributeScore;
}
//# sourceMappingURL=sku-matcher.d.ts.map