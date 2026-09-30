import {
  BoundingBox,
  DiscrepancyType,
  OperationalDecision,
  PackStatus,
  UserRole,
  DetectedItemDTO,
  ExpectedItemDTO,
} from '@pack-manager/shared';

export interface OrderItem {
  orderItemId: string;
  orderId: string;
  sku: string;
  expectedQuantity: number;
  productName: string;
  asin?: string;
  referenceImage?: string;
  criticalAttributes: string[];
  attributes: Record<string, string>;
}

export interface Order {
  orderId: string;
  orgId: string;
  externalOrderRef: string;
  channel: string;
  customerName?: string;
  shippingAddress?: Record<string, unknown>;
  items: OrderItem[];
  createdAt: Date;
}

export interface ProductVariant {
  variantId: string;
  productId: string;
  sku: string;
  variantName: string;
  color?: string;
  size?: string;
  model?: string;
  barcode?: string;
  attributes: Record<string, string>;
}

export interface Product {
  productId: string;
  orgId: string;
  sku: string;
  asin?: string;
  productName: string;
  description?: string;
  category?: string;
  brand?: string;
  barcode?: string;
  weightGrams?: number;
  dimensionsCm?: { length: number; width: number; height: number };
  criticalAttributes: string[];
  referenceImages: string[];
  active: boolean;
  variants: ProductVariant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PackImage {
  packImageId: string;
  packId: string;
  storagePath: string;
  viewAngle: string;
  resolutionW?: number;
  resolutionH?: number;
  blurScore?: number;
  exposureScore?: number;
  isValid: boolean;
  validationErrors?: string[];
  capturedAt: Date;
}

export interface Detection {
  detectionId: string;
  packImageId: string;
  imageIndex: number;
  label: string;
  confidence: number;
  boundingBox: BoundingBox;
  attributes: Record<string, string>;
  barcodeDetected?: string;
  physicalItemClusterId?: string;
  cropStoragePath?: string;
}

export interface SKUMatch {
  skuMatchId: string;
  detectionId: string;
  candidates: Array<{ sku: string; score: number }>;
  selectedSku?: string;
  confidence: number;
  matchSignals: Record<string, unknown>;
}

export interface Discrepancy {
  discrepancyId: string;
  analysisId: string;
  type: DiscrepancyType;
  expectedSku?: string;
  detectedSku?: string;
  expectedQuantity?: number;
  detectedQuantity?: number;
  details: Record<string, unknown>;
}

export interface Decision {
  decisionId: string;
  analysisId: string;
  operationalVerdict: OperationalDecision;
  summaryReason: string;
  ruleEvaluations: Record<string, unknown>;
  createdAt: Date;
}

export interface Analysis {
  analysisId: string;
  orgId: string;
  packId: string;
  analysisNumber: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  overallConfidence?: number;
  decision?: OperationalDecision;
  reasonSummary?: string;
  expectedItems?: ExpectedItemDTO[];
  detectedItems?: DetectedItemDTO[];
  executionTimeMs?: number;
  detections: Detection[];
  skuMatches: SKUMatch[];
  discrepancies: Discrepancy[];
  ruleEvaluations?: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date;
}

export interface Pack {
  packId: string;
  orgId: string;
  unitId: string;
  orderId: string;
  packingStation?: string;
  operatorId?: string;
  status: PackStatus;
  currentAnalysisId?: string;
  images: PackImage[];
  analyses: Analysis[];
  createdAt: Date;
  updatedAt: Date;
}
