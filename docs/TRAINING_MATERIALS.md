# Pack Manager - QC Staff Training Materials

**Course Title**: Outbound Order Verification with AI Pack Manager  
**Target Audience**: Warehouse Associates, QC Operators, Packing Station Leads  
**Duration**: 30 Minutes Hands-On Training  

---

## 1. 30-Minute Training Presentation Outline

### Module 1: The Why (5 minutes)
- Customer impact of wrong/missing items: return shipping costs, negative reviews, chargebacks.
- How manual visual checking fails: human fatigue after 400 boxes leads to 2-5% errors.
- The AI Agent role: a reliable assistant that checks every box in under 2 seconds.

### Module 2: The Three Decisions (10 minutes)
- 🟢 **SEAL**: Green light! The box is 100% verified. Let it roll to the taper.
- 🟡 **MANUAL_REVIEW**: Amber light. The camera saw something ambiguous or confidence is between 75-84%. You have the final say!
- 🔴 **STOP & FIX**: Red light. The AI detected a concrete mismatch (e.g. 1 T-shirt instead of 2, or wrong size). Read the screen, fix the box, scan again.

### Module 3: Hands-On Camera Practice (10 minutes)
- Proper box alignment under the overhead camera.
- Offsetting items so all items are visible.
- Capturing before adding bubble wrap/paper void-fill.

### Module 4: Override & Rescan (5 minutes)
- How to click "Override" when an approved promotional item or gift is present.
- How to click "Request Rescan" once items have been corrected.

---

## 2. Quick Reference Card (For Packing Bench Display)

```
========================================================================
                      PACK MANAGER QC CHEAT SHEET
========================================================================
[1] PACK ITEMS      -> Place items face-up, slightly offset.
[2] SNAP PHOTO      -> Hands out of box, flaps folded back, NO dunnage yet!
[3] OBSERVE STATUS:
    ----------------------------------------------------------------
    🟢 SEAL          -> PUSH TO CONVEYOR (All verified!)
    ----------------------------------------------------------------
    🟡 MANUAL REVIEW -> CHECK SCREEN:
                        * Verify flagged item with eyes.
                        * Click [APPROVE OVERRIDE] if correct.
                        * Click [REJECT TO REPACK] if incorrect.
    ----------------------------------------------------------------
    🔴 STOP & FIX    -> PULL BOX TO QC REWORK TABLE:
                        * Check Missing / Extra / Wrong item list.
                        * Correct physical items.
                        * Click [REQUEST RESCAN].
    ----------------------------------------------------------------
NEED HELP? Call Shift Supervisor (Radio Ch 3)
========================================================================
```

---

## 3. Video Tutorial Scripts (3 x 2-3 Minutes)

### Video 1: "The 3-Second Pack Check" (2:15)
- **Visual**: Overhead camera view over packing bench.
- **Narrator**: "Welcome to the Pack Manager station. Once you finish picking your order, slide your box into the yellow guidelines..."
- **Key Action**: Packer steps on pedal, camera flash, screen instantly turns green with audio chime, box moves forward.

### Video 2: "Handling STOP & FIX Like a Pro" (2:45)
- **Visual**: Screen flashes red with card: "MISSING ITEM: SKU-B Blue Cap (Expected: 1, Detected: 0)".
- **Narrator**: "Don't panic when you see red! The AI just saved our customer from a missing item. The screen tells you exactly what is missing..."
- **Key Action**: Associate pulls SKU-B from the bin, places it in the carton, presses "Rescan", screen flips to Green SEAL.

### Video 3: "When and How to Override" (2:30)
- **Visual**: Customer order includes a promotional handwritten thank-you card not in catalog.
- **Narrator**: "Sometimes marketing includes promotional samples. When the system flags an unexpected item..."
- **Key Action**: Operator clicks "Review & Override", selects reason "PROMOTIONAL_SAMPLE", adds note, confirms. Audit trail logs both actions.

---

## 4. Frequently Asked Questions (FAQ)

**Q1: What if a customer ordered 5 identical shirts folded in a stack?**  
*A: Fan out the stack slightly like a deck of cards so the collar or label of each shirt is visible to the overhead camera.*

**Q2: Does the AI read barcodes or product text?**  
*A: Both! The vision model reads visible 1D/2D barcodes, printed text, brand logos, colors, and physical shapes.*

**Q3: Does an override erase the AI decision?**  
*A: No. The system records an immutable audit log containing the AI's original analysis and your override explanation for full traceability.*

**Q4: What happens if the internet goes down?**  
*A: The system falls back to safe mode: cartons route to manual inspection lanes, ensuring zero uninspected boxes are sealed.*
