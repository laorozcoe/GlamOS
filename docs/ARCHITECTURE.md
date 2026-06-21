# Architecture & Business Logic

---

## Application Architecture

```
Browser
  └─ Next.js App Router (SSR + Client Components)
       ├─ Server Components → fetch data via Prisma directly
       ├─ Client Components → useState, useContext, event handlers
       ├─ Server Actions → mutate DB (called from client via `use server`)
       └─ API Routes → external integrations (MercadoPago)

Database: PostgreSQL (Neon)
  └─ Prisma ORM
       └─ All access scoped by businessId (multi-tenant)
```

---

## Multi-Tenancy

- Single deployment, single database, multiple businesses
- Every model has `businessId` FK (except auth tables)
- `BusinessContext` provides current `businessId` throughout the React tree
- The context is initialized in the root layout from a DB lookup (by cookie/session)
- **Never omit `businessId` in queries** — it is the tenant boundary

---

## Authentication Flow

1. User hits `/signin` → `SignInForm` calls `signIn.email({ email, password })`
2. Better Auth verifies credentials, creates a session cookie (HTTP-only)
3. Protected layout reads session via `auth.api.getSession()` on server
4. If no session → redirect to `/signin`
5. Session includes: `user.id`, `user.role`, `user.businessId`
6. Client components use `useSession()` from `auth-client.ts`

**Better Auth config:** `src/lib/auth.ts`  
**Client helper:** `src/lib/auth-client.ts`

---

## Context Providers

Three providers wrap the entire app (`src/app/layout.tsx`):

### `BusinessProvider` (`src/context/BusinessProvider.tsx`)
- Fetches business from DB on server, passes as initial value
- `useBusiness()` → `{ business }` — use for `business.id`, `business.themeColors`, etc.

### `ThemeProvider` (`src/context/ThemeContext.tsx`)
- Reads from `localStorage`
- Toggles `dark` class on `<html>`
- `useTheme()` → `{ theme, toggleTheme }`

### `SidebarProvider` (`src/context/SidebarContext.tsx`)
- `isExpanded` — desktop collapsed/expanded
- `isMobileOpen` — mobile drawer open
- `activeItem` — current nav item
- `openSubmenu` — which submenu accordion is open
- `useSidebar()` → all of the above + handlers

---

## Data Fetching Pattern

**Server Components** (pages) fetch data directly:
```tsx
// src/app/(admin)/page.tsx
import { getDailySummary } from '@/lib/prisma';

export default async function DashboardPage() {
  const summary = await getDailySummary(businessId, date);
  return <DashboardClient initialData={summary} />;
}
```

**Client Components** use Server Actions for mutations:
```tsx
'use server'; // in actions.ts
export async function createSale(data) {
  return await prisma.sale.create({ data: { ...data, businessId } });
}

// In client component:
import { createSale } from './actions';
await createSale(formData);
```

---

## Appointment → Sale Flow

```
1. Staff creates Appointment (status: PENDING/CONFIRMED)
   └─ Selects: client, employee, services, time slot

2. Client arrives → appointment moved to in-progress

3. Staff opens PaymentModal
   ├─ Items loaded from AppointmentService records
   ├─ Promotions auto-applied (applyPromotions.ts)
   ├─ Coupon optionally applied
   └─ Payment method selected

4. Payment confirmed
   ├─ Sale record created with folio number
   ├─ SaleItem records created (price snapshot)
   ├─ Payment record(s) created
   ├─ Appointment.status → COMPLETED
   ├─ Appointment.paymentStatus → PAID
   └─ CouponToken marked used (if FOLIADO)

5. Receipt printed via usePrinter (ESC/POS USB)
```

---

## Promotion Engine (`src/lib/applyPromotions.ts`)

Called at checkout time with the list of services being purchased.

```ts
applyPromotions(services: ServiceItem[], promotions: Promotion[]): PromotionResult

type PromotionResult = {
  applied: AppliedPromotion[];
  totalDiscount: number;
  effectiveSubtotal: number;
}
```

**SERVICE_DISCOUNT:**
- If any service in the cart matches the promotion's services, apply percentage/fixed discount

**BUY_X_GET_Y:**
- Count how many qualifying items are in the cart
- For every `buyQuantity` items, give `getQuantity` items free
- Groups are applied per service (not mixing service types)
- Free items = lowest-priced items in the group

**COMBO:**
- Check if ALL services in the promotion's service list are present in cart
- If yes, apply the discount to the combo total
- Uses `role`: PRIMARY services are required, SECONDARY are optional extras

---

## Coupon System

### GENERIC Coupons
- Single `code`, applied by typing it at checkout
- `limitType: QUANTITY` → `usedCount < totalStock`
- `limitType: DATE` → `startDate ≤ today ≤ endDate`
- `limitType: BOTH` → both conditions must be true
- On apply: increment `usedCount`

### FOLIADO Coupons
- Multiple `CouponToken` records, each with unique `token` string
- Applied by typing token code OR scanning QR code
- On apply: mark specific `CouponToken.used = true`, set `usedAt`, `usedBy`
- Raw SQL used for token count queries (see `coupons/actions.ts`)

### COURTESY Coupons
- `category: COURTESY`
- Marks specific `SaleItem.couponCovered = true`
- Those items are not included in the total

### DISCOUNT Coupons
- `category: DISCOUNT`
- Applied as `sale.discount` based on type:
  - `PERCENTAGE`: `total * (value / 100)`
  - `FIXED`: `min(value, total)`

---

## MercadoPago Terminal Flow

```
1. Staff selects CARD payment in PaymentModal
2. Staff selects a PaymentTerminal (posId)
3. Client: POST /api/mp/payment-intent { amount, posId, businessId }
   └─ Server calls MP Point API with business mpAccessToken
   └─ Returns intentId
4. Terminal lights up, client taps/inserts card
5. Client polls: GET /api/mp/payment-intent/[intentId]?businessId=...
   └─ Every 2 seconds until state is FINISHED or CANCELED
6. On FINISHED:
   └─ paymentId and mpFee returned
   └─ Payment record created with mpPaymentId and mpFee
7. On CANCELED: show error, allow retry or switch method
```

---

## Employee Management Flow

Creating an employee requires three synchronized records:

```ts
// In employees/actions.ts createEmployee()
await prisma.$transaction([
  prisma.user.create({ data: { ...userData, businessId, role: 'EMPLOYEE' } }),
  prisma.employee.create({ data: { userId, commission, baseSalary, ... } }),
  prisma.account.create({ data: { userId, ...betterAuthAccount } }),
]);
```

Deleting is a soft delete:
```ts
await prisma.user.update({ where: { id }, data: { active: false } });
```

---

## Payroll Calculation

```
For each employee in the period:
  salary = baseSalary (prorated if partial period)
  commission = SUM(sale.total WHERE employeeId AND date IN range) * (commission / 100)
  totalPay = salary + commission
  deductions = absences * dailyRate (from attendance records)
  netPay = totalPay - deductions
```

---

## Cash Close Flow

```
1. Admin opens /cashClose page
2. System calculates: expected = SUM(payment.amount WHERE method=CASH AND date=today)
3. Admin counts physical cash and enters actual amount
4. difference = actual - expected
5. CashClose record saved with notes if difference ≠ 0
```

---

## Printer Integration (`src/hooks/usePrinter.js`)

- Connects to USB thermal printer via WebUSB API
- Uses `esc-pos-encoder` to format receipt
- Receipt content: business name, folio, date, items, totals, payment method
- Only available in Chrome/Edge (WebUSB not supported in Firefox/Safari)
- Gracefully degrades — show error if no printer found

---

## Role-Based Access

| Route | ADMIN | RECEPTION | EMPLOYEE |
|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ (own data) |
| Calendar | ✓ | ✓ | ✓ (own only) |
| Sales | ✓ | — | — |
| Employees | ✓ | — | — |
| Payroll | ✓ | — | — |
| Attendance | ✓ | — | — |
| Customers | ✓ | ✓ | — |
| Services | ✓ | — | — |
| Coupons | ✓ | ✓ (apply only) | — |
| Promotions | ✓ | — | — |
| Cash Close | ✓ | — | — |
| Settings | ✓ | — | — |
| Permissions | ✓ | — | — |
| Profile | ✓ | ✓ | ✓ |

Enforcement: both layout-level redirect checks (server) and conditional rendering in sidebar (client).

---

## Dynamic Theming

Each business can store custom brand colors in `Business.themeColors` (JSON):

```json
{
  "--color-brand-primary": "#E91E8C",
  "--color-brand-secondary": "#FF6B9D"
}
```

At page load, these are injected as CSS custom properties on `<html>`. Tailwind classes reference these variables for consistent branded UI across all components.

See `src/context/BusinessProvider.tsx` for injection logic.

---

## Key Utility Functions (`src/lib/prisma.js`)

| Function | Purpose |
|---|---|
| `getDailySummary(businessId, date)` | Revenue, payment breakdown, per-employee stats for a day |
| `getAppointments(businessId, start, end)` | Calendar events in a date range |
| `getSalesHistory(businessId, filters)` | Paginated/filtered sales list |
| `getEmployeePerformance(businessId, period)` | Sales totals per employee |
| `createAppointmentWithServices(data)` | Atomic appointment + services create |

These are **Prisma utility functions**, not Server Actions — they are imported by both Server Components and Server Actions.
