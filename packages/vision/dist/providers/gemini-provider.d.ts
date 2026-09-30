import { VisionProvider, VisionInput, VisionResult } from '../types.js';
export declare class GeminiVisionProvider implements VisionProvider {
    readonly providerName = "google-gemini";
    readonly modelName: string;
    readonly modelVersion = "gemini-1.5-pro-002";
    private apiKey?;
    constructor(options?: {
        apiKey?: string;
        modelName?: string;
    });
    analyzeImage(input: VisionInput): Promise<VisionResult>;
}
//# sourceMappingURL=gemini-provider.d.ts.map