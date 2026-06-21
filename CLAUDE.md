# CLAUDE.md — AI Onboarding Guide

This file gives any AI assistant a complete picture of this project so it can contribute effectively without extensive exploration.

## What Is This Project?

A **multi-tenant beauty salon / service business management system** built with Next.js 16 (App Router). A single deployment serves multiple businesses (salons, nail studios, etc.) identified by `businessId`. The UI is a full admin dashboard covering appointments, sales, employees, payroll, coupons, promotions, and MercadoPago payment processing.

> See `docs/` for deep-dive documentation on each area.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16.1.6 (App Router, React 19) |
| Language | TypeScript 5.9.3 (+ some `.jsx` legacy files) |
| Styling | Tailwind CSS 4 |
| ORM | Prisma 5 + PostgreSQL (Neon) |
| Auth | Better Auth 1.5.4 (email/password, sessions) |
| Payments | MercadoPago SDK 2.12.0 |
| Calendar | FullCalendar 6 |
| Charts | ApexCharts |
| Icons | Lucide React |
| Toasts | react-toastify |
| Date picker | flatpickr |
| Printer | esc-pos-encoder (USB receipt printer) |

---

## Project Structure

```
src/
├── app/
│   ├── (admin)/                  # All protected admin routes
│   │   ├── page.tsx              # Main dashboard (daily summary)
│   │   └── (others-pages)/
│   │       ├── calendar/         # Appointments + payment
│   │       ├── sales/            # Sales history
│   │       ├── employees/        # Staff management
│   │       ├── payroll/          # Payroll calculations
│   │       ├── attendance/       # Check-in/check-out
│   │       ├── coupons/          # Discount management
│   │       ├── promotions/       # Auto-discount rules
│   │       ├── customers/        # Client records
│   │       ├── services/         # Service catalog
│   │       ├── cashClose/        # End-of-day reconciliation
│   │       ├── settings/         # Business config + MercadoPago
│   │       └── permissions/      # Role-based access
│   ├── (full-width-pages)/(auth)/
│   │   ├── signin/               # Login
│   │   └── signup/               # Register
│   └── api/
│       ├── auth/[...all]/        # Better Auth handler
│       └── mp/                   # MercadoPago API routes
├── components/
│   ├── calendar/                 # Calendar, BookingModal, PaymentModal, etc.
│   ├── auth/                     # SignInForm, SignUpForm
│   ├── sales/                    # Sales table components
│   ├── customers/                # Customer UI
│   ├── ui/                       # Generic: Modal, Button, Badge, Alert, Tabs
│   ├── form/                     # Input, DatePicker, Switch, Label
│   ├── charts/                   # Bar/line chart wrappers
│   └── ecommerce/                # Dashboard metric widgets
├── context/
│   ├── BusinessContext.tsx       # Current business object (useBusiness())
│   ├── ThemeContext.tsx          # Dark/light toggle (useTheme())
│   └── SidebarContext.tsx        # Sidebar state (useSidebar())
├── hooks/
│   ├── useModal.ts               # Modal open/close state
│   ├── useGoBack.ts              # Navigation with fallback
│   └── usePrinter.js             # USB receipt printer
├── layout/
│   ├── AppSidebar.tsx            # Sidebar navigation
│   ├── AppHeader.tsx             # Top header
│   ├── MainContentArea.tsx       # Content wrapper + pull-to-refresh
│   └── Backdrop.tsx              # Mobile overlay
├── lib/
│   ├── auth.ts                   # Better Auth config (server)
│   ├── auth-client.ts            # Better Auth client
│   ├── prisma.js                 # Prisma client + utility functions
│   └── applyPromotions.ts        # Promotion calculation logic
└── types/                        # TypeScript type definitions
prisma/
└── schema.prisma                 # Full database schema
```

---

## Key Conventions

- **Server Actions** live in `actions.ts` next to each page. Use them for all DB writes and reads from Server Components.
- **`businessId`** is required on virtually every Prisma query — always filter by it.
- **Role enum:** `ADMIN | RECEPTION | EMPLOYEE` — admin sees everything, reception manages appointments, employee sees their own data.
- **Path alias:** `@/*` maps to `src/*`.
- **No Redux** — state is managed via React Context + Server Actions + local `useState`.
- **`.jsx` files** are legacy — new code uses `.tsx`.

---

## Documentation Index

| File | Content |
|---|---|
| [docs/DATABASE.md](docs/DATABASE.md) | Full Prisma schema, model relationships, enum values |
| [docs/ROUTES.md](docs/ROUTES.md) | All pages, API routes, and what each one does |
| [docs/COMPONENTS.md](docs/COMPONENTS.md) | Every UI component, its props, and usage patterns |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Business logic, data flows, context providers |
| [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) | MercadoPago, Better Auth, printer, environment vars |
