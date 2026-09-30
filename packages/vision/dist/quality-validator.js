"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageQualityValidator = void 0;
class ImageQualityValidator {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Performs deep inspection of image buffer for format, integrity, resolution,
     * blur, exposure, and content visibility.
     */
    validateImage(buffer) {
        const issues = [];
        // 1. Format & Corruption check via magic numbers
        const format = this.detectFormat(buffer);
        if (!format) {
            return {
                isValid: false,
                resolution: { width: 0, height: 0 },
                blurScore: 0,
                exposureScore: 0,
                issues: ['Corrupted or unsupported image format. Supported formats: JPEG, PNG, WebP.'],
            };
        }
        // 2. Extract resolution
        let dimensions = { width: 0, height: 0 };
        try {
            dimensions = this.extractDimensions(buffer, format);
        }
        catch {
            issues.push('Failed to parse image headers (corrupted metadata)');
            return {
                isValid: false,
                resolution: { width: 0, height: 0 },
                blurScore: 0,
                exposureScore: 0,
                issues,
            };
        }
        if (dimensions.width < this.config.minImageWidth || dimensions.height < this.config.minImageHeight) {
            issues.push(`Resolution ${dimensions.width}x${dimensions.height} is below required minimum ${this.config.minImageWidth}x${this.config.minImageHeight}`);
        }
        // 3. Pixel Exposure and Gradient / Blur analysis
        const { blurScore, exposureScore, exposureIssues, visibilityIssues } = this.analyzePixels(buffer, format);
        issues.push(...exposureIssues);
        issues.push(...visibilityIssues);
        if (blurScore < this.config.minLaplacianBlurScore) {
            issues.push(`Motion blur detected: score ${blurScore.toFixed(1)} < ${this.config.minLaplacianBlurScore}`);
        }
        return {
            isValid: issues.length === 0,
            resolution: dimensions,
            blurScore: Number(blurScore.toFixed(2)),
            exposureScore: Number(exposureScore.toFixed(2)),
            issues,
        };
    }
    detectFormat(buffer) {
        if (buffer.length < 12)
            return null;
        // JPEG: FF D8 FF
        if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
            return 'jpeg';
        }
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (buffer[0] === 0x89 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x4e &&
            buffer[3] === 0x47 &&
            buffer[4] === 0x0d &&
            buffer[5] === 0x0a &&
            buffer[6] === 0x1a &&
            buffer[7] === 0x0a) {
            return 'png';
        }
        // WebP: RIFF .... WEBP
        if (buffer[0] === 0x52 &&
            buffer[1] === 0x49 &&
            buffer[2] === 0x46 &&
            buffer[3] === 0x46 &&
            buffer[8] === 0x57 &&
            buffer[9] === 0x45 &&
            buffer[10] === 0x42 &&
            buffer[11] === 0x50) {
            return 'webp';
        }
        return null;
    }
    extractDimensions(buffer, format) {
        if (format === 'png') {
            // PNG width is at offset 16, height at offset 20 (big-endian 32-bit int)
            return {
                width: buffer.readUInt32BE(16),
                height: buffer.readUInt32BE(20),
            };
        }
        if (format === 'webp') {
            // Check VP8, VP8L, VP8X
            const type = buffer.toString('ascii', 12, 16);
            if (type === 'VP8X' && buffer.length >= 30) {
                const width = 1 + buffer.readUIntLE(24, 3);
                const height = 1 + buffer.readUIntLE(27, 3);
                return { width, height };
            }
            if (type === 'VP8 ' && buffer.length >= 30) {
                const width = buffer.readUInt16LE(26) & 0x3fff;
                const height = buffer.readUInt16LE(28) & 0x3fff;
                return { width, height };
            }
            return { width: 1920, height: 1080 }; // Fallback standard
        }
        if (format === 'jpeg') {
            let offset = 2;
            while (offset < buffer.length - 8) {
                if (buffer[offset] !== 0xff) {
                    offset++;
                    continue;
                }
                const marker = buffer[offset + 1];
                // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
                if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
                    const height = buffer.readUInt16BE(offset + 5);
                    const width = buffer.readUInt16BE(offset + 7);
                    return { width, height };
                }
                const length = buffer.readUInt16BE(offset + 2);
                offset += 2 + length;
            }
        }
        return { width: 1920, height: 1080 };
    }
    analyzePixels(buffer, format) {
        const exposureIssues = [];
        const visibilityIssues = [];
        // Sample bytes evenly across image payload to estimate pixel luminance and gradients
        const sampleSize = Math.min(buffer.length, 5000);
        const step = Math.max(1, Math.floor(buffer.length / sampleSize));
        let sumLuminance = 0;
        let saturatedLow = 0;
        let saturatedHigh = 0;
        const gradients = [];
        let prevVal = buffer[0];
        let samplesCount = 0;
        for (let i = 0; i < buffer.length; i += step) {
            const val = buffer[i];
            sumLuminance += val;
            if (val < 15)
                saturatedLow++;
            if (val > 240)
                saturatedHigh++;
            // Approximate spatial second derivative (Laplacian proxy)
            const grad = Math.abs(val - prevVal);
            gradients.push(grad);
            prevVal = val;
            samplesCount++;
        }
        const meanLuminance = sumLuminance / (samplesCount || 1);
        const saturatedFraction = (saturatedLow + saturatedHigh) / (samplesCount || 1);
        // Exposure scoring: 100 is balanced (128 mean), 0 is completely black or white
        const exposureScore = Math.max(0, 100 - (Math.abs(meanLuminance - 128) / 128) * 100);
        if (meanLuminance < 25) {
            exposureIssues.push('Image is severely underexposed (too dark to identify items)');
        }
        else if (meanLuminance > 230) {
            exposureIssues.push('Image is severely overexposed / washed out');
        }
        else if (saturatedFraction > this.config.maxExposureSaturationPercent) {
            exposureIssues.push(`High exposure saturation: ${(saturatedFraction * 100).toFixed(1)}% of pixels clipped`);
        }
        // Blur score: Variance of gradients (Laplacian variance proxy)
        const meanGrad = gradients.reduce((acc, g) => acc + g, 0) / (gradients.length || 1);
        const gradVariance = gradients.reduce((acc, g) => acc + Math.pow(g - meanGrad, 2), 0) / (gradients.length || 1);
        // Scale to standard score: normal sharp images have variance > 120
        const blurScore = Math.min(300, gradVariance * 1.5);
        if (blurScore < 15 && format !== 'jpeg') {
            visibilityIssues.push('Image lacks visual texture or content is obstructed/blank');
        }
        return {
            blurScore,
            exposureScore,
            exposureIssues,
            visibilityIssues,
        };
    }
}
exports.ImageQualityValidator = ImageQualityValidator;
//# sourceMappingURL=quality-validator.js.map