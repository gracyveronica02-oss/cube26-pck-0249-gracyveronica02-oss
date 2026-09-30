import { VisionProvider, VisionInput, VisionResult } from '../types.js';
export declare class OpenAIVisionProvider implements VisionProvider {
    readonly providerName = "openai";
    readonly modelName: string;
    readonly modelVersion = "gpt-4o-2024-08-06";
    private apiKey?;
    constructor(options?: {
        apiKey?: string;
        modelName?: string;
    });
    analyzeImage(input: VisionInput): Promise<VisionResult>;
}
//# sourceMappingURL=openai-provider.d.ts.map