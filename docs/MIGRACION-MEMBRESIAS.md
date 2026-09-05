# Migración: identidad global + `Employee` como membresía

## Qué cambia

Antes, `User` cargaba `businessId` y `role`. Eso obligaba a duplicar la
identidad de una persona para que entrara a dos salones, y el login quedaba
ambiguo: Better Auth resuelve por correo con un `findFirst` y no sabe nada de
negocios.

Ahora:

| | Antes | Después |
|---|---|---|
| `User` | identidad + salón + rol | **solo identidad**, correo único global |
| `Employee` | ficha de nómina | **la membresía**: salón, rol, sueldo, comisión, horario |
| `Session` | — | queda atada al salón donde se inició (`businessId`, `role`) |

`Employee.userId` dejó de ser único global y pasó a `@@unique([businessId, userId])`.
Esa era la restricción que impedía que una persona trabajara en dos salones.

**Nada de dinero cambia de sitio.** `Sale`, `Appointment`, `Attendance`,
`Client` y `Review` ya apuntaban a `employeeId`, no a `userId`. Si alguien
renuncia en un salón y entra en otro, su historial se queda con la membresía
vieja y no se reescribe cuando cambie de sueldo.

Campos nuevos en `Employee`:

- `role` — el rol **dentro de ese salón**. Puedes ser ADMIN aquí y EMPLOYEE allá.
- `bookable` — si aparece en la agenda y en los selectores de personal.
  Corresponde al `hasPayroll` de la pantalla de empleados. Las membresías
  puramente administrativas van en `false`.

## Orden de ejecución

El script usa SQL directo, así que da igual en qué estado esté el cliente de
Prisma. Todo corre en **una sola transacción**: si algo falla, no se aplica nada.

### 1. Respaldo

Haz un branch o snapshot en Neon antes de empezar. El script deja
`_bak_user` y `_bak_employee`, pero un respaldo del lado del proveedor cuesta
un minuto y cubre más.

### 2. Simulación

```bash
node scripts/migrar-membresias.cjs
```

No escribe nada. Lee con calma la salida, sobre todo:

- cuántas membresías se van a **crear** para usuarios que no tenían fila en
  `Employee` (los dados de alta sin nómina);
- qué correos se van a **fusionar** y qué usuario sobrevive de cada uno;
- cuántas **contraseñas se descartan**. Al fusionar dos usuarios queda la
  contraseña del más antiguo. A los demás hay que avisarles y resetearles la
  contraseña desde la pantalla de empleados.

### 3. Aplicar

```bash
node scripts/migrar-membresias.cjs --apply
npx prisma generate
npm run build
```

**Verifica que la primera línea diga `=== APLICANDO DE VERDAD ===`.** Si dice
`SIMULACIÓN`, la bandera no llegó y no se escribió nada — y correr
`prisma generate` después deja el cliente nuevo contra la base vieja, con lo
que la app falla con `column session.businessId does not exist`.

No hace falta `prisma db push`: el script ya aplica el DDL.

Si `db push` propone cambios, **no los aceptes a ciegas**: significa que el
esquema y la base divergieron en algo. Lee el plan antes.

### 4. Comprobar

- Entra a cada salón por su subdominio. En local, `DEV_BUSINESS_SLUG` en `.env`
  decide el salón; hay que **cerrar sesión y volver a entrar** (el script borra
  todas las sesiones a propósito: ahora la sesión lleva el salón).
- Pantalla de empleados: alta, edición, cambio de rol y baja.
- Agenda: que aparezca el mismo personal que antes. Si falta alguien, revisa su
  `bookable`.
- Nómina y permisos: que el rol se vea correcto.
- Un usuario EMPLOYEE: que siga viendo solo la agenda.

### 5. Dar de alta a alguien en un segundo salón

Desde la pantalla de empleados del segundo salón, con **el mismo correo**. Si
la persona ya existe, se reutiliza su identidad y solo se le agrega la
membresía; su contraseña no se toca.

## Revertir

```sql
BEGIN;
DROP TABLE "Employee";
DROP TABLE "User";
ALTER TABLE _bak_employee RENAME TO "Employee";
ALTER TABLE _bak_user     RENAME TO "User";
COMMIT;
```

Los respaldos son copias planas: no traen índices ni claves foráneas, así que
después hay que `npx prisma db push` con el `schema.prisma` anterior
(`git checkout <commit-anterior> -- prisma/schema.prisma`). Por eso conviene el
snapshot de Neon: revertir con él es más limpio.

## Qué NO está verificado

- `src/lib/prisma2.js` es JavaScript, así que el cliente de Prisma llega como
  `any` a todo el código. **El typecheck no cubre ninguna consulta**: pasa
  limpio pero no demuestra que las consultas sean correctas. De ahí que el
  paso 4 sea manual.
- La migración no se pudo ejecutar contra la base desde el entorno donde se
  escribió. La simulación del paso 2 es la primera prueba real.
