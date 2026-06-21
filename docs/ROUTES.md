# Routes & Pages

All admin routes live under `src/app/(admin)/` and require an authenticated session.  
Auth routes live under `src/app/(full-width-pages)/(auth)/`.

---

## Admin Pages

### `/` — Main Dashboard
**File:** `src/app/(admin)/page.tsx`  
**Role:** All  
**Description:** Daily operations summary.

- Date picker to select the day to review
- Total revenue with breakdown by payment method (cash / card / transfer)
- Per-employee sales table: services sold, amounts, commissions
- "Ver todas las ventas" modal — full sales list for the day
- "Ver detalles empleado" modal — per-employee detail view

**Data source:** `getDailySummary()` from `src/lib/prisma.js`

---

### `/calendar` — Appointment Calendar
**File:** `src/app/(admin)/(others-pages)/calendar/page.tsx`  
**Role:** All (employees see only their own)  
**Description:** FullCalendar time-grid view for managing appointments.

**Key interactions:**
1. Click a time slot → opens `BookingModal` to create appointment
2. Click existing appointment → opens `BookingModal` to edit / view
3. "Cobrar" (pay) button → opens `PaymentModal`
4. Pending service change requests → `ApprovalWidget`

**Sub-components (all in `src/components/calendar/`):**
- `Calendar.tsx` — main calendar shell, FullCalendar config
- `BookingModal.tsx` — create/edit appointment, select client, employee, services
- `PaymentModal.tsx` — full checkout: items, discounts, payment methods, MercadoPago terminal
- `ApprovalWidget.tsx` — approve/reject service add/remove requests
- `CouponSearchModal.tsx` — search and apply coupon codes
- `QRScannerModal.tsx` — scan QR for coupon token
- `SaleDetailsModal.tsx` — read-only completed sale view
- `MultiCheckoutModal.tsx` — checkout multiple items at once
- `useCalendar.ts` — business logic hook (state, actions, event handlers)

**Server actions:** `src/app/(admin)/(others-pages)/calendar/actions.ts`

---

### `/sales` — Sales History
**File:** `src/app/(admin)/(others-pages)/sales/page.jsx`  
**Role:** ADMIN  
**Description:** Historical sales list with search and date filtering.

- Desktop: `src/components/sales/Table.jsx`
- Mobile: `src/components/sales/TableMobile.jsx`

---

### `/employees` — Employee Management
**File:** `src/app/(admin)/(others-pages)/employees/page.tsx`  
**Role:** ADMIN  
**Description:** CRUD for staff members.

**Features:**
- List all employees with role, commission, salary
- Create: creates a `User` + `Employee` + Better Auth `Account` in one action
- Update: payroll fields, work schedule, commission rate
- Delete: soft delete (sets user inactive, does not remove from DB)

**Server actions:** `src/app/(admin)/(others-pages)/employees/actions.ts`
- `getEmployees()` — active employees list
- `createEmployee(data)` — creates user + employee atomically
- `updateEmployee(id, data)` — update fields
- `deleteEmployee(id)` — soft delete

---

### `/payroll` — Payroll
**File:** `src/app/(admin)/(others-pages)/payroll/page.tsx`  
**Role:** ADMIN  
**Description:** Salary and commission calculations per period.

Calculates: base salary + (commission rate × sales total) per employee for a date range.

**Server actions:** `src/app/(admin)/(others-pages)/payroll/actions.ts`

---

### `/attendance` — Attendance Tracking
**File:** `src/app/(admin)/(others-pages)/attendance/page.tsx`  
**Role:** ADMIN  
**Description:** Employee check-in / check-out records.

- Date picker to view a specific day
- Mark employees PRESENT / ABSENT / LATE / EXCUSED
- Record checkInTime and checkOutTime (HH:MM)
- Unique constraint enforces one record per employee per day

**Server actions:** `src/app/(admin)/(others-pages)/attendance/actions.ts`

---

### `/coupons` — Coupons
**File:** `src/app/(admin)/(others-pages)/coupons/page.tsx`  
**Role:** ADMIN  
**Description:** Manage discount codes and courtesy tokens.

**Coupon types:**
- `GENERIC` — single code used multiple times (up to stock limit)
- `FOLIADO` — unique tokens issued per coupon, each token tracks individual use

**Categories:**
- `DISCOUNT` — reduces sale total (percentage or fixed)
- `COURTESY` — covers specific service items at no charge

**Server actions:** `src/app/(admin)/(others-pages)/coupons/actions.ts`
- `getCoupons()` — all coupons with token counts
- `createCoupon(data)` — create coupon (+ generate tokens for FOLIADO)
- `applyCoupon(code, saleId)` — validate and apply
- `searchCouponByCode(code)` — lookup by code
- `searchCouponToken(token)` — lookup individual FOLIADO token

---

### `/promotions` — Promotions
**File:** `src/app/(admin)/(others-pages)/promotions/page.tsx`  
**Role:** ADMIN  
**Description:** Automatic discount rules applied at checkout without a code.

**Types:**
- `SERVICE_DISCOUNT` — percentage/fixed off a specific service
- `BUY_X_GET_Y` — buy N of a service, get M at no charge
- `COMBO` — discount when all specified services are purchased together

Applied by `src/lib/applyPromotions.ts` at checkout time.

**Server actions:** `src/app/(admin)/(others-pages)/promotions/actions.ts`

---

### `/customers` — Customers
**File:** `src/app/(admin)/(others-pages)/customers/page.jsx`  
**Role:** All  
**Description:** Client directory with contact info and history.

- Search/filter clients
- View appointment and purchase history per client
- Assign default employee

---

### `/services` — Services
**File:** `src/app/(admin)/(others-pages)/services/page.jsx`  
**Role:** ADMIN  
**Description:** Service catalog management.

- Category management (order, active/inactive)
- Service CRUD (name, price, duration, description)
- Service variants (different price/duration options)
- Service extras (add-ons)

---

### `/cashClose` — Cash Close
**File:** `src/app/(admin)/(others-pages)/cashClose/page.jsx`  
**Role:** ADMIN  
**Description:** End-of-day cash register reconciliation.

- Calculated expected cash from CASH payments in the period
- Operator inputs actual counted cash
- Records difference and notes

---

### `/settings` — Settings
**File:** `src/app/(admin)/(others-pages)/settings/page.tsx`  
**Client:** `src/app/(admin)/(others-pages)/settings/SettingsClient.tsx`  
**Role:** ADMIN  
**Description:** Business configuration.

**Sections:**
- Business info (name, phone, hours)
- MercadoPago credentials (access token, public key, store ID)
- Payment terminal management (add/remove POS devices)
- Theme colors (brand colors stored in DB as JSON)

**Server actions:** `src/app/(admin)/(others-pages)/settings/actions.ts`

---

### `/permissions` — Permissions
**File:** `src/app/(admin)/(others-pages)/permissions/page.tsx`  
**Role:** ADMIN  
**Description:** Permisos por empleado. Toggles: **Puede crear citas** (`canCreateAppointments`)
y **Ver datos del cliente** (`canViewClientData`). Al desactivar el segundo, el empleado no ve
nombre/teléfono del cliente en el calendario ni en los modales.

**Server actions:** `src/app/(admin)/(others-pages)/permissions/actions.ts`

---

### `/settlements` — Liquidaciones y Depósitos
**File:** `src/app/(admin)/(others-pages)/settlements/page.tsx`  
**Role:** ADMIN  
**Description:** Resumen del periodo (cobrado / comisión / **neto** desde la BD) y generación,
auto-refresco (cada 5 s) y descarga del **reporte oficial de liquidaciones** de MercadoPago.

**Server actions:** `getCardNetSummary`, `requestSettlementReport`, `listSettlementReports`,
`getSettlementCsv` en `settlements/actions.ts`.

---

### `/profile` — Profile
**File:** `src/app/(admin)/(others-pages)/profile/page.tsx`  
**Role:** All  
**Description:** Current user profile editing.

---

## Auth Pages

### `/signin`
**File:** `src/app/(full-width-pages)/(auth)/signin/page.tsx`  
**Component:** `src/components/auth/SignInForm.tsx`  
Email + password login via Better Auth.

### `/signup`
**File:** `src/app/(full-width-pages)/(auth)/signup/page.tsx`  
**Component:** `src/components/auth/SignUpForm.tsx`  
New account registration.

---

## API Routes

### `POST /api/mp/payment-intent`
**File:** `src/app/api/mp/payment-intent/route.ts`  
Creates a payment intent on a MercadoPago POS terminal.

**Body:**
```json
{ "amount": 150.00, "description": "Manicure", "posId": "PAX_123", "businessId": "cuid" }
```
**Response:** `{ "intentId": "mp-intent-id" }`

Uses business's `mpAccessToken` from DB. Calls MercadoPago Point API.

---

### `DELETE /api/mp/payment-intent`
**File:** `src/app/api/mp/payment-intent/route.ts`  
Cancels a pending payment intent.

**Body:** `{ "posId": "PAX_123", "businessId": "cuid" }`  
**Response:** `{ "cancelled": true }`

---

### `GET /api/mp/payment-intent/[intentId]`
**File:** `src/app/api/mp/payment-intent/[intentId]/route.ts`  
Polls payment status. Called repeatedly until state is `FINISHED` or `CANCELED`.

**Query:** `?businessId=cuid`  
**Response:** `{ "state": "FINISHED", "paymentId": "mp123", "mpFee": 4.50, "netReceived": 422.14, "taxes": 0, "releaseDate": "..." }`

Calcula `mpFee` y el **neto real** (`net_received_amount`) desde el objeto payment de MercadoPago.
Los intents con prefijo `SIM-` avanzan por estado según el tiempo (modo simulación).

---

### `GET /api/mp/devices` (server actions)
Listado y cambio de modo de terminales vía server actions (`listMpDevices`, `changeMpDeviceMode`)
en `settings/actions.ts` — NO es una API route; usa `GET/PATCH /point/integration-api/devices`.

---

### `POST /api/mp/webhook`
**File:** `src/app/api/mp/webhook/route.ts` · **Ruta pública** (sin sesión)  
Recibe avisos de pago de MercadoPago, valida la firma `x-signature` con `Business.mpWebhookSecret`,
consulta el pago y guarda el **neto real** en la venta (`mpPaymentId` → `Sale`).
URL a registrar: `https://DOMINIO/api/mp/webhook?businessId=<ID>`.

---

### `GET|POST /api/auth/[...all]`
**File:** `src/app/api/auth/[...all]/route.ts`  
Better Auth catch-all handler. Manages sessions, login, logout, signup.

---

## UI Element Demo Pages (Not production routes)

These exist as component documentation/examples:
`/alerts`, `/avatars`, `/badge`, `/buttons`, `/images`, `/modals`, `/videos`, `/bar-chart`, `/line-chart`, `/form-elements`, `/basic-tables`
