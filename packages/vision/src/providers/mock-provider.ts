import { VisionProvider, VisionInput, VisionResult } from '../types.js';
import { DetectionDTO } from '@pack-manager/shared';

export interface MockVisionScenarioConfig {
  detections?: DetectionDTO[];
  simulateFailure?: boolean;
  failureReason?: string;
  simulateMalformedOutput?: boolean;
  latencyMs?: number;
}

/**
 * Replaceable Mock Vision Provider for automated tests and offline verification.
 */
export class MockVisionProvider implements VisionProvider {
  public readonly providerName = 'mock-provider';
  public readonly modelName = 'pack-vision-v1';
  public readonly modelVersion = '2026.09.25';

  private scenario: MockVisionScenarioConfig = {};

  constructor(initialScenario?: MockVisionScenarioConfig) {
    if (initialScenario) this.scenario = initialScenario;
  }

  public setScenario(scenario: MockVisionScenarioConfig): void {
    this.scenario = scenario;
  }

  public async analyzeImage(input: VisionInput): Promise<VisionResult> {
    if (this.scenario.latencyMs && this.scenario.latencyMs > 0) {
      await new Promise(r => setTimeout(r, this.scenario.latencyMs));
    }

    if (this.scenario.simulateFailure) {
      throw new Error(this.scenario.failureReason || 'Mock vision provider connection error 500');
    }

    if (this.scenario.simulateMalformedOutput) {
      // Return invalid structured data that will fail Zod validation
      return {
        provider: this.providerName,
        model: this.modelName,
        modelVersion: this.modelVersion,
        detections: [
          {
            // Missing required fields
            detectionId: '',
            imageIndex: 0,
            label: '',
            confidence: -5, // Invalid confidence
            boundingBox: { x: -1, y: 2, width: 0, height: 0 },
            attributes: {},
          } as DetectionDTO,
        ],
        rawResponse: { malformed: true },
      };
    }

    // Default: use configured scenario detections, or generate detections from catalog hints
    let detections = this.scenario.detections;

    if (!detections && input.expectedCatalogHints) {
      // Auto-synthesize clean detections for expected items
      let detectionIndex = 0;
      detections = input.expectedCatalogHints.flatMap(hint =>
        Array.from({ length: hint.expectedQuantity ?? 1 }, () => {
          const idx = detectionIndex++;
          return {
            detectionId: `det_${input.packId}_${idx + 1}`,
            imageIndex: 0,
            label: hint.name.toLowerCase(),
            confidence: 0.95,
            boundingBox: {
              x: 0.1 + (idx * 0.25) % 0.8,
              y: 0.15 + Math.floor(idx / 3) * 0.25,
              width: 0.2,
              height: 0.2,
            },
            attributes: hint.criticalAttributes.reduce((acc, attr) => {
              if (attr === 'color') acc.color = 'black';
              if (attr === 'size') acc.size = 'M';
              return acc;
            }, {} as Record<string, string>),
          };
        })
      );
    }

    return {
      provider: this.providerName,
      model: this.modelName,
      modelVersion: this.modelVersion,
      detections: detections || [],
      rawResponse: { mock: true, count: detections?.length || 0 },
    };
  }
}
