"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookDispatcher = void 0;
const crypto_1 = __importDefault(require("crypto"));
const shared_1 = require("@pack-manager/shared");
class WebhookDispatcher {
    secretKey;
    defaultTargetUrl;
    maxRetries;
    initialBackoffMs;
    deliveryLogs = [];
    constructor(options) {
        this.secretKey = options?.secretKey || 'default-secret-pack-manager-2026';
        this.defaultTargetUrl = options?.targetUrl || 'http://localhost:5000/webhook/fulfillment';
        this.maxRetries = options?.maxRetries ?? 3;
        this.initialBackoffMs = options?.initialBackoffMs ?? 500;
    }
    generateSignature(payload) {
        return crypto_1.default
            .createHmac('sha256', this.secretKey)
            .update(payload)
            .digest('hex');
    }
    async dispatchVerificationCompleted(data) {
        const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const targetUrl = data.targetUrl || this.defaultTargetUrl;
        const payload = {
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
        shared_1.WebhookPayloadSchema.parse(payload);
        const deliveryLog = {
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
            }
            catch (err) {
                deliveryLog.error = err.message;
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
exports.WebhookDispatcher = WebhookDispatcher;
//# sourceMappingURL=webhook.js.map