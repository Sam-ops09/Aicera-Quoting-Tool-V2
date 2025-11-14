# Quote Edit Feature Implementation

## Overview
This document describes the implementation of the quote editing feature that allows users and admins to edit quotes unless they have been invoiced.

## Changes Made

### 1. Backend Changes (server/routes.ts)

#### Updated PATCH Endpoint
- Added validation to prevent editing invoiced quotes
- Checks if quote exists before allowing updates
- Returns appropriate error messages

```typescript
app.patch("/api/quotes/:id", ...)
- Validates quote status before allowing updates
- Prevents editing if status is "invoiced"
- Returns 400 error with message "Cannot edit an invoiced quote"
```

#### New PUT Endpoint
- Created comprehensive update endpoint that handles quote data and items
- Supports full quote editing with line items
- Deletes and recreates items to ensure consistency

```typescript
app.put("/api/quotes/:id", ...)
- Validates quote status (prevents editing invoiced quotes)
- Updates quote metadata
- Deletes existing quote items
- Creates new items from the request
- Logs activity
```

### 2. Frontend Changes

#### A. Quote Create/Edit Page (client/src/pages/quote-create.tsx)

**New Features:**
- Dual-mode component: handles both create and edit operations
- Detects edit mode via route parameter (`/quotes/:id/edit`)
- Loads existing quote data when in edit mode
- Calculates tax percentages from stored amounts
- Prevents editing of invoiced quotes with appropriate UI feedback

**Key Changes:**
- Added `useRoute` hook to detect edit mode
- Added `QuoteDetail` interface for fetching existing quotes
- Added `useEffect` to populate form with existing quote data
- Added `updateMutation` for updating quotes
- Modified `onSubmit` to route to appropriate mutation
- Updated page title and button text based on mode
- Added loading state for fetching quote data
- Added protection against editing invoiced quotes

#### B. Quote Detail Page (client/src/pages/quote-detail.tsx)

**New Features:**
- Edit button visible for non-invoiced quotes
- Button navigates to edit route: `/quotes/:id/edit`

**Key Changes:**
- Added `Pencil` icon import
- Added conditional Edit button
- Button only shows when `quote.status !== "invoiced"`

#### C. Quotes List Page (client/src/pages/quotes.tsx)

**New Features:**
- Edit action button for each quote in the list
- Conditional rendering based on quote status

**Key Changes:**
- Added `Pencil` icon import
- Added Edit button for each quote card
- Button only shows when `quote.status !== "invoiced"`
- Button navigates to `/quotes/:id/edit`

#### D. App Routing (client/src/App.tsx)

**New Features:**
- Added edit route that reuses the QuoteCreate component

**Key Changes:**
- Added route: `/quotes/:id/edit` → `QuoteCreate` component

## Business Rules

### When Can Quotes Be Edited?
✅ **Can Edit:**
- Draft quotes
- Sent quotes
- Approved quotes
- Rejected quotes

❌ **Cannot Edit:**
- Invoiced quotes (already converted to invoices)

### Why This Restriction?
Once a quote is converted to an invoice, it becomes a financial document with legal implications. Editing it would:
- Break the audit trail
- Cause discrepancies between invoice and original quote
- Violate accounting best practices
- Potentially create compliance issues

## User Experience

### Edit Flow:
1. User views a quote (detail page or list page)
2. If quote is not invoiced, "Edit" button is visible
3. User clicks "Edit" button
4. System loads quote data into the form
5. User makes changes
6. User clicks "Update Quote"
7. System validates that quote hasn't been invoiced
8. System saves changes and returns to quote detail page

### Protection Against Editing Invoiced Quotes:
- **UI Level:** Edit button hidden for invoiced quotes
- **Route Level:** Edit page shows error message if quote is invoiced
- **API Level:** Backend validates and rejects edit attempts with 400 error

## Testing Recommendations

### Manual Testing:
1. Create a new quote → Verify can edit
2. Edit the quote → Verify changes save correctly
3. Send the quote → Verify can still edit
4. Approve the quote → Verify can still edit
5. Convert to invoice → Verify edit button disappears
6. Try to access edit URL directly → Verify appropriate error message

### Test Cases:
- Edit draft quote and save
- Edit sent quote and verify status retained
- Edit approved quote
- Attempt to edit invoiced quote (should fail gracefully)
- Verify calculations update correctly when editing items
- Verify tax percentages calculated correctly from stored amounts

## API Endpoints

### PATCH /api/quotes/:id
**Purpose:** Update specific quote fields
**Restrictions:** Cannot update invoiced quotes
**Returns:** Updated quote object or error

### PUT /api/quotes/:id
**Purpose:** Complete quote update including items
**Restrictions:** Cannot update invoiced quotes
**Payload:** Full quote data + items array
**Returns:** Updated quote object or error

## UI Components

### Edit Button Locations:
1. Quote detail page (top right actions bar)
2. Quotes list page (action buttons for each quote card)

### Button Behavior:
- Icon: Pencil icon
- Visibility: Only shown for non-invoiced quotes
- Navigation: Routes to `/quotes/:id/edit`

## Future Enhancements

### Potential Improvements:
1. Add edit history/audit log in the UI
2. Show who last edited and when
3. Add draft saving for partial edits
4. Add version comparison (before/after editing)
5. Add permission-based editing (e.g., only admins can edit approved quotes)
6. Add warning prompt if editing sent/approved quotes

## Error Handling

### Backend Errors:
- 404: Quote not found
- 400: Cannot edit invoiced quote
- 500: Server error during update

### Frontend Handling:
- Displays toast notifications for success/error
- Redirects appropriately based on success/failure
- Shows loading states during operations
- Provides clear error messages to users

## Files Modified

### Backend:
- `server/routes.ts` - Updated PATCH endpoint, added PUT endpoint

### Frontend:
- `client/src/pages/quote-create.tsx` - Added edit mode functionality
- `client/src/pages/quote-detail.tsx` - Added edit button
- `client/src/pages/quotes.tsx` - Added edit action buttons
- `client/src/App.tsx` - Added edit route

## Security Considerations

- Backend validation ensures invoiced quotes cannot be edited
- Authentication required for all quote operations
- Activity logging tracks all quote updates
- Frontend restrictions provide UX but backend enforces rules

