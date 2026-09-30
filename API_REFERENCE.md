# Pack Manager REST API Reference

The Pack Manager REST API provides endpoints for ingesting orders, uploading carton photographs, triggering automated verification, reviewing discrepancies, and integrating with Warehouse Management Systems (WMS/ERP).

- **Base URL**: `http://localhost:4000/api/v1`
- **Interactive Swagger UI**: `http://localhost:4000/documentation`
- **Auth Headers**:
  - `x-org-id`: Organization Identifier (e.g. `org_demo_alpha`)
  - `x-user-id`: User / Service Account Identifier (e.g. `operator_1`)
  - `x-user-role`: `ADMIN` | `SUPERVISOR` | `QC_OPERATOR` | `VIEWER`
  - `x-idempotency-key` (Optional): Unique string for duplicate suppression

---

## 1. Pack Verification Endpoints

### 1.1 Create Pack Container
`POST /api/v1/packs`

Creates an outbound pack record associated with a customer order.

**Request Body:**
```json
{
  "unitId": "CARTON-88219",
  "orderId": "ORD-101",
  "packingStation": "STATION-01",
  "operatorId": "packer_mary"
}
```

**Response (201 Created):**
```json
{
  "packId": "PACK-M5K89-A1B",
  "orgId": "org_demo_alpha",
  "unitId": "CARTON-88219",
  "orderId": "ORD-101",
  "status": "RECEIVED",
  "images": [],
  "createdAt": "2026-09-27T12:00:00.000Z"
}
```

---

### 1.2 Upload Pack Photograph
`POST /api/v1/packs/:packId/images`

Uploads an overhead or angled image of the open carton as Base64 data.

**Request Body:**
```json
{
  "imageBase64": "/9j/4AAQSkZJRgABAQEASABIAAD/...",
  "viewAngle": "TOP_DOWN"
}
```

**Response (201 Created):**
```json
{
  "packImageId": "IMG-1727443200",
  "packId": "PACK-M5K89-A1B",
  "storagePath": "org_demo_alpha/packs/PACK-M5K89-A1B/originals/IMG-1727443200.jpg",
  "viewAngle": "TOP_DOWN",
  "isValid": true,
  "url": "https://storage.local/presigned/..."
}
```

---

### 1.3 Trigger Verification Analysis
`POST /api/v1/packs/:packId/analyze`

Enqueues asynchronous verification through the 12-step deterministic pipeline.

**Response (202 Accepted):**
```json
{
  "jobId": "job_1727443210_88af",
  "orgId": "org_demo_alpha",
  "packId": "PACK-M5K89-A1B",
  "status": "PENDING",
  "attempt": 1,
  "createdAt": "2026-09-27T12:00:10.000Z"
}
```

---

### 1.4 Batch Analyze Packs
`POST /api/v1/batch-analyze`

Triggers analysis for up to 10 packs in a single batch call.

**Request Body:**
```json
{
  "packIds": ["PACK-001", "PACK-002", "PACK-003"]
}
```

**Response (202 Accepted):**
```json
{
  "enqueuedCount": 3,
  "jobs": [
    { "jobId": "job_batch_001", "packId": "PACK-001", "status": "PENDING" },
    { "jobId": "job_batch_002", "packId": "PACK-002", "status": "PENDING" },
    { "jobId": "job_batch_003", "packId": "PACK-003", "status": "PENDING" }
  ],
  "notFound": []
}
```

---

### 1.5 Get Pack Details
`GET /api/v1/packs/:packId`

Retrieves pack metadata, associated order line items, images with presigned URLs, and analysis history.

---

### 1.6 List Packs with Filters
`GET /api/v1/packs?status=STOP_AND_FIX&orderId=ORD-101&limit=20&offset=0`

Lists packs matching criteria with pagination.

---

## 2. Evidence Dossier & Decision Endpoints

### 2.1 Get Analysis Evidence Dossier
`GET /api/v1/analyses/:analysisId`

Returns the full verifiable evidence dossier including bounding boxes, SKU candidates, discrepancies, rule logs, and model attribution.

**Response (200 OK):**
```json
{
  "analysis": {
    "analysisId": "ANL-PACK-001-01",
    "packId": "PACK-001",
    "decision": "STOP_AND_FIX",
    "overallConfidence": 0.94,
    "executionTimeMs": 1137,
    "detections": [
      {
        "detectionId": "det_1",
        "label": "heavyweight cotton crewneck t-shirt",
        "confidence": 0.95,
        "boundingBox": { "x": 0.1, "y": 0.1, "width": 0.35, "height": 0.4 },
        "attributes": { "color": "black", "size": "M" }
      }
    ],
    "discrepancies": [
      {
        "type": "MISSING_ITEM",
        "expectedSku": "SKU-A",
        "expectedQuantity": 2,
        "detectedQuantity": 1,
        "details": { "productName": "Heavyweight Cotton Crewneck T-Shirt (M)" }
      }
    ]
  },
  "order": { ... }
}
```

---

### 2.2 Operator Review & Human Override
`POST /api/v1/analyses/:analysisId/review`

Records an authorized operator's review, override, or repack rejection while preserving immutable AI audit logs.

**Request Body:**
```json
{
  "action": "APPROVED_OVERRIDE",
  "operatorVerdict": "SEAL",
  "reasonCode": "PROMOTIONAL_SAMPLE_EXCLUDED",
  "notes": "Verified promotional gift item is approved to ship."
}
```

**Response (201 Created):**
```json
{
  "reviewId": "rev_1727443350",
  "operatorId": "operator_1",
  "action": "APPROVED_OVERRIDE",
  "operatorVerdict": "SEAL",
  "createdAt": "2026-09-27T12:02:30.000Z"
}
```

---

## 3. Orders & Products

### 3.1 Ingest Customer Order
`POST /api/v1/orders`

```json
{
  "orderId": "ORD-2024-001",
  "externalOrderRef": "SHOPIFY-#99104",
  "channel": "Shopify US",
  "customerName": "Jane Doe",
  "items": [
    {
      "sku": "SKU-A",
      "expectedQuantity": 2,
      "productName": "Black T-Shirt (M)",
      "asin": "B0EXAMPLE01",
      "referenceImage": "https://seller.example/products/shirt.jpg",
      "criticalAttributes": ["color", "size"],
      "attributes": { "color": "black", "size": "M" }
    }
  ]
}
```

---

### 3.2 Look Up an Order from a QR Payload
`GET /api/v1/orders/lookup?code=<encoded-order-reference>`

The `code` may be a plain order ID/external reference, JSON containing `orderId` (or `order_id`) and optional `unitId`, or a URL with `orderId`/`order_id` and optional `unitId` query parameters. The response includes the matched order and decoded carton ID when present.

---

### 3.3 Create or Update Catalog Product
`POST /api/v1/products`

Registers a SKU, variants, critical attributes, and barcodes in the active catalog.

---

## 4. Webhooks & Integrations

### 4.1 Register Webhook
`POST /api/v1/webhooks`

```json
{
  "url": "https://wms.fulfillment.com/api/pack-events",
  "events": ["pack.verification.completed"],
  "secretKey": "whsec_supersecretkey"
}
```

**Delivered Webhook Payload Schema (`pack.verification.completed`):**
```json
{
  "eventId": "evt_1727443400_abc123",
  "eventType": "pack.verification.completed",
  "orgId": "org_demo_alpha",
  "unitId": "CARTON-88219",
  "packId": "PACK-M5K89-A1B",
  "orderId": "ORD-101",
  "decision": "SEAL",
  "reasonSummary": "Order contents verified: all items match order exactly.",
  "discrepancies": [],
  "expectedItems": [{ "sku": "SKU-A", "quantity": 2 }],
  "detectedItems": [{ "sku": "SKU-A", "quantity": 2, "confidence": 0.96 }],
  "evidence": {
    "analysisId": "ANL-PACK-001-01",
    "photoCount": 1,
    "annotatedImageUrls": ["https://storage.local/..."]
  },
  "timestamp": "2026-09-27T12:00:15.000Z"
}
```
*Signatures are transmitted in header: `x-packmanager-signature-256: HMAC_SHA256(payload, secretKey)`.*

---

## 5. QC Queue & Observability

### 5.1 QC Review Queue
`GET /api/v1/qc/queue`

Returns all cartons held with status `STOP_AND_FIX` or `MANUAL_REVIEW`, prioritized by longest conveyor wait time.

### 5.2 Real-Time Dashboard Metrics
`GET /api/v1/dashboard/metrics`

Returns live telemetry including separate uncertain and pending rates, `allItemsPresentRate`, `quantitiesCorrectRate`, comparison sample count, explicit occlusion count, average latency, and discrepancy breakdown. Uncertain comparisons are excluded from item/count rates. Targets are `uncertainRateTarget` (5%) and `pendingRateTarget` (2%); `uncertainRateKillThreshold` is 10%.

`allItemsPresentRate` measures conclusive cartons where every expected SKU was observed at least once. `quantitiesCorrectRate` measures conclusive cartons with exact per-SKU counts and no unexpected SKUs. `comparisonSampleCount` is their shared denominator. `uncertainRate` uses `completedDecisionCount`; pending and comparison rates are shown as unavailable in the dashboard when their denominator is zero. `occlusionCount` counts cartons whose latest analysis explicitly flagged visible partial occlusion. These metrics describe the current single-shot UI and cannot measure fully concealed contents.

### 5.3 Liveness & Readiness Probes
- `GET /health` - HTTP 200 `{"status": "ok"}`
- `GET /ready` - HTTP 200 `{"status": "ready"}`
