# PDF Alignment Fix - Visual Guide

## The Problem Visualized

### Before Fix: Automatic Y Advancement

```
┌─────────────────────────────────────┐
│ Label:        [doc.y = 100]         │
│               [After text: doc.y=112]│ ← PDFKit auto-advanced!
│        Value  [doc.y = 112]         │ ← Value renders at wrong Y!
│               [After text: doc.y=124]│
└─────────────────────────────────────┘
```

**Result:** Label and value at different vertical positions! ❌

---

### After Fix: Explicit Positioning

```
┌─────────────────────────────────────┐
│ Label:        Value  [y = 100]      │ ← Both at same Y!
│               [doc.y still 100]     │ ← No auto-advance
│                                     │
│ Next:         Item   [y = 118]      │ ← Manually controlled
└─────────────────────────────────────┘
```

**Result:** Perfect alignment! ✅

---

## Code Comparison

### Document Info Section

#### ❌ BEFORE (Misaligned)
```typescript
let y = startY;

doc.text("Quote No.:", this.MARGIN_LEFT, y);
// ↑ After this, doc.y advanced to y + 12
doc.text(data.quote.quoteNumber, valueX, y);
// ↑ But we're still using original y!
// Label is at y, value appears at y + slight offset

y += 18; // Manual increment
```

**Visual Result:**
```
Quote No.:
           QT-2024-001  ← Misaligned!
```

#### ✅ AFTER (Aligned)
```typescript
let y = startY;

doc.text("Quote No.:", this.MARGIN_LEFT, y, {
    continued: false,
    lineBreak: false
});
// ↑ doc.y stays at y!

doc.text(data.quote.quoteNumber, valueX, y, {
    continued: false,
    lineBreak: false
});
// ↑ Both use same y value!

y += 18;
```

**Visual Result:**
```
Quote No.:     QT-2024-001  ← Perfectly aligned!
```

---

## Client Section Two-Column Layout

### ❌ BEFORE (Cascading Misalignment)
```
┌─────────────────────────┬─────────────────────────┐
│ Bill To:                │ Ship To:                │
│                         │                         │
│ Name:                   │ Name:                   │
│      John Doe           │       John Doe          │ ← Offset!
│                         │                         │
│ Address:                │ Address:                │
│          123 Main St    │                         │
│          New York       │         123 Main St     │ ← Wrong position!
│                         │         New York        │
└─────────────────────────┴─────────────────────────┘
```

**Problem:** Multi-line address in left column causes doc.y to advance, affecting right column rendering.

### ✅ AFTER (Perfectly Balanced)
```
┌─────────────────────────┬─────────────────────────┐
│ Bill To:                │ Ship To:                │
│                         │                         │
│ Name:      John Doe     │ Name:      John Doe     │ ← Aligned!
│                         │                         │
│ Address:   123 Main St  │ Address:   123 Main St  │ ← Aligned!
│            New York     │            New York     │
│                         │                         │
│ Phone:     555-1234     │                         │
└─────────────────────────┴─────────────────────────┘
```

**Solution:** Separate Y tracking for each column:
```typescript
let leftY = startY + 22;
let rightY = startY + 22;

// Left column
doc.text("Name:", this.MARGIN_LEFT, leftY, { lineBreak: false });
doc.text(client.name, valueX, leftY, { lineBreak: false });
leftY += 18;

// Right column (independent Y)
doc.text("Name:", shipToX, rightY, { lineBreak: false });
doc.text(client.name, shipToValueX, rightY, { lineBreak: false });
rightY += 18;

// Final position is max of both
doc.y = Math.max(leftY, rightY) + 10;
```

---

## Financial Summary Value Alignment

### ❌ BEFORE (Values Misaligned)
```
┌──────────────────────────────────┐
│  FINANCIAL SUMMARY               │
├──────────────────────────────────┤
│  Subtotal:     ₹10,000.00        │ ← Different positions
│  Discount:    -₹500.00           │
│  CGST (9%):       ₹855.00        │
│  SGST (9%):       ₹855.00        │
│  ────────────────────────────    │
│  TOTAL:        ₹11,210.00        │
└──────────────────────────────────┘
```

**Problem:** Values don't align in a column because automatic Y advancement affects positioning.

### ✅ AFTER (Perfect Column Alignment)
```
┌──────────────────────────────────┐
│  FINANCIAL SUMMARY               │
├──────────────────────────────────┤
│  Subtotal:            ₹10,000.00 │ ← Aligned!
│  Discount:              -₹500.00 │ ← Aligned!
│  CGST (9%):               ₹855.00│ ← Aligned!
│  SGST (9%):               ₹855.00│ ← Aligned!
│  ────────────────────────────────│
│  TOTAL:               ₹11,210.00 │ ← Aligned!
└──────────────────────────────────┘
```

**Solution:** Fixed width and explicit Y positioning:
```typescript
const valueWidth = 120;
const valueX = boxX + boxWidth - 15;

doc.text("Subtotal:", labelX, y, { lineBreak: false });
doc.text(formatCurrency(subtotal), valueX - valueWidth, y, {
    width: valueWidth,
    align: "right"  // Right-align within fixed width
});
y += 20;  // Manual Y increment
```

---

## Table Column Alignment

### Before vs After

#### ❌ BEFORE
```
┌────┬─────────────────────┬─────┬────────────┬─────────────┐
│ No │ Description         │ Qty │ Unit Price │ Subtotal    │
├────┼─────────────────────┼─────┼────────────┼─────────────┤
│ 1  │ Item One            │ 10  │ ₹1,000.00  │₹10,000.00   │
│  2 │ Item Two            │ 5   │₹2,000.00   │ ₹10,000.00  │
└────┴─────────────────────┴─────┴────────────┴─────────────┘
       ↑ Misaligned columns!
```

#### ✅ AFTER
```
┌────┬─────────────────────┬─────┬────────────┬─────────────┐
│ No │ Description         │ Qty │ Unit Price │   Subtotal  │
├────┼─────────────────────┼─────┼────────────┼─────────────┤
│ 1  │ Item One            │ 10  │ ₹1,000.00  │ ₹10,000.00  │
│ 2  │ Item Two            │  5  │ ₹2,000.00  │ ₹10,000.00  │
└────┴─────────────────────┴─────┴────────────┴─────────────┘
       ↑ Perfect alignment!
```

**Solution:** Explicit column widths and alignment options:
```typescript
const col1X = MARGIN_LEFT + 8;
const col1W = 40;
const col2X = col1X + col1W;
const col2W = CONTENT_WIDTH - 245;
// ... etc

doc.text(String(index + 1), col1X, textY, {
    width: col1W,
    align: "center",
    lineBreak: false
});

doc.text(item.description, col2X + 8, y + 8, {
    width: col2W - 20,
    align: "left",
    // No lineBreak: false here since it can wrap
});
```

---

## Key Takeaways

### The Golden Rules

1. **Always Use Explicit Y Positions**
   ```typescript
   ✅ doc.text("Text", x, y, { lineBreak: false });
   ❌ doc.text("Text", x, doc.y);  // Don't rely on doc.y
   ```

2. **Prevent Automatic Advancement**
   ```typescript
   ✅ { continued: false, lineBreak: false }
   ❌ doc.text("Text", x, y);  // Auto-advances doc.y
   ```

3. **Track Y Manually**
   ```typescript
   ✅ let y = startY;
       doc.text(...);
       y += lineHeight;
   ❌ doc.text(...);
       // Hoping doc.y is correct
   ```

4. **Calculate Multi-line Height**
   ```typescript
   ✅ const h = doc.heightOfString(text, { width: w });
       doc.text(text, x, y, { width: w });
       y += h + spacing;
   ❌ doc.text(text, x, y, { width: w });
       y += 20;  // Guessing!
   ```

---

## Alignment Checklist

Use this checklist when adding new PDF elements:

- [ ] Explicit Y variable tracking (`let y = startY;`)
- [ ] `lineBreak: false` for single-line text
- [ ] `continued: false` for independent text blocks
- [ ] Manual Y increment (`y += height;`)
- [ ] Pre-calculate height for multi-line text
- [ ] Fixed widths for aligned columns
- [ ] Consistent spacing between elements
- [ ] Test with various text lengths
- [ ] Verify two-column layouts balance
- [ ] Check currency/number right-alignment

---

## Quick Reference

### Text Options Matrix

| Scenario | Options |
|----------|---------|
| Single-line label | `{ continued: false, lineBreak: false }` |
| Single-line value | `{ continued: false, lineBreak: false }` |
| Multi-line text | `{ width: X, lineGap: 2 }` |
| Right-aligned number | `{ width: X, align: "right" }` |
| Centered header | `{ width: X, align: "center" }` |
| Table cell | `{ width: X, align: "left/center/right" }` |

### Spacing Standards

```typescript
const LABEL_WIDTH = 120;
const LABEL_VALUE_GAP = 5;
const LINE_HEIGHT = 18;
const SECTION_SPACING = 25;
const PARAGRAPH_SPACING = 12;
```

---

## Before & After Summary

| Element | Before | After |
|---------|---------|-------|
| Label-Value Pairs | ❌ Misaligned | ✅ Perfectly aligned |
| Two Columns | ❌ Offset | ✅ Balanced |
| Multi-line Text | ❌ Breaks layout | ✅ Handled correctly |
| Currency Values | ❌ Ragged | ✅ Right-aligned |
| Table Columns | ❌ Inconsistent | ✅ Precise |
| Overall Quality | ❌ Amateur | ✅ Professional |

---

**Status:** ✅ All alignment issues resolved

**Visual Quality:** Publication-ready

**Build Status:** ✅ Successful

**Date:** November 17, 2025

