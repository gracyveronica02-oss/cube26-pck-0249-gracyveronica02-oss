# Pack Manager - Standard Operating Procedures (SOP)

**Document ID**: SOP-QC-PACK-001  
**Applies to**: Warehouse QC Operators, Packing Line Workers, QC Supervisors, Operations Managers  
**System**: AI Outbound Order Verification System  
**Effective Date**: September 2026  

---

## 1. Step-by-Step Workflow Guide

```
+------------------+     +-------------------+     +---------------------+
| 1. Pick & Pack   | --> | 2. Overhead Photo | --> | 3. Automated AI     |
| Items into Box   |     | Capture Station   |     | Analysis (< 2s)     |
+------------------+     +-------------------+     +---------------------+
                                                              |
                                                              v
                                              +-------------------------------+
                                              | Decision Gate                 |
                                              +-------------------------------+
                                               /              |              \
                                              /               |               \
                                      [SEAL]                 [MANUAL_REVIEW]   [STOP & FIX]
                                        |                             |              |
                                        v                             v              v
                           +----------------------+       +----------------+ +---------------+
                           | 4A. Automatic Carton |       | 4B. Operator   | | 4C. Divert to |
                           | Taping & Shipping    |       | Visual Inspect | | Rework Lane   |
                           +----------------------+       +----------------+ +---------------+
```

### Step 1: Picking & Initial Placement
1. Operator picks items as specified on WMS pick ticket.
2. Place items inside the shipping carton with product face or label oriented upward.
3. Ensure items do not completely bury or obscure smaller items.

### Step 2: Photography Station
1. Position carton centered directly under the overhead camera target marker.
2. Trigger capture via:
   - Foot pedal (hands-free)
   - Barcode scan of carton license plate (LPN)
   - UI "Capture Photo" button
3. If dunnage (bubble wrap / air pillows) is used, take the photo **BEFORE** placing dunnage over the items.

### Step 3: Real-Time Verification
1. The AI Agent ingests the image and compares detected items to the WMS manifest in < 2 seconds.
2. The workstation screen lights up with color-coded status:
   - 🟢 **GREEN (SEAL)**: Carton advances automatically on conveyor to auto-taper.
   - 🟡 **AMBER (MANUAL_REVIEW)**: Carton held for 15-30 second operator visual check.
   - 🔴 **RED (STOP & FIX)**: Conveyor diverts carton to QC Rework Table.

---

## 2. Operational Decision Guide

| Decision | Meaning | Operator Action | SLA / Latency |
| :--- | :--- | :--- | :--- |
| 🟢 **SEAL** | All SKUs, quantities, and variants verified with >= 85% confidence. | Allow box to proceed to taper and carrier shipping label applicator. | < 2 seconds |
| 🟡 **MANUAL_REVIEW** | Ambiguity detected (e.g. low lighting, occlusion, confidence 75-84%). | Open dossier on screen. Confirm SKU visually. If correct, click **Approve Override**. If incorrect, mark **Reject to Repack**. | < 30 seconds |
| 🔴 **STOP & FIX** | Verified discrepancy: Missing item, extra item, wrong product, or wrong variant. | Check red discrepancy card. Pull missing SKU from inventory or remove extra item. Click **Request Rescan** once fixed. | < 90 seconds |

---

## 3. Photo Quality Standards

### Requirements for Clean Verification:
- **Angle**: Strictly top-down (perpendicular 90° angle within ±10°).
- **Lighting**: Diffused white LED overhead lighting (500-1000 lux). Avoid direct single-point glare.
- **Carton Interior Framing**: All 4 carton inner flaps must be folded back. The interior base must be fully in frame.
- **Resolution**: Minimum 1280x720 pixels (standard 1080p industrial webcam or mobile device).

### Common Mistakes to Avoid:
1. ❌ **Covering items with bubble wrap before taking photo**: Always photograph **before** applying top void-fill.
2. ❌ **Holding hands in frame**: Keep hands outside carton perimeter when camera triggers.
3. ❌ **Stacking identical items perfectly on top of each other**: Offset items slightly so each item's top edge or label is visible.

---

## 4. Troubleshooting & Escalation Matrix

| Problem | Immediate Action | Escalation Contact |
| :--- | :--- | :--- |
| Camera image blurry or blank | Clean camera lens with microfiber cloth. Check USB connection. | IT Support / Hardware Tech |
| Repeated "AMBIGUOUS_ITEM" on new product | Ensure product SKU is registered in Catalog (`/products`). | QC Supervisor |
| Operator disagrees with AI Decision | Open Pack Dossier. Use **QC Action Modal** to submit **APPROVED_OVERRIDE** with reason code. | Shift Lead |
| WMS Webhook delivery failure | Check Webhook Delivery logs in `/webhooks/deliveries`. | DevOps on-call |

---

## 5. Performance Standards & KPI Targets

- **Decision Accuracy Target**: >= 97.0%
- **End-to-End Processing Time**: < 2.0 minutes per carton (AI processing < 2.0 seconds)
- **False Negative Rate (Wrong order sealed)**: < 1.0% (Critical safety threshold)
- **Manual Intervention Rate**: < 10.0% of total volume
- **Operator Onboarding Time**: < 2 hours with training materials
