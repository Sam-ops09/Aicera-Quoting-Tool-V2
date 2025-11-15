# Professional PDF Generation Implementation

## Overview

The PDF generation has been completely rewritten to provide a professional, commercial-quality output with proper header, footer, and layout matching standard business proposal templates.

## Features Implemented

### 1. **Professional Layout**
- **Header Section**: Blue banner with company name and document title
- **Footer Section**: Company information, contact details, and page numbers
- **Proper Margins**: Adequate spacing for professional appearance
- **Page Buffering**: Ensures headers and footers appear on all pages

### 2. **Document Information Section**
- Proposal/Quote number prominently displayed
- Date formatting (Month DD, YYYY)
- Validity period calculation and display
- Reference number (if applicable)
- Status indicator

### 3. **Client Information Section**
- Company name highlighted
- Contact person (Attention to)
- Email and phone number
- Billing address in a separate column
- GSTIN display

### 4. **Line Items Table**
- Professional table with header background (blue)
- Alternating row colors for easy reading
- Columns: S.No, Description, Quantity, Unit Price, Subtotal
- Currency symbol (₹) for Indian Rupees
- Automatic page breaks for long item lists
- Word wrapping for long descriptions

### 5. **Totals Section**
- Summary box on right side with light background
- Subtotal display
- Discount (if applicable)
- Shipping & Handling charges (if applicable)
- Tax breakdown (CGST, SGST, IGST)
- **Total highlighted** with blue background

### 6. **Notes & Terms**
- Dedicated section for notes
- Terms & Conditions with automatic bullet points
- Proper formatting and spacing
- Automatic page breaks when needed

### 7. **Advanced Sections**
All advanced sections are included with proper formatting:
- **Bill of Materials (BOM)**: Part numbers, descriptions, quantities, specifications
- **Service Level Agreement (SLA)**: Overview, commitments, metrics, penalties
- **Project Timeline**: Milestones, phases, dates, deliverables

### 8. **Company Settings Integration**
The PDF now fetches company information from database settings:
- `company_name` - Default: "OPTIVALUE TEK"
- `company_address` - Company address
- `company_phone` - Contact phone number
- `company_email` - Contact email
- `company_website` - Company website URL
- `company_gstin` - GST Identification Number

## Design Specifications

### Colors
- **Primary Color**: #1e40af (Blue) - Headers, highlights
- **Secondary Color**: #64748b (Gray) - Footer text
- **Accent Color**: #0f172a (Dark) - Text emphasis
- **Light Gray**: #f1f5f9 - Background boxes
- **Border Color**: #e2e8f0 - Lines and borders

### Typography
- **Company Name**: Helvetica Bold, 18pt
- **Document Title**: Helvetica Bold, 16pt
- **Section Headers**: Helvetica Bold, 12pt, Blue
- **Body Text**: Helvetica, 9-10pt
- **Footer Text**: Helvetica, 8pt

### Page Layout
- **Page Size**: A4 (595.28 x 841.89 points)
- **Margins**: 50pt left/right, 80pt top/bottom (for header/footer)
- **Content Width**: 495.28pt

## Files Modified

1. **server/services/pdf.service.ts**
   - Complete rewrite with professional layout
   - Added header and footer methods
   - Enhanced table rendering
   - Improved totals section
   - Better advanced sections formatting

2. **server/routes.ts**
   - Updated `/api/quotes/:id/pdf` route
   - Updated `/api/quotes/:id/email` route
   - Updated `/api/invoices/:id/pdf` route
   - Updated `/api/invoices/:id/email` route
   - All routes now fetch company settings from database

## Usage

### Setting Up Company Information

Admins can set company information via the Admin Settings page or directly in the database:

```sql
INSERT INTO settings (key, value) VALUES
  ('company_name', 'OPTIVALUE TEK'),
  ('company_address', 'Your Company Address Line 1\nCity, State - Pincode'),
  ('company_phone', '+91-XXXX-XXXXXX'),
  ('company_email', 'info@company.com'),
  ('company_website', 'www.company.com'),
  ('company_gstin', 'XX XXXXX XXXXX X X X');
```

### Generating PDFs

**From Quote Detail Page:**
1. Navigate to a quote
2. Click "Download PDF" button
3. PDF will be downloaded with professional formatting

**Via Email:**
1. Click "Email Quote" button
2. Enter recipient email
3. Quote will be sent with professionally formatted PDF attachment

**From Invoice Detail Page:**
1. Navigate to an invoice
2. Click "Download PDF" button
3. Invoice PDF will be downloaded

## API Endpoints

### Quote PDF Export
```
GET /api/quotes/:id/pdf
```
Returns a professional PDF document for the specified quote.

### Invoice PDF Export
```
GET /api/invoices/:id/pdf
```
Returns a professional PDF document for the specified invoice.

### Email Quote
```
POST /api/quotes/:id/email
Body: { recipientEmail: string, message?: string }
```
Sends an email with professional PDF attachment.

### Email Invoice
```
POST /api/invoices/:id/email
Body: { recipientEmail: string }
```
Sends an invoice email with professional PDF attachment.

## Testing

To test the PDF generation:

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Create or open a quote with:**
   - Client information
   - Multiple line items
   - Taxes applied
   - Notes and terms & conditions
   - Advanced sections (BOM, SLA, Timeline)

3. **Download the PDF:**
   - Click "Download PDF" button
   - Verify all sections are properly formatted
   - Check header/footer on all pages
   - Verify page numbers are correct

4. **Test email functionality:**
   - Configure email settings (if not already done)
   - Send quote via email
   - Check recipient receives professional PDF

## Customization

### Changing Colors

Edit the color constants in `pdf.service.ts`:

```typescript
private static readonly PRIMARY_COLOR = "#1e40af"; // Blue
private static readonly SECONDARY_COLOR = "#64748b"; // Gray
private static readonly LIGHT_GRAY = "#f1f5f9";
private static readonly BORDER_COLOR = "#e2e8f0";
```

### Adding Company Logo

To add a logo (future enhancement):
1. Store logo path in settings: `company_logo`
2. In `drawHeader` method, add:
   ```typescript
   if (data.companyLogo) {
     doc.image(data.companyLogo, x, y, { width: 80, height: 40 });
   }
   ```

### Customizing Layout

Adjust margin and dimension constants:
```typescript
private static readonly MARGIN_LEFT = 50;
private static readonly MARGIN_RIGHT = 50;
private static readonly MARGIN_TOP = 80;
private static readonly MARGIN_BOTTOM = 80;
```

## Benefits

1. **Professional Appearance**: Matches commercial proposal standards
2. **Consistent Branding**: Company information from central settings
3. **Better Readability**: Clear sections, proper spacing, alternating row colors
4. **Complete Information**: All quote/invoice details included
5. **Automatic Pagination**: Handles multi-page documents gracefully
6. **Extensible**: Easy to add new sections or customize

## Technical Details

- **Library**: PDFKit (existing dependency)
- **Streaming**: Efficient buffer-based streaming
- **Font**: Helvetica (built-in, no external fonts needed)
- **Currency**: ₹ (Indian Rupees) - can be customized
- **Date Format**: US style (Month DD, YYYY) - can be customized

## Future Enhancements

1. **Logo Support**: Add company logo to header
2. **Custom Colors**: Allow color customization via settings
3. **Multiple Templates**: Support different template styles
4. **Watermarks**: Add "DRAFT" watermark for draft quotes
5. **Digital Signature**: Add signature section for authorized person
6. **QR Code**: Add QR code for quick access/verification
7. **Multi-currency**: Support different currencies based on client location

## Support

For issues or questions:
1. Check browser console for any errors
2. Verify company settings are properly configured
3. Ensure quote/invoice has all required data
4. Check server logs for PDF generation errors

