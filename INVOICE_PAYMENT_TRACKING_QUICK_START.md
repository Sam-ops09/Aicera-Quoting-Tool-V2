# Invoice Payment Tracking - Quick Start Guide

## Overview
The Invoice Payment Tracking feature allows you to record, track, and manage individual payments for invoices with detailed history and automatic status updates.

## Accessing Payment Tracking

### From Invoices List Page
1. Navigate to **Invoices** from the sidebar
2. You'll see a dashboard with:
   - **Total Revenue**: Sum of all invoice amounts
   - **Collected**: Total amount received across all invoices
   - **Outstanding**: Amount still owed
   - **Invoice Statistics**: Breakdown by payment status

### Filtering Invoices
- Use the **search bar** to find invoices by number or client name
- Use the **status filter dropdown** to show only:
  - All Statuses
  - Pending (no payments)
  - Partial (some payment received)
  - Paid (fully paid)
  - Overdue (past due date)

## Recording a Payment

### Step 1: Open Invoice Details
1. Click on an invoice from the list
2. OR click the eye icon (👁️) to view invoice

### Step 2: Access Payment Tracker
- On the invoice detail page, find the **Payment Tracking** card in the right column
- This shows:
  - Payment summary (total, paid, outstanding)
  - Visual progress bar
  - Complete payment history

### Step 3: Record New Payment
1. Click the **"Record Payment"** button
2. Fill in payment details:
   - **Amount** (required): Enter the payment amount
   - **Payment Method** (required): Select from:
     - Bank Transfer
     - Credit Card
     - Debit Card
     - Check
     - Cash
     - UPI
     - Other
   - **Payment Date**: Defaults to today, can be changed
   - **Transaction ID**: Optional reference number (e.g., check number, transaction ID)
   - **Notes**: Optional notes about the payment
3. Click **"Record Payment"** to save

### What Happens Automatically
- Invoice paid amount is updated
- Payment status is automatically set:
  - **Pending** → **Partial** (first payment)
  - **Partial** → **Paid** (when fully paid)
- Payment appears in history immediately
- Statistics on invoices page update

## Viewing Payment History

The Payment Tracker shows all payments for an invoice:
- **Most recent payments first**
- Each entry displays:
  - Amount and payment method badge
  - Date payment was made
  - Who recorded the payment
  - Transaction reference (if provided)
  - Any notes added

## Managing Payments

### Deleting a Payment
1. Find the payment in the Payment History
2. Click the **trash icon** (🗑️) on the right
3. Confirm deletion
4. System automatically:
   - Recalculates invoice totals
   - Updates payment status
   - Adjusts statistics

**Note**: Be careful when deleting payments as this affects invoice accounting.

## Payment Status Guide

| Status | Description | Visual Indicator |
|--------|-------------|------------------|
| **Pending** | No payments received | Blue badge |
| **Partial** | Some payment received, balance remaining | Yellow badge |
| **Paid** | Fully paid | Green badge |
| **Overdue** | Past due date, not fully paid | Red badge |

## Using Edit Payment (Legacy)
The **"Edit Payment"** button in Invoice Summary allows quick updates:
- Change payment status manually
- Adjust paid amount directly
- Useful for bulk adjustments

**Recommendation**: Use "Record Payment" for better tracking and audit trail.

## Best Practices

### Recording Payments
✅ **DO**:
- Record payments as soon as they're received
- Include transaction IDs for bank transfers
- Add notes for unusual payment situations
- Use the correct payment method

❌ **DON'T**:
- Record duplicate payments
- Delete payments unless absolutely necessary
- Change payment dates arbitrarily

### Payment Methods
- **Bank Transfer**: Wire transfers, ACH, direct deposits
- **Credit Card**: Any credit card payment
- **Debit Card**: Debit card transactions
- **Check**: Physical or digital checks (use transaction ID for check number)
- **Cash**: Cash payments
- **UPI**: UPI payments (common in India)
- **Other**: Any other payment method

### Transaction References
Include these details when available:
- Check numbers
- Wire transfer confirmation codes
- Payment gateway transaction IDs
- Reference numbers from client systems

## Common Workflows

### Single Payment (Full)
1. Client pays invoice in full
2. Click "Record Payment"
3. Enter full amount
4. Select payment method
5. Status automatically changes to "Paid"

### Multiple Partial Payments
1. Client pays first installment
2. Record payment with amount and method
3. Status changes to "Partial"
4. Repeat for subsequent payments
5. Final payment changes status to "Paid"

### Payment Correction
1. Identify incorrect payment in history
2. Delete the incorrect payment
3. Record the correct payment with accurate details

## Reporting & Analytics

### Invoice Dashboard
View aggregate data:
- Total revenue across all invoices
- Total collected amount
- Outstanding balance
- Invoice count by status

### Individual Invoice
Track per-invoice:
- Total amount
- Amount paid
- Outstanding balance
- Payment progress percentage
- Complete payment timeline

## Troubleshooting

### Payment Not Appearing
- Check if you clicked "Record Payment" (not just "Cancel")
- Verify the invoice ID is correct
- Refresh the page
- Check browser console for errors

### Incorrect Payment Status
- Verify all payments are recorded correctly
- Check if any payments were accidentally deleted
- Recalculate by recording a $0.01 payment and deleting it
- Contact administrator if issue persists

### Can't Delete Payment
- Ensure you have proper permissions
- Check if you're the one who recorded it
- Verify payment exists in the history
- Try refreshing the page

## Keyboard Shortcuts
*(Future enhancement - coming soon)*
- `Ctrl/Cmd + P`: Quick record payment
- `Ctrl/Cmd + F`: Focus search
- `Esc`: Close dialogs

## Mobile Usage
The payment tracking interface is responsive:
- Use on tablets and phones
- Stats cards stack vertically on mobile
- Payment forms are optimized for touch
- History entries are easily scrollable

## Tips for Power Users

1. **Batch Processing**: Open multiple invoices in tabs to record payments quickly
2. **Status Filtering**: Use filters to focus on pending/overdue invoices
3. **Transaction IDs**: Always include these for easier bank reconciliation
4. **Payment Notes**: Document payment plan details or special arrangements
5. **Regular Reviews**: Check outstanding amounts weekly/monthly

## Integration Points

### With Other Features
- **PDF Export**: Payment status appears on invoice PDFs
- **Email**: Send invoices with current payment status
- **Analytics**: Payment data feeds into analytics dashboard
- **Activity Logs**: All payment actions are logged for audit

### External Systems
- Export payment data for accounting software (future)
- Import payment confirmations (future)
- API access for automated payment recording (future)

## Support & Questions

### Need Help?
- Check documentation: `INVOICE_PAYMENT_TRACKING_IMPLEMENTATION.md`
- Review this guide
- Contact system administrator
- Submit feedback for improvements

### Feature Requests
Share ideas for enhancements:
- Payment reminders
- Recurring payments
- Payment gateway integration
- Bulk payment imports

---

**Last Updated**: November 14, 2025  
**Version**: 1.0  
**Status**: Production Ready

