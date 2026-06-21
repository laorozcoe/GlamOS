# Database Schema

**ORM:** Prisma 5  
**Database:** PostgreSQL (Neon, pooled connection)  
**Schema file:** `prisma/schema.prisma`

---

## Multi-Tenancy Pattern

Every business entity has a `businessId` foreign key pointing to `Business`. All Prisma queries **must** include `where: { businessId }` to maintain tenant isolation.

---

## Models

### Business
The root tenant anchor. One record per salon/business.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| name | String | Display name |
| slug | String | URL-safe identifier |
| phone | String? | Contact phone |
| email | String? | Contact email |
| address | String? | Physical address |
| countryCode | String? | Phone country code |
| active | Boolean | Soft disable |
| themeColors | Json? | CSS variable overrides for branding |
| openHour | String? | e.g. "09:00" |
| closeHour | String? | e.g. "20:00" |
| weekStartDay | Int? | 0=Sunday, 1=Monday |
| mpAccessToken | String? | MercadoPago access token |
| mpPublicKey | String? | MercadoPago public key |
| mpStoreId | String? | MercadoPago store ID |
| mpWebhookSecret | String? | Secreto para validar la firma de los webhooks de MP |
| createdAt | DateTime | Auto |

**Relations:** users, clients, employees, services, serviceCategories, appointments, sales, coupons, promotions, attendances, cashCloses, paymentTerminals

---

### User
Authentication identity. Each user belongs to one business.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| businessId | String | FK → Business |
| name | String | First name |
| lastName | String? | Last name |
| username | String? | Unique username |
| email | String | Unique, for login |
| emailVerified | Boolean | Better Auth field |
| password | String? | bcrypt hashed |
| image | String? | Avatar URL |
| role | Role | ADMIN \| RECEPTION \| EMPLOYEE |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

**Relations:** employee (one-to-one optional), business, sessions, accounts

---

### Employee
Staff profile linked one-to-one with User.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| userId | String | Unique FK → User |
| commission | Float? | Commission percentage |
| baseSalary | Float? | Fixed salary |
| rating | Float? | Performance rating |
| canCreateAppointments | Boolean | Permiso: puede agendar citas |
| canViewClientData | Boolean | Permiso: puede ver nombre/teléfono del cliente |
| workScheduleStartWeekday | String? | HH:MM |
| workScheduleEndWeekday | String? | HH:MM |
| workScheduleStartSaturday | String? | HH:MM |
| workScheduleEndSaturday | String? | HH:MM |

**Relations:** user, appointments, reviews, sales, clients, attendances

---

### Client
Customer record per business.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| businessId | String | FK → Business |
| name | String | Full name |
| phone | String? | Contact |
| email | String? | Contact |
| countryCode | String? | Phone prefix |
| notes | String? | Staff notes |
| employeeId | String? | Assigned agent FK → Employee |
| createdAt | DateTime | Auto |

**Relations:** appointments, reviews, loyaltyPoints, sales, employee

---

### Service
Items offered by the business.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| businessId | String | FK → Business |
| categoryId | String? | FK → ServiceCategory |
| name | String | Service name |
| description | String? | Full description |
| descriptionTicket | String? | Short text for receipt |
| duration | Int | Minutes |
| price | Float | Base price |
| active | Boolean | Soft disable |

**Relations:** category, variants (ServiceVariant), extras (ServiceExtra), appointments (via AppointmentService), promotions (via PromotionService)

---

### ServiceCategory
Groups services in the catalog.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| businessId | String | FK → Business |
| name | String | Category label |
| order | Int | Display order |
| active | Boolean | |

---

### ServiceVariant
Alternative pricing/duration for a service.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| serviceId | String | FK → Service |
| name | String | Variant label |
| price | Float | Override price |
| duration | Int | Override duration |

---

### ServiceExtra
Optional add-ons for a service.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| serviceId | String | FK → Service |
| name | String | e.g. "Diseño por uña" |
| minPrice | Float? | Min price |
| maxPrice | Float? | Max price |

---

### Appointment
A time slot booked on the calendar.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| businessId | String | FK → Business |
| clientId | String? | FK → Client (walk-in = null) |
| employeeId | String | FK → Employee |
| title | String | Display title |
| start | DateTime | Start datetime |
| end | DateTime | End datetime |
| status | AppointmentStatus | PENDING \| CONFIRMED \| CANCELLED \| COMPLETED |
| paymentStatus | PaymentStatus | UNPAID \| PARTIALLY_PAID \| PAID \| REFUNDED |
| totalAmount | Float? | Calculated cost |
| notes | String? | Internal notes |

**Relations:** employee, client, services (via AppointmentService), serviceRequests (via AppointmentServiceRequest), sale

---

### AppointmentService
Join table linking an appointment to specific services with locked prices.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| appointmentId | String | FK → Appointment |
| serviceId | String | FK → Service |
| price | Float | Price at time of booking |

---

### AppointmentServiceRequest
Change requests (add/remove service) within an appointment, requiring approval.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| appointmentId | String | FK → Appointment |
| serviceId | String | FK → Service |
| type | RequestType | ADD \| REMOVE |
| status | RequestStatus | PENDING \| APPROVED \| REJECTED |
| price | Float? | Proposed price |
| requestedBy | String | User ID |
| approvedBy | String? | User ID |
| createdAt | DateTime | Auto |

---

### Sale
A completed payment transaction. May or may not be linked to an appointment.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| businessId | String | FK → Business |
| folio | String | Human-readable ticket number |
| clientId | String? | FK → Client |
| employeeId | String? | FK → Employee |
| appointmentId | String? | FK → Appointment (optional) |
| subtotal | Float | Before discounts |
| discount | Float | Total discount applied |
| total | Float | Final amount charged |
| status | SaleStatus | COMPLETED \| CANCELLED \| REFUNDED |
| couponId | String? | FK → Coupon |
| promotionDiscount | Float? | Amount from automatic promotions |
| mpPaymentId | String? | MercadoPago payment ID |
| mpFee | Float? | MercadoPago processing fee (incl. IVA de la comisión) |
| mpNetReceived | Float? | Monto neto real recibido (tras comisión + IVA) |
| mpTaxes | Float? | Impuestos/retenciones sobre la transacción |
| mpReleaseDate | DateTime? | Fecha en que MP libera el dinero a la cuenta |
| createdAt | DateTime | Auto |

**Relations:** items (SaleItem), payments (Payment), client, employee, appointment, coupon, business

---

### SaleItem
Line items within a sale. Prices are snapshotted at sale time.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| saleId | String | FK → Sale |
| serviceId | String? | FK → Service |
| description | String | Snapshot of service name |
| price | Float | Historical price |
| quantity | Int | Quantity |
| couponCovered | Boolean | Covered by courtesy coupon |

---

### Payment
Individual payment transactions within a sale (a sale can have multiple payments).

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| saleId | String | FK → Sale |
| businessId | String | FK → Business |
| amount | Float | Amount for this payment |
| method | PaymentMethod | CASH \| CARD \| TRANSFER |
| status | PaymentStatus | PENDING \| COMPLETED \| FAILED \| REFUNDED |
| amountReceived | Float? | For cash: amount given by client |
| changeReturned | Float? | For cash: change given back |
| mpPaymentId | String? | For CARD: MercadoPago ID |
| createdAt | DateTime | Auto |

---

### Coupon
Discount codes that can be applied to sales.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| businessId | String | FK → Business |
| code | String | Unique redemption code |
| name | String | Display name |
| category | CouponCategory | DISCOUNT \| COURTESY |
| type | CouponType | PERCENTAGE \| FIXED |
| couponTokenType | String? | GENERIC \| FOLIADO |
| value | Float | Discount amount/percentage |
| limitType | LimitType | QUANTITY \| DATE \| BOTH |
| totalStock | Int? | Max uses (QUANTITY) |
| usedCount | Int? | Times used |
| startDate | DateTime? | Valid from |
| endDate | DateTime? | Valid until |
| active | Boolean | |

**Relations:** tokens (CouponToken), sales

---

### CouponToken
Individual trackable tokens for FOLIADO coupons.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| couponId | String | FK → Coupon |
| token | String | Unique token string |
| used | Boolean | Redeemed flag |
| usedAt | DateTime? | Redemption timestamp |
| usedBy | String? | User ID who redeemed |

---

### Promotion
Automatic discount rules applied at checkout without a code.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| businessId | String | FK → Business |
| name | String | Display name |
| type | PromotionType | SERVICE_DISCOUNT \| BUY_X_GET_Y \| COMBO |
| discountType | DiscountType | PERCENTAGE \| FIXED |
| discountValue | Float | Amount/percentage |
| buyQuantity | Int? | For BUY_X_GET_Y: buy N |
| getQuantity | Int? | For BUY_X_GET_Y: get M free |
| active | Boolean | |

**Relations:** services (PromotionService)

---

### PromotionService
Join table linking promotions to specific services with roles.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| promotionId | String | FK → Promotion |
| serviceId | String | FK → Service |
| role | PromotionServiceRole | PRIMARY \| SECONDARY |

---

### Attendance
Daily employee attendance record.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| businessId | String | FK → Business |
| employeeId | String | FK → Employee |
| date | String | YYYY-MM-DD |
| status | AttendanceStatus | PRESENT \| ABSENT \| LATE \| EXCUSED |
| checkInTime | String? | HH:MM |
| checkOutTime | String? | HH:MM |

**Unique:** `[employeeId, date]` — one record per employee per day.

---

### CashClose
End-of-day cash reconciliation record.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| businessId | String | FK → Business |
| userId | String | FK → User (who closed) |
| openingDate | DateTime | Start of period |
| closingDate | DateTime | End of period |
| cashExpected | Float | Calculated expected cash |
| cashActual | Float | Actually counted |
| difference | Float | `cashActual - cashExpected` |
| notes | String? | Discrepancy notes |

---

### PaymentTerminal
MercadoPago POS terminals registered to a business.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| businessId | String | FK → Business |
| name | String | Display label |
| posId | String | MercadoPago terminal ID |
| isDefault | Boolean | Auto-selected default |
| active | Boolean | |

---

### LoyaltyPoint
Points balance per client per business.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| businessId | String | FK → Business |
| clientId | String | FK → Client |
| points | Int | Current balance |

**Unique:** `[businessId, clientId]`

---

### Review
Service quality rating left by a client.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| businessId | String | FK → Business |
| clientId | String? | FK → Client |
| employeeId | String? | FK → Employee |
| rating | Int | 1–5 |
| comment | String? | Text review |
| createdAt | DateTime | Auto |

---

### Session / Account / Verification
Standard Better Auth tables — do not modify manually.

---

## Enum Reference

```prisma
enum Role              { ADMIN RECEPTION EMPLOYEE }
enum AppointmentStatus { PENDING CONFIRMED CANCELLED COMPLETED }
enum PaymentStatus     { UNPAID PARTIALLY_PAID PAID REFUNDED
                         PENDING COMPLETED FAILED }
enum SaleStatus        { COMPLETED CANCELLED REFUNDED }
enum PaymentMethod     { CASH CARD TRANSFER }
enum CouponCategory    { DISCOUNT COURTESY }
enum CouponType        { PERCENTAGE FIXED }
enum LimitType         { QUANTITY DATE BOTH }
enum PromotionType     { SERVICE_DISCOUNT BUY_X_GET_Y COMBO }
enum DiscountType      { PERCENTAGE FIXED }
enum PromotionServiceRole { PRIMARY SECONDARY }
enum AttendanceStatus  { PRESENT ABSENT LATE EXCUSED }
enum RequestType       { ADD REMOVE }
enum RequestStatus     { PENDING APPROVED REJECTED }
```

---

## Common Query Patterns

```ts
// Always scope to tenant
const sales = await prisma.sale.findMany({
  where: { businessId },
  include: { items: true, payments: true }
});

// Employee with user info
const employee = await prisma.employee.findUnique({
  where: { id: employeeId },
  include: { user: true }
});

// Appointments for a day
const appts = await prisma.appointment.findMany({
  where: {
    businessId,
    start: { gte: startOfDay, lt: endOfDay }
  },
  include: { client: true, employee: { include: { user: true } }, services: true }
});
```
