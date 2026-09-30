import { WebhookPayload } from '@pack-manager/shared';
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
export declare class WebhookDispatcher {
    private secretKey;
    private defaultTargetUrl;
    private maxRetries;
    private initialBackoffMs;
    deliveryLogs: WebhookDeliveryLog[];
    constructor(options?: WebhookDispatcherOptions);
    generateSignature(payload: string): string;
    dispatchVerificationCompleted(data: Omit<WebhookPayload, 'eventId' | 'eventType' | 'timestamp'> & {
        targetUrl?: string;
    }): Promise<WebhookDeliveryLog>;
}
//# sourceMappingURL=webhook.d.ts.map