# Pack Manager AI Agent for E-Commerce Fulfillment QC

An AI-assisted quality control system for outbound order verification. Pack Manager inspects photographs of open shipping cartons, reconciles identified products and quantities against an order manifest, and returns one operational decision: **`SEAL`**, **`STOP & FIX`**, or **`UNCERTAIN`**.

---

## 1. Business Problem & Solution

### The Bottleneck:
Fulfillment operations (e-commerce brands, sellers, and 3PL providers) currently rely on manual visual inspection before cartons are taped and labeled.
- **Slow**: 5–10 minutes per box with manual checklists.
- **Expensive**: High labor cost per packing bench.
- **Error-prone**: Human operators miss 2–5% of missing or swapped items due to fatigue.
- **Inconsistent**: Verification standards vary widely across shifts and staff.

### The Pack Manager Solution:
1. **Multi-Modal Capture**: Ingests overhead photographs from cameras or mobile devices.
2. **Item Detection & Localization**: Extracts SKUs, visual features, colors, packaging, and barcodes.
3. **Single-Shot Capture**: The current operator flow checks one overhead open-carton photo. It flags visible occlusion as uncertain; fully concealed items cannot be verified from one image and must not be inferred.
4. **Deterministic Reconciliation**: Pure mathematical comparison of observed quantities and variants against expected order manifests.
5. **Calibrated Operational Decisions**:
   - 🟢 **`SEAL`**: All expected items, variants, and quantities verified with high confidence (>= 85%).
   - 🔴 **`STOP & FIX`**: Definite discrepancy identified (missing, wrong item, extra item, or variant/quantity mismatch).
   - 🟡 **`UNCERTAIN`**: The photograph, item identity, or vision result does not provide enough evidence for a reliable decision.
6. **Immutable Audit Trail & Human Override**: Every AI decision is permanently logged. Operators can override decisions via an authorized workflow without overwriting original AI logs.

### QR Order and Manual Manifest Workflow

Scan or enter a packing-slip QR/order reference to load its order lines automatically. SKU/ASIN, product name, expected quantity, and any available catalog reference image appear in the editable manifest. If there is no order data, create a manual manifest with an Order ID; add/remove products and edit quantities without a fixed product list. Upload an overhead open-carton photo to compare expected items with confidently identified contents. Ambiguous evidence returns `UNCERTAIN`; only evidence-backed discrepancies return `STOP & FIX`.

---

## 2. Operational Metrics and Pre-Registered Targets

Targets are set before operational results are evaluated. The dashboard reports observed values and sample counts; seeded demo data and synthetic tests are not production accuracy evidence.

| Metric | Definition | Target / action threshold |
| :--- | :--- | :--- |
| **UNCERTAIN rate** | Latest completed decisions recorded as `UNCERTAIN` / completed decisions | Target ≤ 5%; sustained > 10% is a product kill condition |
| **Pending rate** | Cartons currently awaiting a completed decision / all cartons | Target ≤ 2% |
| **All expected items present** | Conclusive carton comparisons where every expected SKU was observed / conclusive comparisons | Report separately from quantity accuracy |
| **Quantities correct** | Conclusive carton comparisons with exact expected counts and no unexpected SKU / conclusive comparisons | Report separately from item presence |
| **Occlusion signals** | Latest carton analyses explicitly flagged as occluded by vision | Track separately; single-shot capture cannot verify fully hidden contents |

Uncertain results are excluded from item/count accuracy denominators and remain distinct from confirmed discrepancies. Bounding boxes support localization, evidence, and deduplication; SKU reconciliation uses item identity and counts. Production SKU matching considers the seller's full catalogue, not only the order lines, to retain look-alike candidates.

Pack Manager does not control a physical seal/release interlock. If the verification service is unavailable, it does not auto-seal or block the operator's existing manual inspection process. An asynchronous result received after dispatch is evaluation signal only unless the carton is still held; it is not a post-shipment safety net.

---

## 3. Architecture & Repository Structure

This repository is organized as a production-grade TypeScript monorepo alongside a standalone Python agent:

```
├── pack_manager_agent.py         # Standalone Python Agent (Claude Vision API + offline fallback)
├── pack_manager_system_prompt.md  # Production AI vision system instructions
├── API_REFERENCE.md              # Full REST & Webhook API specification
├── ARCHITECTURE.md               # Detailed system architecture, data flows, and RLS
├── docs/
│   ├── OPERATIONAL_PROCEDURES.md # Warehouse SOP, photo standards, escalation matrix
│   ├── TRAINING_MATERIALS.md     # 30-min training course, video scripts, QC cheat sheet
│   ├── IMPLEMENTATION_ROADMAP.md # 11-12 week rollout roadmap, Gantt chart, budget
│   └── TEST_SCENARIOS.md         # 11 canonical benchmark scenarios
├── packages/
│   ├── shared/                   # Enums (PackStatus, OperationalDecision), Zod schemas
│   ├── config/                   # Centralized confidence thresholds & worker settings
│   ├── domain/                   # Deterministic decision engine, reconciler, deduplicator
│   ├── database/                 # Repositories with multi-tenant Row-Level Security (RLS)
│   └── vision/                   # Quality validator (blur, glare, resolution) & model providers
├── apps/
│   ├── api/                      # Fastify REST API server (Swagger UI, idempotency, auth)
│   ├── worker/                   # 12-step verification pipeline & webhook dispatcher
│   └── web/                      # React / Vite QC operator workstation dashboard
└── test/
    └── e2e-scenarios.test.ts     # 11 end-to-end integration test scenarios
```

---

## 4. Quick Start: Standalone Python Agent

You can run the core agent directly via Python in 60 seconds:

```bash
# Optional: Set your Claude Vision API Key (falls back to deterministic simulator if unset)
export ANTHROPIC_API_KEY="sk-ant-..."

# Run verification on a carton
python pack_manager_agent.py \
  --order-id "ORD-2024-001" \
  --pack-id "PACK-2024-001" \
  --expected-items '[{"sku": "SKU-A", "name": "Black T-Shirt", "quantity": 2}]'
```

**Standardized JSON Output:**
```json
{
  "order_id": "ORD-2024-001",
  "pack_id": "PACK-2024-001",
  "decision": "SEAL",
  "confidence": 0.96,
  "reason_summary": "Order verified: all expected items match observed carton contents exactly.",
  "detected_items": [
    { "sku": "SKU-A", "name": "Black T-Shirt", "quantity": 2, "confidence": 0.96 }
  ],
  "discrepancies": [],
  "summary": { "status": "SEAL", "latency_ms": 1 },
  "evidence": { "model": "claude-3-5-sonnet-20241022" }
}
```

---

## 5. Quick Start: Full Enterprise Monorepo

### Prerequisites
- Node.js 20+ (on Windows, use `npm.cmd` and `npx.cmd`)
- Python 3.10+

### Installation
```powershell
# 1. Install all monorepo dependencies
npm.cmd install

# 2. Run all unit, domain, pipeline, and e2e test suites (48 passing tests)
npx.cmd vitest run
```

### Running the API & Operator Web Dashboard
```powershell
# Terminal 1: Start API server (pre-seeded with demo orders and packs)
npx.cmd tsx apps/api/src/index.ts

# Terminal 2: Start Web UI
npx.cmd vite --config apps/web/vite.config.ts

# Open in Browser:
# Web Dashboard: http://localhost:3000
# Swagger API Docs: http://localhost:4000/documentation
```

---

## 6. Testing & Validation

All 14 packing workflow scenarios pass automatically:
```powershell
npx.cmd vitest run test/e2e-scenarios.test.ts
```

| Scenario | Description | Expected Decision |
| :--- | :--- | :--- |
| **Scenario 1** | Correct single item order | 🟢 `SEAL` |
| **Scenario 2** | Missing item (1 of 2 T-shirts present) | 🔴 `STOP & FIX` |
| **Scenario 3** | Wrong item substituted (red cap instead of blue cap) | 🔴 `STOP & FIX` |
| **Scenario 4** | Extra item (unordered cap in box) | 🔴 `STOP & FIX` |
| **Scenario 5** | Incorrect quantity (1 of 2 expected items) | 🔴 `STOP & FIX` |
| **Scenario 6** | Multiple identical products (5 items) | 🟢 `SEAL` |
| **Scenario 6b** | Duplicate manifest lines for one SKU | 🟢 `SEAL` |
| **Scenario 7** | Visually similar variant mismatch (Size M vs L) | 🔴 `STOP & FIX` |
| **Scenario 8** | Corrupt / severe motion blur image | 🟡 `UNCERTAIN` |
| **Scenario 9** | Ambiguous photo with no identifiable items | 🟡 `UNCERTAIN` |
| **Scenario 9b** | Visible item occlusion | 🟡 `UNCERTAIN`, recorded as occlusion |
| **Scenario 10** | Multi-angle photos without double-counting | 🟢 `SEAL` |
| **Scenario 11** | AI provider failure | 🟡 `UNCERTAIN` |
| **Scenario 12** | Manual SKU missing from catalog | 🟢 `SEAL` |
| **Scenario 13** | Rescan & QC rework cycle | 🔴 Run 1: `STOP & FIX` -> 🟢 Run 2: `SEAL` |

---

## 7. Security & Compliance Rules

- **Zero Hardcoded Secrets**: No API keys, credentials, or private tokens are committed. All secrets are loaded through environment variables (see `.env.example`).
- **Multi-Tenant Row-Level Security (RLS)**: Every database query enforces tenant isolation using the validated `orgId` claim. Cross-tenant leakage is tested and prevented.
- **Immutable Audit Logging**: Every automated decision, confidence calculation, and human override creates a permanent audit record. Original AI logs are never overwritten.
- **Signed Webhook Deliveries**: Webhooks are signed with HMAC-SHA256 (`x-packmanager-signature-256`) to ensure authenticity at receiving WMS/ERP systems.

---

## 8. Documentation Directory

- **[API Reference](API_REFERENCE.md)**: Endpoints, schemas, error codes, and curl examples.
- **[System Architecture](ARCHITECTURE.md)**: Component diagrams, data flows, and state machine transitions.
- **[Operational Procedures](docs/OPERATIONAL_PROCEDURES.md)**: Staff standard operating procedures and camera guidelines.
- **[Training Materials](docs/TRAINING_MATERIALS.md)**: 30-minute training guide, video scripts, and laminated bench cheat sheet.
- **[Implementation Roadmap](docs/IMPLEMENTATION_ROADMAP.md)**: 11-12 week rollout timeline and cost breakdown.
- **[Test Scenarios](docs/TEST_SCENARIOS.md)**: Benchmark matrix and validation criteria.
- **[AI Vision System Prompt](pack_manager_system_prompt.md)**: Production system prompt for vision models.
