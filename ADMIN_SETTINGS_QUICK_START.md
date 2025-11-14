# Admin Settings Quick Start Guide

## 🚀 Getting Started

This guide will help you quickly configure your QuoteProGen system using the Enhanced Admin Settings.

## Accessing Admin Settings

1. **Login as Admin**
   - Navigate to `/login`
   - Use your admin credentials
   - Role must be `admin`

2. **Navigate to Settings**
   - Click on "Settings" in the sidebar
   - Or go directly to `/admin-settings`

## 📋 Step-by-Step Configuration

### Step 1: Configure Company Profile

**Why:** Your company details appear on all quotes and invoices.

1. Click the **Company** tab
2. Fill in the required fields:
   - **Company Name**: Your legal business name
   - **Address**: Complete business address
   - **Tax ID/GSTIN**: Your government tax ID
   - **Phone**: Primary contact number (optional)
   - **Email**: Official business email
3. Click **Save Changes**

**Example:**
```
Company Name: ACME Corporation Ltd.
Address: 123 Business Street, Tech Park, Bangalore, KA 560001, India
Tax ID: 29ABCDE1234F1Z5
Phone: +91-80-1234-5678
Email: info@acmecorp.com
```

### Step 2: Set Up Quote & Invoice Numbering

**Why:** Consistent numbering helps with organization and compliance.

1. Click the **Quotes** tab
2. Configure numbering:
   - **Quote Prefix**: e.g., "QT" → generates QT-0001, QT-0002...
   - **Invoice Prefix**: e.g., "INV" → generates INV-0001, INV-0002...
   - **Default Tax Rate**: Your standard GST rate (e.g., 18%)
3. Click **Save Changes**

**Tips:**
- Use 2-4 letter prefixes for clarity
- Standard Indian GST rate is 18% (9% SGST + 9% CGST)

### Step 3: Configure Tax Rates

**Why:** Automatic tax calculation based on client location.

1. Click the **Tax Rates** tab
2. Click **Add Tax Rate**
3. Fill in the details:
   - **Region**: State code (e.g., IN-KA for Karnataka)
   - **Tax Type**: Select GST, VAT, or SAT
   - **SGST Rate**: State GST percentage
   - **CGST Rate**: Central GST percentage
   - **IGST Rate**: Integrated GST percentage
4. Click **Create Tax Rate**

**Common GST Rates:**
```
Standard Rate (18%):
- SGST: 9%
- CGST: 9%
- IGST: 18%

Reduced Rate (12%):
- SGST: 6%
- CGST: 6%
- IGST: 12%

Low Rate (5%):
- SGST: 2.5%
- CGST: 2.5%
- IGST: 5%
```

**Region Codes:**
- IN-KA: Karnataka
- IN-MH: Maharashtra
- IN-TN: Tamil Nadu
- IN-DL: Delhi
- etc.

### Step 4: Set Up Pricing Tiers (Optional)

**Why:** Automatic discounts encourage larger orders.

1. Click the **Pricing** tab
2. Click **Add Pricing Tier**
3. Configure tier:
   - **Tier Name**: e.g., "Standard", "Premium", "Enterprise"
   - **Min Amount**: Starting threshold (e.g., 0)
   - **Max Amount**: Upper limit or leave empty for unlimited
   - **Discount %**: Automatic discount to apply (e.g., 5)
   - **Description**: Optional description
4. Click **Create Pricing Tier**

**Example Tiers:**
```
Standard Tier:
- Min: ₹0
- Max: ₹50,000
- Discount: 0%

Premium Tier:
- Min: ₹50,000
- Max: ₹200,000
- Discount: 5%

Enterprise Tier:
- Min: ₹200,000
- Max: (unlimited)
- Discount: 10%
```

### Step 5: Configure Currency Settings

**Why:** Support international clients with multiple currencies.

1. Click the **Currency** tab
2. Select **Base Currency** (your primary currency)
   - Typically INR for Indian businesses
3. Select **Supported Currencies** (check all you want to support)
   - INR, USD, EUR, GBP, AUD, CAD, SGD, AED
4. Review the **Current Settings** preview
5. Click **Save Currency Settings**

**Recommendations:**
- Base Currency: INR (for India-based businesses)
- Always include your base currency in supported list
- Add USD and EUR for international clients

## 🎯 Quick Configuration Checklist

Use this checklist to ensure complete setup:

- [ ] Company name and address configured
- [ ] Tax ID/GSTIN added
- [ ] Company email and phone set
- [ ] Quote prefix configured
- [ ] Invoice prefix configured
- [ ] Default tax rate set
- [ ] At least one tax rate configured for your region
- [ ] Pricing tiers created (if using)
- [ ] Base currency selected
- [ ] Supported currencies chosen

## 💡 Pro Tips

### 1. Test Your Settings
After configuration, create a test quote to verify:
- Company details appear correctly
- Tax calculation works as expected
- Currency symbols display properly
- Numbering follows your prefix

### 2. Regional Tax Rates
Set up tax rates for all regions you do business in:
- Same state clients: Use SGST + CGST
- Other state clients: Use IGST
- Rate should be active and have correct effective dates

### 3. Pricing Tiers Strategy
- Keep tiers simple and clear
- Ensure no gaps between tier ranges
- Make discount increases meaningful
- Consider your profit margins

### 4. Currency Management
- Keep exchange rates updated
- Clearly communicate currency to clients
- Include currency symbol in all documents
- Consider payment gateway currency support

## 🔧 Managing Settings

### Updating Settings
- Changes take effect immediately
- No server restart required
- All active quotes use new settings
- Past quotes remain unchanged

### Deleting Items
**Tax Rates:**
- Click Delete button in the tax rates table
- Confirm deletion
- Note: Active quotes using this rate won't be affected

**Pricing Tiers:**
- Click Delete button in the pricing tiers table
- Confirm deletion
- Note: Existing quotes keep their applied discounts

### Viewing Current Settings
- All settings show current values on load
- Unsaved changes are highlighted
- Form validation prevents invalid data
- Success messages confirm saves

## 🛟 Troubleshooting

### Settings Not Saving
**Problem:** Changes don't persist after save
**Solutions:**
1. Check you're logged in as admin
2. Verify internet connection
3. Check browser console for errors
4. Try refreshing the page and re-entering

### Tax Calculations Wrong
**Problem:** Tax amounts incorrect on quotes
**Solutions:**
1. Verify tax rate is marked as Active
2. Check region code matches client location
3. Ensure SGST + CGST = IGST
4. Confirm effective dates are correct

### Validation Errors
**Problem:** Form won't save with validation errors
**Solutions:**
1. All required fields must be filled (marked with *)
2. Email must be valid format
3. Percentages must be 0-100
4. Amounts must be non-negative

### Currency Not Showing
**Problem:** Currency option not available
**Solutions:**
1. Ensure currency is in supported list
2. Check base currency is set
3. Verify currency settings were saved
4. Clear browser cache and reload

## 📱 Mobile Usage

The admin settings are fully responsive:
- Tabs become a dropdown on mobile
- Forms adapt to smaller screens
- Tables scroll horizontally
- All features work on touch devices

## 🔐 Security Notes

- Only admin role users can access settings
- All changes are logged for audit trail
- Settings are stored securely in database
- No sensitive data in browser localStorage

## 📞 Support

If you encounter issues:
1. Check the full documentation: `ENHANCED_ADMIN_SETTINGS.md`
2. Review error messages in browser console
3. Verify your admin permissions
4. Contact system administrator

## 🎉 You're Ready!

Your QuoteProGen system is now configured. You can:
- Create professional quotes with your branding
- Automatic tax calculations
- Multi-currency support
- Volume-based discounts

Next steps:
1. [Create your first quote](/quote-create)
2. [Manage clients](/clients)
3. [View analytics](/analytics)

---

**Need More Help?**
See `ENHANCED_ADMIN_SETTINGS.md` for detailed documentation on all features.

