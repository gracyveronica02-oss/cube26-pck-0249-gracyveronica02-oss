"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiVisionProvider = void 0;
const shared_1 = require("@pack-manager/shared");
const zod_1 = require("zod");
const GeminiVisionOutputSchema = zod_1.z.object({
    detections: zod_1.z.array(shared_1.DetectionDTOSchema),
});
class GeminiVisionProvider {
    providerName = 'google-gemini';
    modelName;
    modelVersion = 'gemini-1.5-pro-002';
    apiKey;
    constructor(options) {
        this.apiKey = options?.apiKey || process.env.GEMINI_API_KEY;
        this.modelName = options?.modelName || 'gemini-1.5-pro';
    }
    async analyzeImage(input) {
        if (!this.apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is not configured');
        }
        const catalogContext = (input.expectedCatalogHints || [])
            .map(h => `- SKU: ${h.sku}, Name: ${h.name}, Expected quantity: ${h.expectedQuantity ?? 1}, Critical Attributes: ${h.criticalAttributes.join(', ')}`)
            .join('\n');
        const prompt = `You are a high-precision computer vision model for warehouse outbound package verification.
Analyze the photograph(s) of the open package and detect all physical items inside.

EXPECTED ORDER CONTEXT:
${catalogContext}

CRITICAL RULES:
1. First make a visual count of each product, then return one detection for every physical item instance. Two identical items require two separate detections with distinct detectionIds, even when their boxes overlap. Never combine instances into one detection or use a quantity field.
2. Recount each SKU against the expected quantities above as a completeness check only. The manifest is not evidence: never add an item just to match the expected quantity.
3. Provide precise normalized bounding box [0, 1] for each item: x, y, width, height.
4. Identify attributes: color, size, model, and barcode if visible.
5. In attributes, include visibility as "fully_visible", "partially_occluded", or "unclear" based only on what the photograph shows.
6. Identify every visible expected and unexpected item from the photograph.
7. Assign an honest confidence score between 0.0 and 1.0. Do NOT overestimate confidence.
8. If an item's identity or the number of overlapping instances is obscured, report confidence <= 0.60. Never infer concealed items or quantities.

Return JSON adhering exactly to this schema:
{
  "detections": [
    {
      "detectionId": "det-001",
      "imageIndex": 0,
      "label": "black t-shirt",
      "confidence": 0.94,
      "boundingBox": { "x": 0.12, "y": 0.20, "width": 0.31, "height": 0.42 },
      "attributes": { "color": "black", "size": "M", "visibility": "fully_visible" },
      "barcodeDetected": "optional-barcode-string"
    }
  ]
}`;
        // Format parts
        const contents = [
            {
                role: 'user',
                parts: [
                    { text: prompt },
                    ...input.images.map(img => ({
                        inlineData: {
                            mimeType: img.mimeType,
                            data: img.buffer.toString('base64'),
                        },
                    })),
                ],
            },
        ];
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.1,
                },
            }),
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API error ${response.status}: ${errText}`);
        }
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
            throw new Error('Gemini API returned empty response candidates');
        }
        let parsedJson;
        try {
            parsedJson = JSON.parse(rawText);
        }
        catch {
            throw new Error(`Failed to parse Gemini output as JSON: ${rawText.slice(0, 200)}`);
        }
        // Strict Zod Validation (Section 31: AI outputs must be schema-validated)
        const validated = GeminiVisionOutputSchema.safeParse(parsedJson);
        if (!validated.success) {
            throw new Error(`Gemini output failed schema validation: ${validated.error.message}`);
        }
        return {
            provider: this.providerName,
            model: this.modelName,
            modelVersion: this.modelVersion,
            detections: validated.data.detections,
            rawResponse: data,
        };
    }
}
exports.GeminiVisionProvider = GeminiVisionProvider;
//# sourceMappingURL=gemini-provider.js.map