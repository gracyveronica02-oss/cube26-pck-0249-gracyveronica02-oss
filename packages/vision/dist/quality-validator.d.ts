import { ImageQualityReport } from '@pack-manager/shared';
import { ThresholdsConfig } from '@pack-manager/config';
export declare class ImageQualityValidator {
    private config;
    constructor(config: ThresholdsConfig);
    /**
     * Performs deep inspection of image buffer for format, integrity, resolution,
     * blur, exposure, and content visibility.
     */
    validateImage(buffer: Buffer): ImageQualityReport;
    private detectFormat;
    private extractDimensions;
    private analyzePixels;
}
//# sourceMappingURL=quality-validator.d.ts.map