# Build Brief: Pack Manager Architecture & Trade-Offs

## Position in the Fulfillment Chain
- **Stage:** 03 · Pack Manager (Outbound to Buyer)
- **Preceding Stages:** 01 Receiving $\to$ 02 Prep Compliance
- **Succeeding Stages:** 04 Returns Manager (Condition on Return) $\to$ 05 Recovery Manager (Buyer Disputes)
- **Join Key Across All Pods:** `unit_id` (`UNIT-0001` ... `UNIT-0100`)

## Scope Boundaries
- **In Scope:** Merchant-fulfilled orders (Amazon MFN, Shopify, Walmart Marketplace, 3PL fulfillment).
- **Out of Scope:** Amazon FBA (Fulfillment by Amazon), because Amazon manages internal staging and packing for those units.

## Core Architectural Trade-Offs
1. **Deterministic vs. LLM Decision Making:** We rejected end-to-end VLM decisioning (e.g. asking a model "Should this box be sealed?"). Models suffer from stochastic hallucination, quantity drift on identical products, and non-reproducibility. We decoupled perception (VLM bounding boxes/attributes) from reconciliation and decision (pure deterministic TypeScript code).
2. **Multi-Image Deduplication:** Merging detections across sequential photos using bounding box spatial IoU and product barcode signatures, with a hard guard preventing items in the same frame from being collapsed into one physical instance.
3. **Asynchronous Decoupling:** Verification takes 1–5 seconds of computer vision inference. We immediately acknowledge API requests with `202 Accepted` and offload processing to BullMQ workers, maintaining a warehouse station tempo under 100ms.
