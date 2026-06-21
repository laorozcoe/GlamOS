# Integrations & Configuration

---

## Environment Variables

```bash
# === Authentication ===
BETTER_AUTH_SECRET=<random-32-char-string>    # Session signing key
BETTER_AUTH_URL=http://localhost:3000          # Base URL for auth callbacks

# === Database ===
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require         # Pooled (for app)
DATABASE_URL_UNPOOLED=postgresql://user:pass@host-direct/db?sslmode=require  # Direct (for Prisma migrate)

# === Optional ===
BUSINESS_ID=<cuid>   # Can be set to bypass slug lookup during development
```

MercadoPago credentials are **NOT** in `.env` — they are stored per-business in the database (`Business.mpAccessToken`, `Business.mpPublicKey`, `Business.mpStoreId`) and configured via the Settings page.

---

## Better Auth

**Version:** 1.5.4  
**Docs:** https://better-auth.com  
**Config:** `src/lib/auth.ts`

### Server Setup
```ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  user: {
    additionalFields: {
      lastName: { type: 'string', required: false },
      phone: { type: 'string', required: false },
      role: { type: 'string', defaultValue: 'EMPLOYEE' },
      businessId: { type: 'string', required: false },
    }
  }
});
```

### Client Setup (`src/lib/auth-client.ts`)
```ts
import { createAuthClient } from 'better-auth/react';

export const { signIn, signOut, signUp, useSession } = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL
});
```

### Usage in Components
```tsx
// Check current user
const { data: session } = useSession();
const user = session?.user; // { id, name, email, role, businessId }

// Login
await signIn.email({ email, password });

// Logout
await signOut();
```

### API Handler
```ts
// src/app/api/auth/[...all]/route.ts
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
export const { GET, POST } = toNextJsHandler(auth);
```

### Session in Server Components
```ts
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const session = await auth.api.getSession({ headers: await headers() });
if (!session) redirect('/signin');
const { user } = session;
```

---

## MercadoPago

**Version:** SDK 2.12.0  
**Use case:** In-person card payments via POS terminals  
**Docs:** https://www.mercadopago.com.mx/developers

### Credentials Storage
Credentials are stored per-business in the DB and configured via `/settings`:
- `Business.mpAccessToken` — secret token for API calls
- `Business.mpPublicKey` — for client-side (not currently used)
- `Business.mpStoreId` — store identifier for terminal assignment

### Terminal (POS) Registration
- POS devices are registered in `PaymentTerminal` table with `posId` (device ID)
- Businesses can have multiple terminals; one is marked `isDefault`
- Managed via Settings page

### Payment Intent Lifecycle

**Create intent** → `POST /api/mp/payment-intent`
```ts
const mp = new MercadoPago(mpAccessToken);
const intent = await mp.point.createPaymentIntent({
  amount: 150.00,
  description: 'Manicure',
  payment_mode: 'point_of_sale',
  device_id: posId,
});
// Returns: { id: intentId, ... }
```

**Poll status** → `GET /api/mp/payment-intent/[intentId]`
```ts
const status = await mp.point.getPaymentIntent(intentId);
// state: OPEN | FINISHED | CANCELED | ERROR
// When FINISHED: fetch payment details for mpFee calculation
```

**Cancel** → `DELETE /api/mp/payment-intent`
```ts
await mp.point.cancelPaymentIntent(posId);
```

**Fee Calculation:**
```ts
const payment = await mp.payment.get(paymentId);
const mpFee = payment.fee_details
  .filter(f => f.type === 'mercadopago_fee')
  .reduce((sum, f) => sum + f.amount, 0);
```

---

### Monto NETO real (comisión + IVA)

El número que de verdad entra a la cuenta vive en el objeto `payment`:

| Campo MP | Significado | Se guarda en `Sale` |
|---|---|---|
| `transaction_details.net_received_amount` | Neto tras comisión + IVA + retenciones | `mpNetReceived` |
| `transaction_amount − net_received_amount` | Comisión total (incluye IVA) | `mpFee` |
| `taxes_amount` | Impuestos sobre la transacción | `mpTaxes` |
| `money_release_date` | Fecha en que MP libera el dinero | `mpReleaseDate` |

**Captura inmediata:** al aprobarse el cobro, `GET /api/mp/payment-intent/[intentId]` consulta el pago y devuelve `netReceived`, `taxes`, `releaseDate`. `PaymentModal` los adjunta al pago CARD y `createSalePrisma` los persiste (vía SQL raw). Se muestran en `SaleDetailsModal` ("Liquidación MercadoPago").

> ⚠️ Importante: el `amount` del payment-intent va en **CENTAVOS** (entero) y el mínimo es **$5** (500 centavos).

### Webhook de pagos — `/api/mp/webhook`

Capa de conciliación: MercadoPago avisa cuando un pago se confirma/liquida y se actualiza el neto en la venta.

- **URL a registrar** (panel MP → Webhooks → evento *Pagos*):
  `https://TU-DOMINIO/api/mp/webhook?businessId=<ID_DEL_NEGOCIO>`
  (el `businessId` identifica al tenant; la URL se muestra ya armada en *Configuración*).
- **Secreto por negocio:** se guarda en `Business.mpWebhookSecret` (campo en *Configuración*). Valida la firma `x-signature` con HMAC-SHA256 del manifiesto `id:<dataId>;request-id:<reqId>;ts:<ts>;`.
- La ruta está en `publicRoutes` del proxy (MP no envía sesión).
- Al recibir `type=payment`, consulta `GET /v1/payments/{id}`, extrae el neto y hace `UPDATE Sale ... WHERE mpPaymentId = ...`.
- Responde `200` siempre (ante `5xx` MercadoPago reintenta).

**No es testeable en `localhost`** — MercadoPago necesita una URL pública HTTPS. En desarrollo, la captura inmediata ya guarda el neto sin webhook.

### Modo de operación de la terminal

- `GET /point/integration-api/devices` — lista terminales (server action `listMpDevices`).
- `PATCH /point/integration-api/devices/{id}` con `{ operating_mode: 'PDV' }` — pone la terminal en modo integrado (server action `changeMpDeviceMode`). **Requiere reiniciar la terminal.**
- Estados del intent en el cobro: `OPEN` (aún no llega al equipo) → `ON_TERMINAL` (esperando tarjeta) → `PROCESSING` → `FINISHED` / `CANCELED`. Cancelar por API solo funciona en `OPEN`; en `ON_TERMINAL` se cancela en el dispositivo.

### Finalización automática (tarjeta)

En `PaymentModal`, cuando el cobro con terminal llega a `FINISHED` (estado `approved`), la venta se
**finaliza automáticamente** una sola vez (guard `autoFinalizedRef`): tras ~1.2 s mostrando "aprobado"
se llama a `onFinalize` → `handleFinalizePayment` (crea venta + pagos, imprime ticket, refresca y
cierra los modales). Durante ese lapso el footer muestra "Guardando venta..." y se ocultan los botones
Cancelar/Confirmar para no cancelar un cobro ya realizado. Los pagos en **efectivo/transferencia** se
siguen confirmando manualmente con "Confirmar Pago".

---

## Prisma & PostgreSQL

**Version:** Prisma 5.22.0  
**Provider:** Neon (serverless PostgreSQL)

### Client Singleton (`src/lib/prisma.js`)
```js
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### Common Commands
```bash
# Apply migrations
npx prisma migrate dev --name <migration-name>

# Push schema changes without migration (dev only)
npx prisma db push

# Open Prisma Studio (visual DB editor)
npx prisma studio

# Regenerate client after schema change
npx prisma generate
```

### Neon Connection
- `DATABASE_URL` — pooled endpoint (use for application queries)
- `DATABASE_URL_UNPOOLED` — direct endpoint (use for `prisma migrate`)
- Configure in `prisma/schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_UNPOOLED")
}
```

---

## FullCalendar

**Version:** 6.1.19  
**Plugins used:** `daygrid`, `timegrid`, `list`, `interaction`

### Configuration (in `Calendar.tsx`)
```tsx
<FullCalendar
  plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
  initialView="timeGridWeek"
  selectable={true}
  select={handleSelectSlot}        // Click empty slot
  eventClick={handleEventClick}    // Click existing appointment
  events={appointments}            // Array of { id, title, start, end, color }
  slotMinTime={business.openHour}
  slotMaxTime={business.closeHour}
  firstDay={business.weekStartDay}
/>
```

### Event Shape
```ts
{
  id: appointment.id,
  title: appointment.title,
  start: appointment.start,
  end: appointment.end,
  backgroundColor: employee.color,  // Per-employee color coding
  extendedProps: { appointment }     // Full appointment data
}
```

---

## ESC/POS Printer (`usePrinter.js`)

**Library:** `esc-pos-encoder 3.0.0`  
**Access:** WebUSB API (Chrome/Edge only)

### Hook API
```js
const { connectPrinter, printReceipt, isConnected, error } = usePrinter();

// Connect to USB printer
await connectPrinter();

// Print a sale receipt
await printReceipt({
  businessName: 'Salon Example',
  folio: 'F-001',
  date: '2024-01-15 10:30',
  items: [{ description: 'Manicure', price: 150, quantity: 1 }],
  subtotal: 150,
  discount: 0,
  total: 150,
  paymentMethod: 'CASH',
  cashReceived: 200,
  change: 50,
});
```

**Browser support:** Chrome 89+, Edge 89+ (not Firefox, not Safari)  
**Fallback:** If `connectPrinter()` fails, show error toast; sale still completes.

---

## ApexCharts

**Version:** 4.7.0  
**Wrapper:** react-apexcharts 1.8.0

Used for: revenue trends, sales by employee, monthly comparisons.

### Basic Usage
```tsx
import ReactApexChart from 'react-apexcharts';

<ReactApexChart
  type="bar"
  series={[{ name: 'Revenue', data: [1200, 900, 1500] }]}
  options={{
    xaxis: { categories: ['Jan', 'Feb', 'Mar'] },
    chart: { toolbar: { show: false } }
  }}
  height={300}
/>
```

---

## flatpickr (Date Picker)

**Version:** 4.6.13 (direct, not react-flatpickr — incompatible with React 19)

Used directly via `useRef` on an `<input>`:
```tsx
const inputRef = useRef(null);
useEffect(() => {
  const fp = flatpickr(inputRef.current, {
    enableTime: true,
    dateFormat: 'Y-m-d H:i',
    onChange: ([date]) => setSelectedDate(date),
  });
  return () => fp.destroy();
}, []);

<input ref={inputRef} />
```

---

## react-toastify

**Version:** 11.0.5  
**Setup:** `<ToastContainer />` in root layout

```tsx
import { toast } from 'react-toastify';

toast.success('Empleado creado');
toast.error('Error al guardar');
toast.warning('Cuidado: cambios no guardados');
```

---

## Tailwind CSS 4

**Version:** 4.1.17  
**PostCSS plugin:** `@tailwindcss/postcss`

Dynamic brand colors via CSS custom properties:
```css
/* Injected at runtime from Business.themeColors */
:root {
  --color-brand-primary: #E91E8C;
}
```

```tsx
{/* Used in Tailwind class with arbitrary value */}
<button className="bg-[var(--color-brand-primary)]">...</button>
```

---

## Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Fill in DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL

# 3. Push database schema
npx prisma db push

# 4. (Optional) Seed initial data
npx prisma db seed

# 5. Run dev server
npm run dev
# App at http://localhost:3000
```

### Useful Scripts
```bash
npm run dev        # Start dev server (Turbopack)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint check
npx prisma studio  # Visual database editor
```
