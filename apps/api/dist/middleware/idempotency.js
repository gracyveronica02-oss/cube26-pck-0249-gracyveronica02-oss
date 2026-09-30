"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idempotencyMiddleware = idempotencyMiddleware;
async function idempotencyMiddleware(request, reply) {
    const idempotencyKey = request.headers['idempotency-key'] || request.headers['x-idempotency-key'];
    if (!idempotencyKey && request.method === 'POST') {
        // Generate one if absent, but prefer client header
        request.idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }
    else {
        request.idempotencyKey = idempotencyKey;
    }
}
//# sourceMappingURL=idempotency.js.map