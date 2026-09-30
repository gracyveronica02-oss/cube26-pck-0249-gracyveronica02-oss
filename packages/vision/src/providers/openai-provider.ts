import { VisionProvider, VisionInput, VisionResult } from '../types.js';
import { DetectionDTO, DetectionDTOSchema } from '@pack-manager/shared';
import { z } from 'zod';

const OpenAIVisionOutputSchema = z.object({
  detections: z.array(DetectionDTOSchema),
});

export class OpenAIVisionProvider implements VisionProvider {
  public readonly providerName = 'openai';
  public readonly modelName: string;
  public readonly modelVersion = 'gpt-4o-2024-08-06';
  private apiKey?: string;

  constructor(options?: { apiKey?: string; modelName?: string }) {
    this.apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
    this.modelName = options?.modelName || 'gpt-4o';
  }

  public async analyzeImage(input: VisionInput): Promise<VisionResult> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not configured');
    }

    const expectedItems = (input.expectedCatalogHints || [])
      .map(hint => `- SKU: ${hint.sku}; name: ${hint.name}; expected quantity: ${hint.expectedQuantity ?? 1}; critical attributes: ${hint.criticalAttributes.join(', ')}`)
      .join('\n');

    const messages = [
      {
        role: 'system',
        content: `You are an expert computer vision model for warehouse outbound pack verification.
Detect visible items in the provided package photographs; do not infer concealed items. Expected order manifest (use only as a completeness check, never as evidence):
${expectedItems || '(not provided)'}
First visually count each product, then return one detection per physical item instance. Two identical items require two separate detections with distinct detectionIds, even when their boxes overlap. Never combine instances into one detection or use a quantity field. Recount against the manifest, but never add an item just to match its expected quantity.
Provide normalized bounding boxes [0, 1], attribute breakdowns (color, size, model, barcode, and visibility as fully_visible, partially_occluded, or unclear), and an honest confidence score. If identity or the number of overlapping instances is obscured, report confidence <= 0.60.
Return JSON with this structure: { "detections": [ ... ] }`,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Pack ID: ${input.packId}. Analyze the following images:` },
          ...input.images.map(img => ({
            type: 'image_url',
            image_url: {
              url: `data:${img.mimeType};base64,${img.buffer.toString('base64')}`,
            },
          })),
        ],
      },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI Vision API error ${response.status}: ${err}`);
    }

    const json = await response.json() as any;
    const rawContent = json.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('OpenAI returned empty message content');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error(`OpenAI output not valid JSON: ${rawContent.slice(0, 200)}`);
    }

    const validated = OpenAIVisionOutputSchema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(`OpenAI output schema validation failed: ${validated.error.message}`);
    }

    return {
      provider: this.providerName,
      model: this.modelName,
      modelVersion: this.modelVersion,
      detections: validated.data.detections,
      rawResponse: json,
    };
  }
}
