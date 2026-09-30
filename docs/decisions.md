# Architectural Decision Records (ADR) - Pack Manager

## ADR-001: Separation of Probabilistic AI Observation and Deterministic Decision Logic
- **Status**: Accepted
- **Context**: Computer vision models (LLMs, VLMs, object detection models) output probabilistic predictions with degrees of uncertainty. Fulfillment operations require zero false-seal tolerance: an outbound box must never be sealed with missing, wrong, or extra items.
- **Decision**: AI models are restricted strictly to perceptual tasks (detecting objects, predicting bounding boxes, identifying candidate attributes, extracting visual embeddings). All reconciliation (expected vs detected), quantity math, variant checks, and the final fulfillment decision (`SEAL`, `STOP_AND_FIX`, or `UNCERTAIN`) are executed by deterministic, pure TypeScript domain logic. No LLM may make the final decision.
- **Consequences**: High auditability, testability with pure unit tests, zero hallucinated fulfillment decisions, robust operational safety.

## ADR-002: Three Operational Outcomes with Three-State Check Evaluation
- **Status**: Accepted
- **Context**: Verification must distinguish confirmed discrepancies from cases where the photograph or model output does not establish what is in the carton.
- **Decision**: At the check level, every verification step outputs `PASS`, `FAIL`, or `UNCERTAIN`. At the pack level, return `SEAL` only when all checks pass; return `STOP_AND_FIX` for evidence-backed missing, wrong, extra, quantity, or variant discrepancies; return `UNCERTAIN` when item identity or image/vision evidence is insufficient. Empty or ambiguous detections do not count as proof that expected items are missing.
- **Consequences**: The record retains all three outcomes. Operators see STOP for either confirmed discrepancies or uncertain evidence, with the outcome explaining whether a fix or human review is needed. Uncertain results are routed to the existing manual-review queue and excluded from accuracy denominators.

## ADR-006: Single-Shot Capture and Operational Metric Targets
- **Status**: Accepted
- **Context**: The current packer workflow captures one overhead image to preserve throughput. Overlapping items can hide contents, and localization quality must not be mistaken for SKU/count accuracy.
- **Decision**: Keep single-shot capture. Ask vision providers to explicitly flag visible partial occlusion and never infer concealed items or counts. Report these occlusion signals separately; acknowledge fully concealed contents as an unobservable limitation. Bounding boxes are evidence/localization inputs and may assist deduplication, but are not standalone proof of item identity. The production SKU matcher considers the seller's entire catalogue, including non-ordered look-alikes. Pre-register an uncertain-rate target of at most 5%, a sustained rate above 10% as a kill condition, and a pending-rate target of at most 2%. Report all-expected-items-present and quantities-correct as separate conclusive-comparison metrics; exclude uncertain comparisons.
- **Consequences**: Capture remains simple, while capture/visibility problems are distinguishable from confirmed order discrepancies and item presence remains distinguishable from count accuracy. Targets are not claims that current demo or production data meets them.

## ADR-007: Manual Fallback and Limits of Asynchronous Results
- **Status**: Accepted
- **Context**: Verification is asynchronous and the present application does not control a physical carton-release interlock.
- **Decision**: A service outage or failed analysis must not auto-seal a carton or prevent the operator from using the existing manual inspection process. Treat a result arriving after dispatch as evaluation signal only, except where dispatch has not yet occurred and the carton remains held. Track pending rate because stale results lose operational value.
- **Consequences**: Fail-open means returning to the pre-agent manual process, not granting an automated SEAL. Async analysis is not represented as a safety net for cartons already shipped.

## ADR-003: Multi-Tenancy via PostgreSQL Row-Level Security (RLS)
- **Status**: Accepted
- **Context**: Engineering Rule 1 requires strict multi-tenancy isolation before any feature. The sample data provides two tenants: `org_demo_alpha` and `org_demo_bravo`.
- **Decision**: Every database table includes an `org_id` column with foreign key reference to `organizations`. PostgreSQL Row-Level Security (RLS) policies are enabled and enforced on all tables, filtered by `current_setting('app.current_org_id')`. Storage paths in object storage are partitioned by tenant (`orgs/{org_id}/packs/...`).
- **Consequences**: Complete tenant isolation at the database and storage level. Cross-tenant leakage is physically prevented even if an API route forgets a where clause.

## ADR-004: Asynchronous Processing via Redis and BullMQ
- **Status**: Accepted
- **Context**: Computer vision inference takes between 2 to 15 seconds per high-resolution image. Keeping HTTP requests open causes timeouts, connection exhaustion, and poor warehouse UX.
- **Decision**: All image analysis requests are accepted immediately by the API (`202 Accepted`), persisted in the database as `processing_jobs` with status `PENDING`, and dispatched to a Redis-backed BullMQ queue. Dedicated workers process jobs with exponential backoff retries, dead-letter queues, and idempotency keys.
- **Consequences**: High throughput, resilient to temporary vision provider outages, non-blocking warehouse station workflow.

## ADR-005: Multi-Image Deduplication Strategy
- **Status**: Accepted
- **Context**: Multiple photographs of an open package may be taken (e.g. top-down and angled views). Summing detected items across photos would cause severe double-counting.
- **Decision**: Detections across photos are clustered using a bipartite matching and spatial-visual similarity algorithm: checking overlapping bounding boxes (if photos are from a fixed camera) or feature similarity / visual embedding cosine distance + attribute matching. Only unique physical entities are aggregated into the pack count.
- **Consequences**: Accurate count across multi-angle shots without duplicate miscounting.
