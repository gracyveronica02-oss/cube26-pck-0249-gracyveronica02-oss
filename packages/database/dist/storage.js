"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoragePaths = exports.InMemoryObjectStorage = exports.S3ObjectStorage = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
/**
 * Standard S3 / MinIO Object Storage Provider
 */
class S3ObjectStorage {
    client;
    bucket;
    constructor(config) {
        this.bucket = config.bucket;
        this.client = new client_s3_1.S3Client({
            endpoint: config.endpoint,
            region: config.region || 'us-east-1',
            credentials: config.accessKeyId && config.secretAccessKey ? {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            } : undefined,
            forcePathStyle: config.forcePathStyle ?? true,
        });
    }
    async upload(key, data, contentType = 'image/jpeg') {
        await this.client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: data,
            ContentType: contentType,
        }));
        return key;
    }
    async download(key) {
        const response = await this.client.send(new client_s3_1.GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        }));
        const stream = response.Body;
        if (!stream)
            throw new Error(`Empty stream for key: ${key}`);
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }
    async getPresignedUrl(key, expiresInSeconds = 900) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        return (0, s3_request_presigner_1.getSignedUrl)(this.client, command, { expiresIn: expiresInSeconds });
    }
}
exports.S3ObjectStorage = S3ObjectStorage;
/**
 * In-Memory / Ephemeral Object Storage Provider for local test suites
 */
class InMemoryObjectStorage {
    storage = new Map();
    async upload(key, data, contentType = 'image/jpeg') {
        this.storage.set(key, { data, contentType });
        return key;
    }
    async download(key) {
        const item = this.storage.get(key);
        if (!item)
            throw new Error(`Object not found: ${key}`);
        return item.data;
    }
    async getPresignedUrl(key) {
        if (!this.storage.has(key))
            throw new Error(`Object not found for presigned URL: ${key}`);
        return `https://storage.local/presigned/${key}?token=mock_signed_token`;
    }
}
exports.InMemoryObjectStorage = InMemoryObjectStorage;
/**
 * Storage Key Path Helper conforming to Section 23
 */
exports.StoragePaths = {
    packOriginal: (orgId, packId, imageId, ext = 'jpg') => `orgs/${orgId}/packs/${packId}/original/${imageId}.${ext}`,
    packProcessed: (orgId, packId, analysisId, imageId, ext = 'jpg') => `orgs/${orgId}/packs/${packId}/analysis/${analysisId}/processed/${imageId}.${ext}`,
    packCrop: (orgId, packId, analysisId, detectionId, ext = 'jpg') => `orgs/${orgId}/packs/${packId}/analysis/${analysisId}/crops/${detectionId}.${ext}`,
    productReference: (orgId, sku, imageId, ext = 'jpg') => `orgs/${orgId}/products/${sku}/reference/${imageId}.${ext}`,
};
//# sourceMappingURL=storage.js.map