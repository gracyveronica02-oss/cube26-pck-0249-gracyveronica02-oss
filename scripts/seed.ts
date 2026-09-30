/**
 * Database Seed Script for Outbound Pack Manager
 * Seeds product catalog (SKU-A, SKU-B, SKU-C, SKU-D), variants, orders, and initial test packs
 * Supports both org_demo_alpha and org_demo_bravo tenants.
 */

export const SEED_CATALOG = [
  {
    sku: 'SKU-A',
    asin: 'B08XYZ1111',
    productName: 'Black T-Shirt',
    description: '100% Combed Cotton Crewneck Black T-Shirt',
    category: 'Apparel',
    brand: 'Basics Co',
    barcode: '111122223333',
    criticalAttributes: ['color', 'size'],
    variants: [
      {
        sku: 'SKU-A-M',
        variantName: 'Size M',
        color: 'black',
        size: 'M',
        barcode: '111122223333',
        attributes: { color: 'black', size: 'M' },
      },
    ],
  },
  {
    sku: 'SKU-B',
    asin: 'B08XYZ2222',
    productName: 'Blue Cap',
    description: 'Cotton Twill Adjustable Strapback Blue Baseball Cap',
    category: 'Accessories',
    brand: 'Headwear Pro',
    barcode: '444455556666',
    criticalAttributes: ['color'],
    variants: [
      {
        sku: 'SKU-B',
        variantName: 'Standard Blue',
        color: 'blue',
        barcode: '444455556666',
        attributes: { color: 'blue' },
      },
    ],
  },
  {
    sku: 'SKU-C',
    asin: 'B08XYZ3333',
    productName: 'Red Cap',
    description: 'Cotton Twill Adjustable Strapback Red Baseball Cap',
    category: 'Accessories',
    brand: 'Headwear Pro',
    barcode: '777788889999',
    criticalAttributes: ['color'],
    variants: [
      {
        sku: 'SKU-C',
        variantName: 'Standard Red',
        color: 'red',
        barcode: '777788889999',
        attributes: { color: 'red' },
      },
    ],
  },
  {
    sku: 'SKU-D',
    asin: 'B08XYZ4444',
    productName: 'White T-Shirt',
    description: 'Premium Soft Cotton Regular Fit White T-Shirt',
    category: 'Apparel',
    brand: 'Basics Co',
    barcode: '888899990000',
    criticalAttributes: ['color', 'size'],
    variants: [
      {
        sku: 'SKU-D-L',
        variantName: 'Size L',
        color: 'white',
        size: 'L',
        barcode: '888899990001',
        attributes: { color: 'white', size: 'L' },
      },
      {
        sku: 'SKU-D-M',
        variantName: 'Size M',
        color: 'white',
        size: 'M',
        barcode: '888899990002',
        attributes: { color: 'white', size: 'M' },
      },
    ],
  },
];

export const SEED_ORDERS = [
  {
    orderId: 'ORD-001',
    externalOrderRef: 'AMZ-MFN-101-2026',
    channel: 'amazon_mfn',
    customerName: 'Marcus Vance',
    items: [
      { sku: 'SKU-A', qty: 2, name: 'Black T-Shirt', criticalAttributes: ['color', 'size'], attributes: { color: 'black', size: 'M' } },
      { sku: 'SKU-B', qty: 1, name: 'Blue Cap', criticalAttributes: ['color'], attributes: { color: 'blue' } },
    ],
  },
  {
    orderId: 'ORD-002',
    externalOrderRef: 'SHOPIFY-8821',
    channel: 'shopify',
    customerName: 'Elena Rostova',
    items: [
      { sku: 'SKU-D-L', qty: 1, name: 'White T-Shirt', criticalAttributes: ['color', 'size'], attributes: { color: 'white', size: 'L' } },
    ],
  },
  {
    orderId: 'ORD-003',
    externalOrderRef: 'WALMART-5509',
    channel: 'walmart',
    customerName: 'David Chen',
    items: [
      { sku: 'SKU-A', qty: 5, name: 'Black T-Shirt', criticalAttributes: ['color', 'size'], attributes: { color: 'black', size: 'M' } },
    ],
  },
];

console.log('Seed data definitions ready. Seeded products: 4, Seeded orders: 3');
