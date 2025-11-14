# QuoteProGen Repository Configuration

## Project Overview
Professional Quoting and Proposal Generation platform using Express.js, React, Tailwind CSS, PostgreSQL (Neon), Drizzle ORM, and JWT authentication.

## Technology Stack
- **Frontend**: React 18, Tailwind CSS, TypeScript, Wouter (routing)
- **Backend**: Express.js, Node.js, TypeScript
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: JWT with HTTP-only cookies, bcryptjs
- **UI Components**: Radix UI primitives with Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Testing Framework**: Playwright (E2E tests)

## Project Structure
```
/client/src          - React frontend (pages, components)
/server              - Express API routes and business logic
/shared              - Shared schemas and types (schema.ts)
/tests               - E2E test files (Playwright)
```

## Key Files
- `server/routes.ts` - API route handlers
- `server/storage.ts` - Database operations interface
- `shared/schema.ts` - Database schemas and Zod validators
- `client/src/App.tsx` - Main React app with routing
- `package.json` - Dependencies and scripts

## Authentication
- JWT tokens stored in HTTP-only cookies
- Access token expiry: 15 minutes
- Password hashing: bcryptjs with 10 salt rounds
- Session management via JWT

## Database
- PostgreSQL via Neon
- Drizzle ORM for type-safe queries
- Tables: users, clients, quotes, quoteItems, invoices, templates, activityLogs, settings

## Testing
- **Framework**: Playwright (1.40.0+)
- **Test Location**: `/tests/e2e/`
- **Convention**: Feature-based test files (e.g., `analytics.spec.ts`, `client-management.spec.ts`)
- **Configuration**: `playwright.config.ts` with multiple browser support
- **Test Scripts**: 
  - `npm test` - Run all tests
  - `npm run test:analytics` - Analytics feature tests
  - `npm run test:client-management` - Client management tests
  - `npm run test:pricing` - Tax & pricing tests
  - `npm run test:security` - Security hardening tests
  - `npm run test:ui` - Interactive UI mode
  - `npm run test:report` - View HTML report

## Development
- Start dev server: `npm run dev`
- Build: `npm run build`
- Type check: `npm run check`
- Database migration: `npm run db:push`

## Implementation Phases

### Phase 1 - CRITICAL (MVP Core)
- [x] PDF Generation & Export
- [x] Email Integration  
- [x] Refresh Token Implementation

### Phase 2 - HIGH
- [ ] Quote Template System with customization
- [x] Advanced Quote Sections (BOM, SLA, Timeline)
- [x] Invoice Payment Tracking UI
- [x] Enhanced Admin Settings

### Phase 3 - MEDIUM
- [x] Analytics Enhancements
- [x] Client Management UI Improvements
- [ ] Tax & Pricing Enhancements
- [ ] Security Hardening

### Phase 4 - LOW
- [ ] Mobile PWA
- [ ] Accessibility (WCAG 2.1 AA)
- [ ] Advanced Reporting

## Key API Endpoints
```
/api/auth/login, /signup, /logout, /refresh, /me, /reset-password
/api/users (CRUD)
/api/clients (CRUD)
/api/quotes (CRUD, convert-to-invoice)
/api/quotes/[id]/pdf (PDF export)
/api/quotes/[id]/email (Email sharing)
/api/invoices (CRUD)
/api/templates (CRUD)
/api/analytics
/api/settings
```

## Important Notes
- Backup email required for password reset functionality
- All timestamps in UTC
- Activity logging for audit trail
- Role-based access control (admin, manager, user, viewer)