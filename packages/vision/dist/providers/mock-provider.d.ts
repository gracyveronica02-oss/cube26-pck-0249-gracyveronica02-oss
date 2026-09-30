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
export declare class MockVisionProvider implements VisionProvider {
    readonly providerName = "mock-provider";
    readonly modelName = "pack-vision-v1";
    readonly modelVersion = "2026.09.25";
    private scenario;
    constructor(initialScenario?: MockVisionScenarioConfig);
    setScenario(scenario: MockVisionScenarioConfig): void;
    analyzeImage(input: VisionInput): Promise<VisionResult>;
}
//# sourceMappingURL=mock-provider.d.ts.map