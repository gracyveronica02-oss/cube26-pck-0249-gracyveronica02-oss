# Evaluation Report: Outbound Pack Manager

**Participant:** Gracy Veronica (`gracyveronica02`)  
**Stage:** 03 · Outbound Pack Manager  
**Dataset:** 50 Held-Out Synthetic Units (`data/fixtures/eval_set.json`)

---

## 1. Benchmark Results

| Metric | Target | Result | Status |
|---|---|---|---|
| **Total Test Units** | 50 | 50 | Complete |
| **Overall Accuracy** | $\ge 90\%$ | **100.0%** | Exceeds Target |
| **False Positive Rate (FPR)** | **0.0%** | **0.0%** | Strict Zero Tolerance Verified |
| **False Negative Rate (FNR)** | $\le 5.0\%$ | **0.0%** | Optimal Throughput |
| **Uncertain Cases (`UNCERTAIN`)** | Tracked | 2 units (4.0%) | Safely routed to QC |
| **Two-Labeller Agreement ($\kappa$)** | $\ge 0.85$ | **0.98** | Validated Ground Truth |

---

## 2. Confusion Matrix

```
                          Ground Truth: SEAL      Ground Truth: STOP_AND_FIX
                       ┌───────────────────────┬────────────────────────────┐
  System: SEAL         │   True Positive: 30   │     False Positive: 0      │
                       ├───────────────────────┼────────────────────────────┤
  System: STOP_AND_FIX │   False Negative: 0   │     True Negative: 20      │
                       └───────────────────────┴────────────────────────────┘
```

---

## 3. Discrepancy Breakdown by Root Cause

| Root Cause Failure Mode | Units Tested | Detection Method | System Verdict |
|---|---|---|---|
| **Missing Item** | 5 | OrderReconciler zero-count check | `STOP_AND_FIX` |
| **Wrong Item (Unexpected SKU)** | 5 | Catalog & order lines exclusion | `STOP_AND_FIX` |
| **Short Quantity** | 4 | Integer shortfall check ($N_{\text{obs}} < N_{\text{exp}}$) | `STOP_AND_FIX` |
| **Extra Item** | 2 | Integer surplus check ($N_{\text{obs}} > N_{\text{exp}}$) | `STOP_AND_FIX` |
| **Critical Variant Mismatch** | 2 | Attribute parity check (e.g. Size M $\neq$ Size L) | `STOP_AND_FIX` |
| **Ambiguous / Motion Blur Photo** | 2 | Laplacian variance $\sigma^2 < 100$ | `STOP_AND_FIX` (`UNCERTAIN`) |

---

## 4. Engineering Rule 4: Handling Uncertainty
When an image exhibits severe motion blur ($\sigma^2 < 100$) or extreme exposure saturation ($> 35\%$ pixels clipped), the check records `UNCERTAIN`. The deterministic decision engine maps `UNCERTAIN` to operational `STOP_AND_FIX`. The QC console displays the failure reason and offers a one-click rescan.
