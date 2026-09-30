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
export declare class S3ObjectStorage implements IObjectStorage {
    private client;
    private bucket;
    constructor(config: StorageConfig);
    upload(key: string, data: Buffer, contentType?: string): Promise<string>;
    download(key: string): Promise<Buffer>;
    getPresignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
}
/**
 * In-Memory / Ephemeral Object Storage Provider for local test suites
 */
export declare class InMemoryObjectStorage implements IObjectStorage {
    private storage;
    upload(key: string, data: Buffer, contentType?: string): Promise<string>;
    download(key: string): Promise<Buffer>;
    getPresignedUrl(key: string): Promise<string>;
}
/**
 * Storage Key Path Helper conforming to Section 23
 */
export declare const StoragePaths: {
    packOriginal: (orgId: string, packId: string, imageId: string, ext?: string) => string;
    packProcessed: (orgId: string, packId: string, analysisId: string, imageId: string, ext?: string) => string;
    packCrop: (orgId: string, packId: string, analysisId: string, detectionId: string, ext?: string) => string;
    productReference: (orgId: string, sku: string, imageId: string, ext?: string) => string;
};
//# sourceMappingURL=storage.d.ts.map