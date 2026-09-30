import { FastifyRequest, FastifyReply } from 'fastify';

export async function idempotencyMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const idempotencyKey = (request.headers['idempotency-key'] as string) || (request.headers['x-idempotency-key'] as string);

  if (!idempotencyKey && request.method === 'POST') {
    // Generate one if absent, but prefer client header
    request.idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  } else {
    request.idempotencyKey = idempotencyKey;
  }
}
