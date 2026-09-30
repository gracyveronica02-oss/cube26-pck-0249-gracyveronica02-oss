# Press Release & FAQ (PR/FAQ) — Pack Manager

## FOR IMMEDIATE RELEASE: Automated Outbound Pack Verification

**SEATTLE & CHENNAI — September 2026** — Today marks the launch of **Pack Manager**, an enterprise outbound carton verification system that completely eliminates shipping errors for merchant-fulfilled sellers and 3PL distribution centers. Utilizing multi-camera computer vision coupled with a strict deterministic decision engine, Pack Manager verifies open carton contents against customer orders before tape is applied, leaving behind an immutable photographic proof record for returns dispute defense.

---

## Frequently Asked Questions (FAQ)

### 1. Does this require expensive overhead gantries or fixed specialized hardware?
**No.** Pack Manager was architected specifically for sellers and 3PLs without six-figure hardware budgets. It runs with standard USB 3.0 overhead webcams ($60) or mobile tablets mounted above standard packing benches. The compute runs asynchronously in the cloud or on a local micro-server.

### 2. What happens when an operator stacks items on top of each other?
If items are completely occluded beneath another item, the camera cannot see what is hidden. When this occurs, the observed count falls short of the expected quantity ($N_{\text{obs}} < N_{\text{exp}}$). The system issues a deterministic **STOP & FIX** verdict. The operator simply spreads the items flat or scans the barcode, and hits "Rescan" (Scenario 11). Pack Manager preserves both analysis records in audit history.

### 3. What if the AI model makes a hallucinated or probabilistic mistake?
**The AI model NEVER makes the fulfillment decision.** The vision model is strictly constrained to object localization and candidate attribute extraction. Pure deterministic TypeScript code compares observed integers against ERP order lines. If an item confidence falls below 90% or is ambiguous, the decision engine forces a **STOP & FIX**. Uncertainty is a first-class citizen.

### 4. What happens if the internet goes down or the vision API times out?
In accordance with Engineering Rule 3, the system **fails open for line throughput while failing safe for package integrity**: the capture is preserved, an audit record marked `STOP_AND_FIX` (reason: `VISION_TIMEOUT_FAIL_SAFE`) is committed, and the box is cleanly diverted to the side QC station. The main packing conveyor never stalls waiting on an unyielding network lock, yet no unverified carton is ever sealed.

### 5. Can tenant A guess the image URL or see packages from tenant B?
**Impossible.** Under Engineering Rule 1, PostgreSQL Row-Level Security (RLS) is forced across all tables. Object storage paths are explicitly prefixed by tenant identifier (`orgs/{org_id}/packs/...`), and all image URLs are time-limited presigned URLs (TTL 15 mins). Guessing an image ID returns an S3 403 Forbidden.
