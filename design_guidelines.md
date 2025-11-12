# Professional Quoting Tool - Design Guidelines

## Design Approach
**Selected Approach:** Design System (Utility-Focused) with Custom Branding
This is a productivity-focused business application where clarity, efficiency, and professional presentation are paramount. We'll use Material Design principles adapted with the provided brand colors for a polished, enterprise-grade experience.

## Core Design Elements

### A. Typography
**Font Families:**
- **Primary (UI):** Inter (400, 500, 600, 700) - buttons, labels, navigation, form fields, data tables
- **Secondary (Content):** Open Sans (400, 600) - body text, descriptions, quote content

**Hierarchy:**
- Page Titles: Inter 700, text-2xl/text-3xl
- Section Headers: Inter 600, text-xl
- Card Titles: Inter 600, text-lg
- Body Text: Open Sans 400, text-base
- Labels/Metadata: Inter 500, text-sm
- Data/Numbers: Inter 600, text-base (tabular figures)

### B. Color System
**Brand Colors:**
- Primary Blue: `#0046FF` - CTAs, active states, links, primary buttons
- Deep Blue: `#001BB7` - top navigation, section headers, important data
- Warm Orange: `#FF8040` - notifications, status indicators, progress bars, accent highlights
- Cream Beige: `#F5F1DC` - page backgrounds, card backgrounds, subtle dividers
- Charcoal: `#2C2C2C` - primary text, icons

**Functional Colors:**
- Success: `#10B981` (green) - approved quotes, payment received
- Warning: `#F59E0B` (amber) - pending approvals, expiring quotes
- Error: `#EF4444` (red) - rejected, overdue invoices
- Info: Primary Blue - draft status, informational messages

### C. Layout System
**Spacing Scale:** Tailwind units of 2, 4, 6, 8, 12, 16 (p-2, m-4, gap-6, etc.)
- Component padding: p-4 to p-6
- Section spacing: py-8 to py-12
- Card gaps: gap-4 to gap-6
- Form field spacing: space-y-4

**Grid System:**
- Dashboard: 12-column grid with gap-6
- Quote builder: 2-column layout (lg:grid-cols-3 for sidebars)
- Data tables: Full-width with horizontal scroll on mobile
- Admin panels: Sidebar (w-64) + main content area

**Container Structure:**
- Max-width: `max-w-7xl` for main content areas
- Dashboard cards: `max-w-sm` to `max-w-md` per metric
- Forms: `max-w-2xl` centered for optimal readability

### D. Component Library

**Navigation:**
- **Top Bar:** Deep Blue (#001BB7) background, white text, h-16, company logo left, user menu right, shadow-md
- **Sidebar (Admin):** Cream Beige (#F5F1DC) background, w-64, sticky position, collapsible items with hover states

**Cards:**
- Background: White with shadow-sm
- Border: 1px border-gray-200, rounded-lg
- Padding: p-6
- Hover: shadow-md transition for interactive cards

**Buttons:**
- **Primary:** bg-[#0046FF], text-white, px-6 py-2.5, rounded-md, font-inter font-600
- **Secondary:** border-2 border-[#0046FF], text-[#0046FF], same padding
- **Danger:** bg-red-600, text-white
- **Icon buttons:** p-2, rounded-md, hover:bg-gray-100

**Forms:**
- Labels: Inter 500, text-sm, text-gray-700, mb-2
- Inputs: border border-gray-300, rounded-md, px-4 py-2.5, focus:ring-2 focus:ring-[#0046FF]
- Required fields: Red asterisk after label
- Validation: Error text in red-600 below field with icon

**Tables (Quote Items, Client Lists):**
- Striped rows: alternate cream beige and white
- Header: Deep Blue background, white text, Inter 600
- Cells: py-3 px-4, Inter 400
- Actions column: Icon buttons for edit/delete

**Status Badges:**
- Draft: bg-gray-200, text-gray-800
- Sent: bg-blue-100, text-[#001BB7]
- Approved: bg-green-100, text-green-800
- Rejected: bg-red-100, text-red-800
- Invoiced: bg-purple-100, text-purple-800
- Padding: px-3 py-1, rounded-full, text-xs font-600

**Dashboard Metrics Cards:**
- Large number: Inter 700, text-4xl, Primary Blue color
- Label: Open Sans 400, text-sm, text-gray-600
- Trend indicator: Warm Orange with arrow icon
- Icon: Top-right corner, opacity-20, large size

**PDF Preview Panel:**
- Fixed right sidebar on desktop (w-1/2 or w-2/5)
- White background with shadow-lg
- Sticky position during scroll
- Zoom controls at top
- Download/Email buttons in header

**Quote Builder Interface:**
- Left panel: Form inputs and line items table
- Right panel: Live PDF preview
- Sticky summary bar at bottom: Subtotal, Tax, Total with Deep Blue background
- Add line item: Dashed border button, full-width, Warm Orange on hover

### E. Animations
**Minimal & Purposeful:**
- Page transitions: 150ms opacity fade
- Dropdown menus: 200ms slide-down
- Modal overlays: 250ms fade + scale
- Hover states: 150ms color transitions
- **No scroll animations or parallax effects**

## Images
**No hero images required.** This is a utility application focused on data and forms.

**Images Used:**
- Company logo: Top-left navigation (h-8 to h-10)
- Client logos: Small thumbnails in client list (w-12 h-12, rounded)
- PDF template previews: Thumbnail grid in template selector (aspect-[1/1.4])
- Empty states: Simple illustrations for "No quotes yet" scenarios

## Key Screen Layouts

**Dashboard:** 4-column metric cards at top, followed by 2-column layout (recent quotes left, activity feed right)

**Quote Builder:** 60/40 split (form left, PDF preview right on lg+), stacked on mobile

**Admin User Management:** Data table with search bar and filter dropdowns above, action buttons per row

**Client Profile:** Header card with details, tabs below (Quotes, Invoices, Activity), content area

This design prioritizes clarity, professional appearance, and efficient workflows for business users creating commercial proposals.