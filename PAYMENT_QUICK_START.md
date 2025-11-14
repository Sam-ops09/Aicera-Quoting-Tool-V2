# Quick Start Guide: Invoice Payment Management

## How to Update Invoice Payment Status & Amount

### Step-by-Step Instructions

#### 1. Navigate to Invoice
- Go to the Invoices page
- Click on any invoice to view its details

#### 2. Open Payment Editor
- Look for the **Invoice Summary** card on the right side
- Click the **"Edit Payment"** button in the card header

#### 3. Update Payment Details
You have two options:

**Option A: Update Payment Status**
- Click the dropdown under "Payment Status"
- Select one of:
  - **Pending** - No payment received yet
  - **Partial** - Some payment received
  - **Paid** - Fully paid
  - **Overdue** - Payment is late

**Option B: Update Paid Amount**
- Enter the amount received in the "Paid Amount" field
- The system will automatically:
  - Calculate the outstanding balance
  - Update the status based on the amount (unless you set it manually)

**Option C: Update Both**
- You can update both fields together
- The status you select takes priority over auto-calculation

#### 4. Save Changes
- Click **"Update Payment"** button
- You'll see a success message
- The invoice details will refresh automatically

### Examples

#### Example 1: Client Pays Partial Amount
**Scenario:** Invoice total is ₹100,000, client pays ₹40,000

1. Click "Edit Payment"
2. Enter "40000" in Paid Amount field
3. Status automatically changes to "Partial"
4. Outstanding shows "₹60,000"
5. Click "Update Payment"

#### Example 2: Mark Invoice as Fully Paid
**Scenario:** Client has paid the full amount

1. Click "Edit Payment"
2. Enter the full invoice amount in Paid Amount
3. Status automatically changes to "Paid"
4. Outstanding shows "₹0"
5. Click "Update Payment"

#### Example 3: Mark as Overdue
**Scenario:** Due date has passed, no payment received

1. Click "Edit Payment"
2. Select "Overdue" from status dropdown
3. Keep paid amount as is (or update if needed)
4. Click "Update Payment"

#### Example 4: Client Makes Second Payment
**Scenario:** Client paid ₹40,000 initially, now paying remaining ₹60,000

**Method 1: Update Total Paid**
1. Click "Edit Payment"
2. Enter "100000" (total paid amount) in Paid Amount field
3. Status automatically changes to "Paid"
4. Click "Update Payment"

### Visual Indicators

#### Payment Status Badges
- 🔵 **Blue Badge** = Pending
- 🟡 **Yellow Badge** = Partial
- 🟢 **Green Badge** = Paid
- 🔴 **Red Badge** = Overdue

#### Dialog Features
- **Total Invoice Amount** - Always displayed for reference
- **Outstanding Balance** - Updates in real-time as you type
- **Currency Symbol** - ₹ shown for clarity
- **Validation** - Can't enter negative amounts or exceed total

### Tips & Best Practices

✅ **Do:**
- Update payment status when client makes a payment
- Use "Partial" status for installment payments
- Mark as "Overdue" when payment is late
- Enter exact amounts received

❌ **Don't:**
- Enter amounts greater than the total invoice
- Enter negative amounts
- Forget to update status when payment is received

### Keyboard Shortcuts
- **Tab** - Navigate between fields
- **Enter** - Submit the form (when focused on button)
- **Escape** - Close the dialog without saving

### What Gets Updated?
When you update payment details:
- ✅ Payment Status
- ✅ Paid Amount
- ✅ Outstanding Balance (calculated automatically)
- ✅ Last Payment Date (timestamp)
- ✅ Activity Log (for audit trail)

### Where Can You See Changes?
Changes are immediately visible in:
- Invoice detail page (refreshes automatically)
- Invoice list page (when you navigate back)
- Activity logs (for admins)

### Troubleshooting

**Q: I can't enter more than the total amount**
A: This is by design to prevent errors. The maximum paid amount is the invoice total.

**Q: Status didn't change when I updated the amount**
A: If you manually selected a status, it won't auto-update. Clear your status selection to enable auto-calculation.

**Q: Changes aren't saving**
A: Check your internet connection and ensure you're still logged in. Try refreshing the page.

**Q: I don't see the "Edit Payment" button**
A: Make sure you're viewing a valid invoice detail page, not the invoice list.

### Need Help?
Contact your system administrator or refer to the full documentation in `INVOICE_PAYMENT_MANAGEMENT.md`

---

**Last Updated:** November 14, 2025
**Version:** 1.0

