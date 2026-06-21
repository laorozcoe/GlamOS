# UI Components

All components live in `src/components/`. This file documents every major component, its purpose, props, and usage context.

---

## Calendar System (`src/components/calendar/`)

The most complex subsystem. Manages the full appointment lifecycle from booking to payment.

### `Calendar.tsx`
Main calendar shell using FullCalendar.
- **Renders:** TimegridWeek / TimegridDay / DayGrid views
- **Events:** Appointments fetched from DB, colored by employee
- **Click handlers:** Opens `BookingModal` on slot/event click
- **State:** Managed by `useCalendar.ts` hook
- **Business logic:** Delegates to hook — Calendar.tsx is mostly display

### `useCalendar.ts`
Business logic hook for the calendar page. Holds:
- `appointments` — list of current appointments
- `selectedAppointment` — appointment being viewed/edited
- `modal states` — which modal is open
- Action handlers: `handleCreateAppointment`, `handlePayment`, `handleApproval`, etc.

### `BookingModal.tsx`
Create or edit an appointment.

**Fields:**
- Client search (autocomplete by name/phone)
- Employee selector
- Date + time picker (flatpickr)
- Service multi-select with prices
- Notes field
- Status selector (PENDING / CONFIRMED / CANCELLED / COMPLETED)

**On save:** calls server action, refreshes calendar events.

### `PaymentModal.tsx`
Full checkout flow. The most complex component in the codebase.

**Sections:**
1. **Items list** — services from the appointment with prices
2. **Coupon application** — opens `CouponSearchModal`, applies discount
3. **Promotion display** — shows auto-applied discounts from `applyPromotions.ts`
4. **Payment methods** — Cash (with change calculator), CARD (launches terminal), TRANSFER
5. **MercadoPago terminal** — polls `/api/mp/payment-intent` until completed
6. **Summary** — subtotal, discounts, total, change due

**On confirm:** creates `Sale` + `SaleItem[]` + `Payment[]` records, marks appointment COMPLETED.

### `ApprovalWidget.tsx`
Floating widget shown when there are pending `AppointmentServiceRequest` records.
- Shows ADD/REMOVE requests awaiting approval
- ADMIN/RECEPTION can approve or reject
- On approve: modifies appointment services and recalculates total

### `CouponSearchModal.tsx`
Search coupon by code or name. Returns a selected coupon to `PaymentModal`.

### `QRScannerModal.tsx`
Uses device camera to scan QR codes containing coupon token strings.
Passes decoded token to `PaymentModal` for FOLIADO coupon redemption.

### `SaleDetailsModal.tsx`
Read-only view of a completed sale.
- Shows items, payment methods, discounts, employee, client
- Includes print button (triggers `usePrinter` for receipt)

### `MultiCheckoutModal.tsx`
Handles checkout for multiple appointments simultaneously.

---

## Authentication (`src/components/auth/`)

### `SignInForm.tsx`
Email + password form. Calls `signIn.email()` from `auth-client.ts`.
On success: redirects to `/`.

### `SignUpForm.tsx`
Registration form. Calls `signUp.email()` from `auth-client.ts`.
Captures: name, lastName, email, password, role.

### `SessionProviderWrapper.tsx`
Wraps app in Better Auth session context. Used in root layout.

---

## Sales (`src/components/sales/`)

### `Table.jsx`
Desktop sales history table. Columns: date, folio, client, employee, services, total, payment method, status. Includes search and date filter.

### `TableMobile.jsx`
Card-based mobile layout for the same data.

---

## Layout (`src/layout/` — not inside `components/`)

### `AppSidebar.tsx`
Main navigation sidebar.
- Collapsible on desktop (icon-only mode)
- Slide-in drawer on mobile
- Menu items defined as array with icon, label, path, submenu, requiredRole
- Active item highlighted, submenu accordion behavior
- Uses `useSidebar()` context

**Navigation structure:**
```
Dashboard (/)
Calendar (/calendar)
Sales (/sales)           [ADMIN]
Employees (/employees)   [ADMIN]
Payroll (/payroll)       [ADMIN]
Attendance (/attendance) [ADMIN]
Customers (/customers)
Services (/services)
Coupons (/coupons)       [ADMIN]
Promotions (/promotions) [ADMIN]
Cash Close (/cashClose)  [ADMIN]
Settings (/settings)     [ADMIN]
Permissions (/permissions) [ADMIN]
Profile (/profile)
```

### `AppHeader.tsx`
Top navigation bar.
- Hamburger menu (mobile sidebar toggle)
- Business name / logo
- Theme toggle (dark/light)
- User avatar + dropdown (profile, logout)

### `MainContentArea.tsx`
Page content wrapper. Adds `react-simple-pull-to-refresh` on mobile. Prevents pull-to-refresh when a modal is open.

### `Backdrop.tsx`
Semi-transparent overlay for mobile when sidebar is open.

---

## Generic UI (`src/components/ui/`)

### `Modal.tsx` / `Modal/index.tsx`
Wrapper for modal dialogs.

```tsx
<Modal isOpen={isOpen} onClose={onClose} title="Title">
  {/* content */}
</Modal>
```

Handles: backdrop click to close, ESC key, body scroll lock, animation.

### `Button.tsx`
Standard button with variants:
- `variant`: `primary | secondary | danger | ghost | outline`
- `size`: `sm | md | lg`
- `loading`: shows spinner, disables click
- `disabled`

### `Badge.tsx`
Status pill. Usage:
```tsx
<Badge color="success">Completado</Badge>
<Badge color="warning">Pendiente</Badge>
<Badge color="error">Cancelado</Badge>
```

### `Alert.tsx`
Notification banner with `type`: `success | error | warning | info`.

### `Avatar.tsx`
Circular user avatar. Accepts `src` (image URL) or initials fallback.

### `Dropdown.tsx`
Accessible dropdown menu. Used in header user menu.

### `Tabs.tsx`
Tab navigation component. Accepts `tabs: { label, content }[]`.

### `Table.tsx`
Generic table wrapper with consistent styling.

### `Video.tsx`
Video player component (for demo pages).

---

## Forms (`src/components/form/`)

### `Input.tsx`
Standard text input.
```tsx
<Input label="Nombre" value={name} onChange={setName} error="Required" />
```

### `DatePicker.tsx`
Wraps flatpickr. Accepts `mode`: `single | range | multiple`.

### `Switch.tsx`
Toggle switch for boolean settings.

### `Label.tsx`
Accessible label pairing with form controls.

### `FormGroup.tsx`
Wrapper that groups a label + input + error message.

---

## Charts (`src/components/charts/`)

### `BarChart.tsx`
ApexCharts bar chart. Used in sales analytics.

### `LineChart.tsx`
ApexCharts line chart. Used for revenue trends.

Both accept `series`, `categories`, `height` props.

---

## Dashboard Widgets (`src/components/ecommerce/`)

### `EcommerceMetrics.tsx`
Top-row KPI cards: today's revenue, appointments count, active clients.

### `MonthlySalesChart.tsx`
Monthly revenue bar chart.

### `SalesStatistics.tsx`
Breakdown stats table.

### `DemographicsChart.tsx`
Donut chart (service type breakdown or similar).

### `MonthlyTarget.tsx`
Progress ring showing current month vs. target.

---

## Common Patterns

### Modals with `useModal` hook
```tsx
const { isOpen, openModal, closeModal } = useModal();

<Button onClick={openModal}>Open</Button>
<Modal isOpen={isOpen} onClose={closeModal} title="Title">
  ...
</Modal>
```

### Server actions in client components
```tsx
'use client';
import { createEmployee } from './actions';

async function handleSubmit(data) {
  const result = await createEmployee(data);
  if (result.error) toast.error(result.error);
  else toast.success('Empleado creado');
}
```

### Business context
```tsx
import { useBusiness } from '@/context/BusinessContext';
const { business } = useBusiness();
// business.id, business.name, business.themeColors, etc.
```

### Role-based conditional rendering
```tsx
import { useSession } from '@/lib/auth-client';
const { data: session } = useSession();
const isAdmin = session?.user?.role === 'ADMIN';

{isAdmin && <AdminOnlyComponent />}
```
