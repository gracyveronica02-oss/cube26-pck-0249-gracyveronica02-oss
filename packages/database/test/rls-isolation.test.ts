import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryRepositories,
  InMemoryObjectStorage,
  StoragePaths,
} from '../src/index.js';
import { PackStatus } from '@pack-manager/shared';

describe('Multi-Tenancy Isolation (Engineering Rule 1: Tenancy before features)', () => {
  let repos: InMemoryRepositories;
  let storage: InMemoryObjectStorage;

  beforeEach(() => {
    repos = new InMemoryRepositories();
    storage = new InMemoryObjectStorage();
  });

  it('guarantees tenant org_demo_bravo sees 0 rows created by org_demo_alpha', async () => {
    // 1. Create resources under org_demo_alpha
    await repos.createPack({
      packId: 'PACK-ALPHA-001',
      orgId: 'org_demo_alpha',
      unitId: 'UNIT-0001',
      orderId: 'ORD-ALPHA-100',
      status: PackStatus.RECEIVED,
      images: [],
      analyses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await repos.createOrder({
      orderId: 'ORD-ALPHA-100',
      orgId: 'org_demo_alpha',
      externalOrderRef: 'EXT-100',
      channel: 'amazon_mfn',
      items: [
        {
          orderItemId: 'item-1',
          orderId: 'ORD-ALPHA-100',
          sku: 'SKU-A',
          expectedQuantity: 2,
          productName: 'Black T-Shirt',
          criticalAttributes: ['color', 'size'],
          attributes: { color: 'black', size: 'M' },
        },
      ],
      createdAt: new Date(),
    });

    // 2. Query as org_demo_bravo
    const bravoPacks = await repos.listPacks('org_demo_bravo');
    expect(bravoPacks).toHaveLength(0);

    const packDirectLookup = await repos.getPackById('org_demo_bravo', 'PACK-ALPHA-001');
    expect(packDirectLookup).toBeNull();

    const orderDirectLookup = await repos.getOrderById('org_demo_bravo', 'ORD-ALPHA-100');
    expect(orderDirectLookup).toBeNull();

    const orderRefLookup = await repos.getOrderByExternalRef('org_demo_bravo', 'EXT-100');
    expect(orderRefLookup).toBeNull();

    // 3. Query as org_demo_alpha sees its own rows
    const alphaPacks = await repos.listPacks('org_demo_alpha');
    expect(alphaPacks).toHaveLength(1);
    expect(alphaPacks[0].packId).toBe('PACK-ALPHA-001');
  });

  it('guarantees storage keys are tenant-partitioned to prevent cross-org image guessing', async () => {
    const alphaKey = StoragePaths.packOriginal('org_demo_alpha', 'PACK-001', 'IMG-001');
    const bravoKey = StoragePaths.packOriginal('org_demo_bravo', 'PACK-001', 'IMG-001');

    expect(alphaKey).toBe('orgs/org_demo_alpha/packs/PACK-001/original/IMG-001.jpg');
    expect(bravoKey).toBe('orgs/org_demo_bravo/packs/PACK-001/original/IMG-001.jpg');
    expect(alphaKey).not.toEqual(bravoKey);

    // Upload image to alpha
    const fakeImageBuffer = Buffer.from('fake-jpeg-bytes');
    await storage.upload(alphaKey, fakeImageBuffer);

    // Alpha can download
    const downloaded = await storage.download(alphaKey);
    expect(downloaded).toEqual(fakeImageBuffer);

    // Bravo key does not exist
    await expect(storage.download(bravoKey)).rejects.toThrow('Object not found');
  });

  it('enforces idempotency on processing jobs', async () => {
    const jobData = {
      jobId: 'job_001',
      orgId: 'org_demo_alpha',
      packId: 'PACK-001',
      idempotencyKey: 'idem_key_xyz',
      status: 'PENDING' as const,
      attempt: 1,
      maxAttempts: 3,
      createdAt: new Date(),
    };

    // First insertion succeeds
    await repos.createJob(jobData);

    // Second insertion with identical idempotency key throws error
    await expect(repos.createJob(jobData)).rejects.toThrow('Duplicate idempotency key');
  });

  it('generates secure presigned URLs without exposing storage credentials', async () => {
    const key = StoragePaths.packCrop('org_demo_alpha', 'PACK-001', 'ANL-001', 'DET-001');
    await storage.upload(key, Buffer.from('crop-bytes'));

    const presigned = await storage.getPresignedUrl(key);
    expect(presigned).toContain('https://storage.local/presigned/');
    expect(presigned).toContain(key);
    expect(presigned).not.toContain('secretAccessKey');
  });
});
