# Durable Operational Constraints & Forbidden Terms

## 1. Hard Engineering Rules
1. **Tenancy Before Features:** Every table must have PostgreSQL Row-Level Security enabled and enforced. Storage paths must be prefixed with `orgs/{org_id}/`.
2. **Deterministic Authority:** AI/LLMs may never issue a fulfillment verdict. The decision engine must be pure, deterministic code.
3. **Binary Operational Decision:** The physical pack decision is strictly `SEAL` or `STOP_AND_FIX`. Individual checks may evaluate to `UNCERTAIN`, which maps strictly to `STOP_AND_FIX`.
4. **Never Overwrite History:** Prior analyses, state transitions, and operator overrides must remain immutable. Rescans create new chronological analysis records (`Analysis N+1`).
5. **Fail-Open Throughput, Fail-Safe Verifications:** A provider timeout or image corruption must never block the main conveyor; it writes an audit record marked `STOP_AND_FIX` and diverts the box to the side QC rework queue.

## 2. Forbidden Language & Marketing Buzzwords
- Do NOT use the term "tamper-proof", "immutable ledger", or "blockchain" unless referring to a real cryptographic digest hash.
- Do NOT claim "it works well" without citing the exact false positive rate, false negative rate, and sample size.
- Do NOT refer to `UNCERTAIN` as a "low confidence pass". Uncertainty is an explicit operational stop.
- Do NOT use percentage-based quantity tolerances (e.g. "80% of items found"). Quantity is an exact discrete integer count.
