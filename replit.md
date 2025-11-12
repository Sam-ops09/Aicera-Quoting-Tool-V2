# QuoteFlow - Professional Quoting Platform

## Overview

QuoteFlow is a comprehensive quoting and proposal generation platform built for businesses to create, manage, and track commercial quotes and invoices. The application enables users to generate professional quotes, manage client relationships, track quote statuses through approval workflows, and convert approved quotes into invoices.

**Core Features:**
- Quote creation and management with multi-step workflows
- Client relationship management
- Invoice generation from approved quotes
- Analytics dashboard with revenue tracking and conversion metrics
- Role-based access control (Admin, Manager, User, Viewer)
- PDF generation for quotes and invoices
- Real-time quote status tracking (draft, sent, approved, rejected, invoiced)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React 19 with Vite as the build tool, using TypeScript for type safety

**Routing:** Wouter for client-side routing with protected and public route components

**State Management:**
- TanStack Query (React Query) for server state management and caching
- React Context API for authentication state
- React Hook Form for form state management with Zod validation

**UI Component Library:** Shadcn/ui built on Radix UI primitives with Tailwind CSS for styling

**Design System:**
- Primary font: Inter (weights 400, 500, 600, 700) for UI elements
- Secondary font: Open Sans (weights 400, 600) for body text
- Brand colors: Primary Blue (#0046FF), Deep Blue (#001BB7), Warm Orange (#FF8040), Cream Beige (#F5F1DC), Charcoal (#2C2C2C)
- 8px baseline grid system for consistent spacing
- Card-based layout with sidebar navigation
- Light/dark theme support with manual theme toggle

**Form Validation:** Zod schemas integrated with React Hook Form via @hookform/resolvers

### Backend Architecture

**Runtime:** Node.js with Express.js framework

**API Pattern:** RESTful API with route handlers organized in `/server/routes.ts`

**Development Server:** Vite dev server in middleware mode for HMR during development

**Authentication Flow:**
- JWT-based authentication with HTTP-only cookies
- Bcrypt for password hashing (10 salt rounds)
- Access tokens expire in 15 minutes
- Custom middleware (`authMiddleware`) validates JWT on protected routes
- User sessions stored in JWT payload with user ID, email, and role

**Authorization:**
- Role-based access control with four levels: admin, manager, user, viewer
- Middleware checks user role from JWT payload
- Frontend routes conditionally render based on user role

**API Endpoints Structure:**
- `/api/auth/*` - Authentication (login, signup, logout, password reset)
- `/api/users` - User management (admin only)
- `/api/clients` - Client CRUD operations
- `/api/quotes` - Quote management with status workflows
- `/api/invoices` - Invoice generation and tracking
- `/api/settings` - System configuration
- `/api/analytics` - Dashboard metrics and reporting

### Data Storage

**Database:** PostgreSQL via Neon Database (serverless PostgreSQL)

**ORM:** Drizzle ORM with type-safe schema definitions

**Connection Pooling:** @neondatabase/serverless with WebSocket support for serverless environments

**Schema Design:**
- `users` - User accounts with role-based access, password hashes, and reset tokens
- `clients` - Client information including billing/shipping addresses and GST details
- `quotes` - Quote records with status, pricing breakdown (subtotal, taxes, discounts, shipping)
- `quoteItems` - Line items for quotes with description, quantity, unit price
- `invoices` - Invoice records linked to quotes with payment status tracking
- `templates` - Reusable quote/invoice templates
- `activityLogs` - Audit trail for user actions
- `settings` - System-wide configuration (company info, tax rates, document prefixes)

**Enums:**
- User roles: admin, manager, user, viewer
- User status: active, inactive
- Quote status: draft, sent, approved, rejected, invoiced
- Payment status: pending, partial, paid, overdue

**Relationships:**
- Users have many clients, quotes, templates, and activity logs
- Clients belong to users (creator) and have many quotes
- Quotes belong to clients and users, have many quote items, and may have one invoice
- Quote items belong to quotes
- Invoices belong to quotes

**Data Access Layer:** Storage interface (`server/storage.ts`) abstracts database operations with methods for CRUD operations on all entities

### External Dependencies

**UI Components:**
- Radix UI primitives (@radix-ui/*) - Accessible component primitives
- Lucide React - Icon library
- cmdk - Command palette component
- Recharts - Chart visualization library
- react-day-picker - Calendar/date picker

**Development Tools:**
- TypeScript - Type safety across frontend and backend
- ESBuild - Production build bundling for server code
- Drizzle Kit - Database migration tool
- Tailwind CSS with PostCSS and Autoprefixer

**Authentication & Security:**
- bcryptjs - Password hashing
- jsonwebtoken - JWT token generation and validation
- cookie-parser - Cookie parsing middleware

**Utilities:**
- nanoid - Unique ID generation for document numbers
- zod - Runtime type validation and schema definition
- class-variance-authority - Utility for managing CSS class variants
- clsx & tailwind-merge - CSS class name utilities

**Database Connectivity:**
- @neondatabase/serverless - Neon PostgreSQL client with WebSocket support
- drizzle-orm - Type-safe ORM
- ws - WebSocket library for Neon connection

**Future Integration Points:**
- PDF generation (noted in requirements but not yet implemented - React-PDF or Puppeteer)
- Email service for quote notifications (SMTP configuration in settings schema)
- Payment gateway integration (payment status tracking already in schema)