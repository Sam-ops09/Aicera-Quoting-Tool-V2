# PDF Generation - Quick Start Guide

## What Was Changed

The PDF generation system has been completely rebuilt with a professional, commercial-quality layout including:
- ✅ Professional header with company branding
- ✅ Footer with contact information and page numbers
- ✅ Clean, organized sections with proper spacing
- ✅ Professional table layout with alternating row colors
- ✅ Highlighted totals section
- ✅ All company information pulled from database settings

## How to Use

### 1. Set Up Company Information (One-Time Setup)

As an **admin user**, go to the Admin Settings page and configure:
- Company Name (e.g., "OPTIVALUE TEK")
- Company Address
- Company Phone
- Company Email
- Company Website
- Company GSTIN

These settings will be used in all PDFs automatically.

### 2. Generate a Quote PDF

1. Go to the Quotes page
2. Click on any quote to view details
3. Click the **"Download PDF"** button
4. Your professional PDF will be downloaded

### 3. Email a Quote with PDF

1. Open a quote
2. Click the **"Email Quote"** button
3. Enter the recipient's email address
4. Add an optional message
5. Click **Send**
6. The recipient will receive a professional PDF attachment

### 4. Generate an Invoice PDF

1. Go to the Invoices page
2. Click on any invoice to view details
3. Click the **"Download PDF"** button
4. Your professional invoice PDF will be downloaded

## What's Included in the PDF

### Header (On Every Page)
- Company name in large, bold text
- Document title (COMMERCIAL PROPOSAL or INVOICE)
- Professional blue banner design

### Document Information
- Proposal/Quote/Invoice number
- Date
- Validity period
- Status
- Reference number (if applicable)

### Client Information
- Client company name
- Contact person
- Email and phone
- Billing address
- GSTIN

### Line Items
Professional table showing:
- Serial number
- Description
- Quantity
- Unit price
- Subtotal

With automatic page breaks for long lists!

### Totals Summary
Clean summary box showing:
- Subtotal
- Discount (if any)
- Shipping charges (if any)
- Tax breakdown (CGST, SGST, IGST)
- **Total in highlighted box**

### Additional Sections
- Notes (if added)
- Terms & Conditions (with bullet points)
- Bill of Materials (if added)
- Service Level Agreement (if added)
- Project Timeline (if added)

### Footer (On Every Page)
- Company address
- Contact information (phone, email, website)
- Page numbers (e.g., "Page 1 of 3")

## Testing the Implementation

### Quick Test

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Create a test quote:**
   - Add a client
   - Add multiple line items
   - Add notes and terms
   - Save the quote

3. **Download the PDF:**
   - Click "Download PDF"
   - Open the PDF
   - Verify it looks professional

4. **Check all pages:**
   - Verify header appears on every page
   - Verify footer appears on every page
   - Verify page numbers are correct

## Troubleshooting

### PDF is missing company information
- **Solution**: Go to Admin Settings and configure company details

### PDF doesn't download
- **Solution**: Check browser console for errors. Verify the quote has all required data.

### Email not sending
- **Solution**: Verify email settings are configured in the .env file

### PDF looks different from expected
- **Solution**: Make sure you're using the latest code. Run `npm run build` and restart the server.

## Customization Options

### Change Colors
Edit `server/services/pdf.service.ts` and modify these constants:
```typescript
private static readonly PRIMARY_COLOR = "#1e40af"; // Header color
private static readonly LIGHT_GRAY = "#f1f5f9"; // Background color
```

### Change Margins
```typescript
private static readonly MARGIN_LEFT = 50;
private static readonly MARGIN_RIGHT = 50;
private static readonly MARGIN_TOP = 80;
private static readonly MARGIN_BOTTOM = 80;
```

### Add Company Logo
1. Upload logo to `client/public/logo.png`
2. Add to settings: `company_logo = /logo.png`
3. Modify `drawHeader` method to include the image

## API Reference

### Download Quote PDF
```
GET /api/quotes/:id/pdf
Authorization: Bearer token required
Response: PDF file (application/pdf)
```

### Download Invoice PDF
```
GET /api/invoices/:id/pdf
Authorization: Bearer token required
Response: PDF file (application/pdf)
```

### Email Quote
```
POST /api/quotes/:id/email
Authorization: Bearer token required
Body: {
  recipientEmail: string,
  message?: string
}
Response: { success: true, message: string }
```

### Email Invoice
```
POST /api/invoices/:id/email
Authorization: Bearer token required
Body: {
  recipientEmail: string
}
Response: { success: true, message: string }
```

## Database Settings Keys

The following settings keys are used for PDF generation:

| Key | Description | Example |
|-----|-------------|---------|
| `company_name` | Company name | "OPTIVALUE TEK" |
| `company_address` | Full address | "123 Street Name, City, State 12345" |
| `company_phone` | Contact phone | "+91-XXXX-XXXXXX" |
| `company_email` | Contact email | "info@company.com" |
| `company_website` | Website URL | "www.company.com" |
| `company_gstin` | GST number | "XX XXXXX XXXXX X X X" |

## Need Help?

1. Check the full documentation: `PDF_GENERATION_IMPLEMENTATION.md`
2. Review the code comments in `server/services/pdf.service.ts`
3. Test with sample data first
4. Check server logs for detailed error messages

## Summary

The new PDF generation system provides:
- ✨ Professional, commercial-quality output
- 📄 Multi-page support with headers/footers
- 🎨 Clean, organized layout
- 📊 Professional tables and formatting
- ⚙️ Easy customization
- 🔧 Database-driven settings

Your quotes and invoices will now look professional and ready to send to clients!

