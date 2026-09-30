import crypto from 'crypto';
import { WebhookPayload, WebhookPayloadSchema } from '@pack-manager/shared';

export interface WebhookDeliveryLog {
  deliveryId: string;
  orgId: string;
  packId: string;
  eventType: string;
  payload: WebhookPayload;
  targetUrl: string;
  httpStatus?: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'DEAD_LETTER';
  attempt: number;
  deliveredAt?: Date;
  error?: string;
}

export interface WebhookDispatcherOptions {
  secretKey?: string;
  targetUrl?: string;
  maxRetries?: number;
  initialBackoffMs?: number;
}

export class WebhookDispatcher {
  private secretKey: string;
  private defaultTargetUrl: string;
  private maxRetries: number;
  private initialBackoffMs: number;
  public deliveryLogs: WebhookDeliveryLog[] = [];

  constructor(options?: WebhookDispatcherOptions) {
    this.secretKey = options?.secretKey || 'default-secret-pack-manager-2026';
    this.defaultTargetUrl = options?.targetUrl || 'http://localhost:5000/webhook/fulfillment';
    this.maxRetries = options?.maxRetries ?? 3;
    this.initialBackoffMs = options?.initialBackoffMs ?? 500;
  }

  public generateSignature(payload: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');
  }

  public async dispatchVerificationCompleted(
    data: Omit<WebhookPayload, 'eventId' | 'eventType' | 'timestamp'> & { targetUrl?: string }
  ): Promise<WebhookDeliveryLog> {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const targetUrl = data.targetUrl || this.defaultTargetUrl;

    const payload: WebhookPayload = {
      eventId,
      eventType: 'pack.verification.completed',
      orgId: data.orgId,
      unitId: data.unitId,
      packId: data.packId,
      orderId: data.orderId,
      decision: data.decision,
      reasonSummary: data.reasonSummary,
      discrepancies: data.discrepancies,
      expectedItems: data.expectedItems,
      detectedItems: data.detectedItems,
      evidence: data.evidence,
      timestamp: new Date().toISOString(),
    };

    // Validate payload against schema
    WebhookPayloadSchema.parse(payload);

    const deliveryLog: WebhookDeliveryLog = {
      deliveryId: `del_${Date.now()}`,
      orgId: data.orgId,
      packId: data.packId,
      eventType: payload.eventType,
      payload,
      targetUrl,
      status: 'PENDING',
      attempt: 0,
    };

    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(payloadString);

    let currentBackoff = this.initialBackoffMs;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      deliveryLog.attempt = attempt;

      try {
        if (targetUrl.startsWith('http://mock') || targetUrl.startsWith('http://localhost:5000')) {
          // Simulated mock delivery for offline/test environments
          deliveryLog.status = 'SUCCESS';
          deliveryLog.httpStatus = 200;
          deliveryLog.deliveredAt = new Date();
          this.deliveryLogs.push(deliveryLog);
          return deliveryLog;
        }

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-packmanager-signature-256': signature,
            'x-packmanager-event-id': eventId,
          },
          body: payloadString,
        });

        deliveryLog.httpStatus = response.status;

        if (response.ok) {
          deliveryLog.status = 'SUCCESS';
          deliveryLog.deliveredAt = new Date();
          this.deliveryLogs.push(deliveryLog);
          return deliveryLog;
        }

        deliveryLog.error = `HTTP ${response.status}: ${await response.text()}`;
      } catch (err) {
        deliveryLog.error = (err as Error).message;
      }

      // Exponential backoff
      if (attempt < this.maxRetries) {
        await new Promise(r => setTimeout(r, currentBackoff));
        currentBackoff *= 2;
      }
    }

    // Permanently failed -> Dead-Letter
    deliveryLog.status = 'DEAD_LETTER';
    this.deliveryLogs.push(deliveryLog);
    return deliveryLog;
  }
}
