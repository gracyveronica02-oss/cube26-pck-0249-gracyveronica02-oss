import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageConfig {
  endpoint?: string;
  region?: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
}

export interface IObjectStorage {
  upload(key: string, data: Buffer, contentType?: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  getPresignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

/**
 * Standard S3 / MinIO Object Storage Provider
 */
export class S3ObjectStorage implements IObjectStorage {
  private client: S3Client;
  private bucket: string;

  constructor(config: StorageConfig) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region || 'us-east-1',
      credentials: config.accessKeyId && config.secretAccessKey ? {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      } : undefined,
      forcePathStyle: config.forcePathStyle ?? true,
    });
  }

  public async upload(key: string, data: Buffer, contentType = 'image/jpeg'): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      })
    );
    return key;
  }

  public async download(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
    const stream = response.Body;
    if (!stream) throw new Error(`Empty stream for key: ${key}`);
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  public async getPresignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}

/**
 * In-Memory / Ephemeral Object Storage Provider for local test suites
 */
export class InMemoryObjectStorage implements IObjectStorage {
  private storage = new Map<string, { data: Buffer; contentType: string }>();

  public async upload(key: string, data: Buffer, contentType = 'image/jpeg'): Promise<string> {
    this.storage.set(key, { data, contentType });
    return key;
  }

  public async download(key: string): Promise<Buffer> {
    const item = this.storage.get(key);
    if (!item) throw new Error(`Object not found: ${key}`);
    return item.data;
  }

  public async getPresignedUrl(key: string): Promise<string> {
    if (!this.storage.has(key)) throw new Error(`Object not found for presigned URL: ${key}`);
    return `https://storage.local/presigned/${key}?token=mock_signed_token`;
  }
}

/**
 * Storage Key Path Helper conforming to Section 23
 */
export const StoragePaths = {
  packOriginal: (orgId: string, packId: string, imageId: string, ext = 'jpg') =>
    `orgs/${orgId}/packs/${packId}/original/${imageId}.${ext}`,
  packProcessed: (orgId: string, packId: string, analysisId: string, imageId: string, ext = 'jpg') =>
    `orgs/${orgId}/packs/${packId}/analysis/${analysisId}/processed/${imageId}.${ext}`,
  packCrop: (orgId: string, packId: string, analysisId: string, detectionId: string, ext = 'jpg') =>
    `orgs/${orgId}/packs/${packId}/analysis/${analysisId}/crops/${detectionId}.${ext}`,
  productReference: (orgId: string, sku: string, imageId: string, ext = 'jpg') =>
    `orgs/${orgId}/products/${sku}/reference/${imageId}.${ext}`,
};
