import { describe, it, expect } from 'vitest';
import {
  ImageQualityValidator,
  MockVisionProvider,
} from '../src/index.js';
import { DefaultAppConfig } from '@pack-manager/config';

describe('Image Quality Validator (Section 7: Image Handling)', () => {
  const validator = new ImageQualityValidator(DefaultAppConfig.thresholds);

  it('rejects corrupted image or invalid format', () => {
    const corruptBuffer = Buffer.from('not an image at all');
    const result = validator.validateImage(corruptBuffer);

    expect(result.isValid).toBe(false);
    expect(result.issues[0]).toContain('Corrupted or unsupported image format');
  });

  it('rejects low resolution image below minimum 1280x720', () => {
    // Construct minimal PNG header with 640x480
    const pngHeader = Buffer.alloc(32);
    pngHeader[0] = 0x89;
    pngHeader[1] = 0x50;
    pngHeader[2] = 0x4e;
    pngHeader[3] = 0x47;
    pngHeader[4] = 0x0d;
    pngHeader[5] = 0x0a;
    pngHeader[6] = 0x1a;
    pngHeader[7] = 0x0a;
    pngHeader.writeUInt32BE(640, 16); // Width
    pngHeader.writeUInt32BE(480, 20); // Height

    const result = validator.validateImage(pngHeader);
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.includes('below required minimum'))).toBe(true);
  });

  it('validates a properly formatted 1920x1080 image with good exposure', () => {
    // Construct 1920x1080 PNG header with simulated textured payload
    const buffer = Buffer.alloc(2000);
    buffer[0] = 0x89;
    buffer[1] = 0x50;
    buffer[2] = 0x4e;
    buffer[3] = 0x47;
    buffer[4] = 0x0d;
    buffer[5] = 0x0a;
    buffer[6] = 0x1a;
    buffer[7] = 0x0a;
    buffer.writeUInt32BE(1920, 16); // Width
    buffer.writeUInt32BE(1080, 20); // Height

    // Fill with textured grayscale pixel distribution (128 mean, varied gradients)
    for (let i = 32; i < buffer.length; i++) {
      buffer[i] = (i * 37) % 256;
    }

    const result = validator.validateImage(buffer);
    expect(result.resolution.width).toBe(1920);
    expect(result.resolution.height).toBe(1080);
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('detects severely underexposed (pitch dark) package photograph', () => {
    const buffer = Buffer.alloc(1000);
    buffer[0] = 0x89;
    buffer[1] = 0x50;
    buffer[2] = 0x4e;
    buffer[3] = 0x47;
    buffer[4] = 0x0d;
    buffer[5] = 0x0a;
    buffer[6] = 0x1a;
    buffer[7] = 0x0a;
    buffer.writeUInt32BE(1920, 16);
    buffer.writeUInt32BE(1080, 20);

    // All pixels near 0 (black frame)
    for (let i = 32; i < buffer.length; i++) {
      buffer[i] = 2;
    }

    const result = validator.validateImage(buffer);
    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.includes('severely underexposed'))).toBe(true);
  });
});

describe('Vision Provider Abstraction & Reliability (Section 8, 30, 31)', () => {
  it('returns structured detections with normalized bounding boxes', async () => {
    const provider = new MockVisionProvider();
    const result = await provider.analyzeImage({
      packId: 'PACK-001',
      images: [
        { imageId: 'img_1', buffer: Buffer.from('dummy'), mimeType: 'image/jpeg' },
      ],
      expectedCatalogHints: [
        { sku: 'SKU-A', name: 'Black T-Shirt', criticalAttributes: ['color', 'size'] },
      ],
    });

    expect(result.provider).toBe('mock-provider');
    expect(result.detections).toHaveLength(1);
    const det = result.detections[0];
    expect(det.confidence).toBeGreaterThan(0.9);
    expect(det.boundingBox.x).toBeGreaterThanOrEqual(0);
    expect(det.boundingBox.x).toBeLessThanOrEqual(1);
    expect(det.boundingBox.width).toBeGreaterThanOrEqual(0);
    expect(det.boundingBox.width).toBeLessThanOrEqual(1);
  });

  it('returns one mock detection per expected physical instance', async () => {
    const provider = new MockVisionProvider();
    const result = await provider.analyzeImage({
      packId: 'PACK-DUPLICATES',
      images: [
        { imageId: 'img_1', buffer: Buffer.from('dummy'), mimeType: 'image/jpeg' },
      ],
      expectedCatalogHints: [
        { sku: 'TSH-BLK-M', name: 'Black cotton T-shirt', criticalAttributes: ['color', 'size'], expectedQuantity: 2 },
      ],
    });

    expect(result.detections).toHaveLength(2);
    expect(new Set(result.detections.map(detection => detection.detectionId)).size).toBe(2);
  });

  it('handles provider failures gracefully', async () => {
    const provider = new MockVisionProvider({
      simulateFailure: true,
      failureReason: 'AI cluster connection timeout (504 Gateway Timeout)',
    });

    await expect(
      provider.analyzeImage({
        packId: 'PACK-FAIL',
        images: [{ imageId: 'img_1', buffer: Buffer.from('dummy'), mimeType: 'image/jpeg' }],
      })
    ).rejects.toThrow('AI cluster connection timeout');
  });
});
