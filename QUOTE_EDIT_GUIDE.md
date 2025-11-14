# Quote Edit Feature - Quick Start Guide

## For Users

### How to Edit a Quote

#### Method 1: From Quote Detail Page
1. Navigate to **Quotes** in the sidebar
2. Click on any quote to view details
3. Look for the **Edit** button (pencil icon) in the top-right action bar
4. Click **Edit** to open the edit form
5. Make your changes
6. Click **Update Quote** to save

#### Method 2: From Quotes List
1. Navigate to **Quotes** in the sidebar
2. Find the quote you want to edit
3. Click the **Pencil icon** button in the action buttons
4. Make your changes in the form
5. Click **Update Quote** to save

### Important Notes

✅ **You CAN edit:**
- Draft quotes
- Sent quotes
- Approved quotes
- Rejected quotes

❌ **You CANNOT edit:**
- Invoiced quotes (the Edit button will not be visible)

### Why Can't I Edit an Invoiced Quote?

Once a quote is converted to an invoice, it becomes a financial document. To maintain data integrity and compliance:
- The original quote is locked
- If changes are needed, create a new quote instead
- The invoice and original quote must remain consistent

## For Developers

### Implementation Summary

#### New Route
```
/quotes/:id/edit → QuoteCreate component (edit mode)
```

#### Key Features
1. **Dual-mode component**: QuoteCreate handles both create and edit
2. **Smart loading**: Fetches and populates existing quote data
3. **Protection**: Multiple layers prevent editing invoiced quotes
4. **Tax calculation**: Converts stored amounts back to percentages

#### API Endpoints
```bash
# Update specific fields only
PATCH /api/quotes/:id

# Full update with items
PUT /api/quotes/:id
```

#### Backend Validation
```typescript
if (existingQuote.status === "invoiced") {
  return res.status(400).json({ 
    error: "Cannot edit an invoiced quote" 
  });
}
```

### Testing the Feature

#### Quick Test Steps
```bash
# 1. Start the server (if not running)
npm run dev

# 2. Login to the application
# Open browser: http://localhost:5000

# 3. Create a test quote
- Navigate to Quotes → Create New Quote
- Fill in required fields
- Save as draft

# 4. Test editing
- Click the Edit button
- Modify some fields
- Save changes
- Verify changes are reflected

# 5. Test invoice protection
- Convert the quote to an invoice
- Verify Edit button disappears
- Attempt direct URL access: /quotes/{id}/edit
- Verify error message displays
```

### Code Examples

#### Detecting Edit Mode
```typescript
const [, params] = useRoute("/quotes/:id/edit");
const isEditMode = !!params?.id;
```

#### Loading Existing Data
```typescript
const { data: existingQuote } = useQuery<QuoteDetail>({
  queryKey: ["/api/quotes", params?.id],
  enabled: isEditMode,
});

useEffect(() => {
  if (existingQuote && isEditMode) {
    form.reset({
      // Populate form with existing data
    });
  }
}, [existingQuote, isEditMode, form]);
```

#### Conditional Button Rendering
```typescript
{quote.status !== "invoiced" && (
  <Button onClick={() => setLocation(`/quotes/${id}/edit`)}>
    <Pencil className="h-4 w-4 mr-2" />
    Edit
  </Button>
)}
```

## Troubleshooting

### Edit Button Not Showing
**Problem:** Can't see the Edit button on a quote
**Solution:** Check if the quote has been invoiced. Invoiced quotes cannot be edited.

### Changes Not Saving
**Problem:** Clicking Update Quote doesn't save changes
**Solution:** 
1. Check browser console for errors
2. Verify the quote isn't invoiced
3. Ensure all required fields are filled
4. Check server logs for backend errors

### Form Not Loading Quote Data
**Problem:** Edit form is empty when it should have data
**Solution:**
1. Check if the quote ID in the URL is correct
2. Verify the backend API is returning quote data
3. Check browser console for fetch errors
4. Ensure proper authentication

### Server Errors
**Problem:** Getting 400 or 500 errors when trying to edit
**Possible causes:**
- Quote has been invoiced (400 error)
- Quote doesn't exist (404 error)
- Server connection issues (500 error)

## Feature Checklist

- [x] Backend PATCH endpoint validates invoiced status
- [x] Backend PUT endpoint handles full quote updates
- [x] Frontend edit route added
- [x] QuoteCreate component supports edit mode
- [x] Quote detail page shows Edit button
- [x] Quotes list shows Edit buttons
- [x] Edit button hidden for invoiced quotes
- [x] Form populates with existing data
- [x] Tax percentages calculated from amounts
- [x] Success/error toast notifications
- [x] Activity logging for edits
- [x] Protection against editing invoiced quotes

## Next Steps

### Recommended Enhancements
1. **Edit History**: Add a history tab to show all edits
2. **Permissions**: Role-based editing restrictions
3. **Warnings**: Alert users before editing sent/approved quotes
4. **Auto-save**: Save draft edits automatically
5. **Change Tracking**: Highlight what changed in edits

### Testing Tasks
- [ ] Test editing all quote statuses (except invoiced)
- [ ] Test with different user roles
- [ ] Test concurrent edits (two users editing same quote)
- [ ] Test large quotes (many line items)
- [ ] Test validation (missing required fields)
- [ ] Test navigation (back button, cancel, etc.)

## Support

For issues or questions:
1. Check the console for error messages
2. Review server logs for backend errors
3. Verify database connectivity
4. Check authentication tokens
5. Review the QUOTE_EDIT_FEATURE.md for detailed implementation

---

**Last Updated:** November 14, 2025
**Version:** 1.0.0

