# PDF Layout Visual Guide

This document describes the visual layout of the generated PDFs.

## Page Structure

```
┌────────────────────────────────────────────────────────────────┐
│                        HEADER (Blue Banner)                     │
│  COMPANY NAME                      COMMERCIAL PROPOSAL          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    DOCUMENT INFORMATION BOX                     │
│  ┌──────────────────────┬──────────────────────┐              │
│  │ Proposal Number: QT-0001  │ Reference: REF-123  │          │
│  │ Date: Nov 15, 2025        │ Status: SENT        │          │
│  │ Valid Until: Dec 15, 2025 │                     │          │
│  └──────────────────────┴──────────────────────┘              │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                     CLIENT INFORMATION                          │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ ABC Corporation                                           │ │
│  │ Attention: John Doe                                       │ │
│  │ Email: john@abc.com      Billing Address:                │ │
│  │ Phone: +91-XXXX-XXXXXX   123 Business St                 │ │
│  │                          City, State 12345                │ │
│  │                          GSTIN: 22XXXXX1234X1X1           │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    ITEMS & SERVICES                             │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ S.No │ Description │ Qty │ Unit Price │ Subtotal      │   │
│  ├──────┼─────────────┼─────┼────────────┼───────────────┤   │
│  │  1   │ Dell Laptop │  10 │ ₹45,000.00 │ ₹450,000.00  │   │
│  │  2   │ Desktop PC  │  20 │ ₹35,000.00 │ ₹700,000.00  │   │
│  │  3   │ Monitor     │  30 │ ₹10,000.00 │ ₹300,000.00  │   │
│  └──────┴─────────────┴─────┴────────────┴───────────────┘   │
└────────────────────────────────────────────────────────────────┘

                                         ┌─────────────────────┐
                                         │ Subtotal: ₹1,450,000│
                                         │ Discount:    -₹50,000│
                                         │ Shipping:     ₹5,000│
                                         │ CGST (9%):  ₹126,450│
                                         │ SGST (9%):  ₹126,450│
                                         ├─────────────────────┤
                                         │ TOTAL:   ₹1,657,900│ ← Highlighted
                                         └─────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                           NOTES                                 │
│  • Payment terms: Net 30 days                                  │
│  • Delivery within 2 weeks of order confirmation               │
│  • Installation support included                               │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                    TERMS & CONDITIONS                           │
│  • This quote is valid for 30 days from the date of issue     │
│  • Prices are subject to change without notice                 │
│  • Payment must be made in full before delivery                │
│  • All sales are final                                         │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│              BILL OF MATERIALS (if applicable)                  │
│  Item 1: PART-001                                              │
│  Description: Dell Latitude 5420                               │
│  Manufacturer: Dell                                            │
│  Quantity: 10 units                                            │
│  Specifications: 8GB RAM, 256GB SSD, Intel i5                  │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│          SERVICE LEVEL AGREEMENT (if applicable)                │
│  Response Time: 24 hours                                       │
│  Resolution Time: 72 hours                                     │
│  Availability: 99.9%                                           │
│  Support Hours: 24/7                                           │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│            PROJECT TIMELINE (if applicable)                     │
│  Project Start: Nov 20, 2025                                   │
│  Project End: Dec 20, 2025                                     │
│                                                                 │
│  1. Planning Phase (Pending)                                   │
│     Start: Nov 20 | End: Nov 27 | Duration: 1 week            │
│                                                                 │
│  2. Procurement (Not Started)                                  │
│     Start: Nov 27 | End: Dec 10 | Duration: 2 weeks           │
└────────────────────────────────────────────────────────────────┘

─────────────────────────────────────────────────────────────────
OPTIVALUE TEK                        Phone: +91-XXXX-XXXXXX
123 Business St, City, State         Email: info@optivalue.com
Pincode 123456                       Web: www.optivalue.com

                      Page 1 of 2
```

## Color Scheme

### Header
- **Background**: Blue (#1e40af)
- **Text**: White (#FFFFFF)
- **Font**: Helvetica Bold, 18pt (company), 16pt (title)

### Document Info Box
- **Background**: Light Gray (#f1f5f9)
- **Border**: Light Border (#e2e8f0)
- **Text**: Black

### Table Header
- **Background**: Blue (#1e40af)
- **Text**: White (#FFFFFF)
- **Font**: Helvetica Bold, 9pt

### Table Rows
- **Even Rows**: Light Gray background (#f1f5f9)
- **Odd Rows**: White background
- **Text**: Black, Helvetica 9pt
- **Borders**: Light gray (#e2e8f0)

### Totals Box
- **Background**: Light Gray (#f1f5f9)
- **Border**: Light Border (#e2e8f0)
- **Total Row Background**: Blue (#1e40af)
- **Total Text**: White, Helvetica Bold 12pt

### Section Headers
- **Color**: Blue (#1e40af)
- **Font**: Helvetica Bold, 11-12pt

### Footer
- **Text Color**: Gray (#64748b)
- **Font**: Helvetica, 8pt
- **Border**: Top line (#e2e8f0)

## Key Features

### 1. Professional Header (Every Page)
```
┌─────────────────────────────────────────────────────┐
│ █████████████████████████████████████████████████ │
│ █ COMPANY NAME           COMMERCIAL PROPOSAL    █ │
│ █████████████████████████████████████████████████ │
└─────────────────────────────────────────────────────┘
```
- Full-width blue banner
- Company name on left
- Document type on right
- Present on every page

### 2. Professional Footer (Every Page)
```
─────────────────────────────────────────────────────
COMPANY NAME                    Phone: +91-XXX-XXX
Address Line 1                  Email: info@co.com
Address Line 2                  Web: www.co.com

                 Page 1 of 3
```
- Horizontal line separator
- Company information on left
- Contact details on right
- Centered page numbers

### 3. Document Information Box
```
┌─────────────────────────────────────────────────┐
│ Proposal Number: QT-0001  │ Reference: REF-123 │
│ Date: November 15, 2025   │ Status: SENT       │
│ Valid Until: Dec 15, 2025 │                    │
└─────────────────────────────────────────────────┘
```
- Light background
- Two columns
- Clear labels
- Professional formatting

### 4. Items Table
```
┌────┬───────────────┬─────┬──────────┬────────────┐
│ No │ Description   │ Qty │ Price    │ Subtotal   │
├────┼───────────────┼─────┼──────────┼────────────┤
│ 1  │ Item name... │  10 │ ₹45,000  │ ₹450,000  │ ← White
│ 2  │ Another item │  20 │ ₹35,000  │ ₹700,000  │ ← Gray
│ 3  │ Third item   │  30 │ ₹10,000  │ ₹300,000  │ ← White
└────┴───────────────┴─────┴──────────┴────────────┘
```
- Blue header row
- Alternating row colors
- Right-aligned numbers
- Currency symbols

### 5. Totals Section (Right-Aligned Box)
```
                        ┌─────────────────┐
                        │ Subtotal: ₹XXX  │
                        │ Discount: -₹XX  │
                        │ Shipping:  ₹XX  │
                        │ CGST:      ₹XX  │
                        │ SGST:      ₹XX  │
                        ├─────────────────┤
                        │ TOTAL:   ₹XXXX │ ← Blue background
                        └─────────────────┘
```
- Right-aligned box
- Light gray background
- Blue highlighted total
- White text on total row

## Spacing & Margins

```
        50pt                                    50pt
      ◄─────►                                 ◄─────►
    ┌─────────────────────────────────────────────┐
    │                                             │ ▲
80pt│                 HEADER                     │ │
    │                                             │ ▼
    ├─────────────────────────────────────────────┤
    │                                             │
    │                                             │
    │             CONTENT AREA                    │
    │                                             │
    │                                             │
    ├─────────────────────────────────────────────┤
    │                                             │ ▲
80pt│                 FOOTER                     │ │
    │                                             │ ▼
    └─────────────────────────────────────────────┘

    Content Width: 495.28 points
    Page Width: 595.28 points (A4)
    Page Height: 841.89 points (A4)
```

## Multi-Page Handling

### Page 1
- Header (blue banner)
- Document info
- Client info
- Items table (starts)
- Items table (continues if space)
- Totals (if items fit)
- Footer

### Page 2+
- Header (blue banner) ← Same as page 1
- Items table (continued)
- Totals
- Notes
- Terms & Conditions
- Advanced Sections
- Footer ← Same as page 1

## Typography Hierarchy

```
Company Name (Header)         - Helvetica Bold, 18pt, White
Document Title (Header)       - Helvetica Bold, 16pt, White
Section Headers              - Helvetica Bold, 12pt, Blue
Subsection Headers           - Helvetica Bold, 11pt, Blue
Client Name                  - Helvetica Bold, 11pt, Black
Table Headers                - Helvetica Bold, 9pt, White
Body Text                    - Helvetica, 9-10pt, Black
Footer Text                  - Helvetica, 8pt, Gray
Terms & Conditions           - Helvetica, 8pt, Black
```

## Best Practices

✅ **DO:**
- Keep company information up to date in settings
- Use clear, concise item descriptions
- Include all necessary terms and conditions
- Test PDF before sending to clients
- Review multi-page PDFs for continuity

❌ **DON'T:**
- Leave company settings blank
- Use extremely long item descriptions (will wrap)
- Skip important client information
- Forget to verify totals are correct

## Print Settings

For best printing results:
- **Paper Size**: A4 (210 × 297 mm)
- **Orientation**: Portrait
- **Margins**: Default (handled by PDF)
- **Color**: Yes (for professional appearance)
- **Quality**: High/Best

## Examples

### Minimum Information PDF
- Company name only in settings
- Single line item
- No taxes
- Basic layout
- **Pages**: 1

### Full-Featured PDF
- Complete company information
- 20+ line items
- Multiple taxes
- Notes and terms
- BOM section
- SLA section
- Timeline section
- **Pages**: 3-5

### Real-World Example (Dell Laptops & Desktops)
- Company: OPTIVALUE TEK
- Items: 15 different products
- Taxes: CGST + SGST
- Terms: Comprehensive
- BOM: Detailed specifications
- **Pages**: 4

---

**This visual layout matches professional commercial proposal standards used by major corporations.**

