# Plan de Implementación — Sprint 1: Base del Sistema

**Proyecto:** QueGrasa (inventario + catálogo público) · **Spec:** `docs/superpowers/specs/2026-09-28-quegrasa-inventario-catalogo-design.md`
**Duración:** ~1 día · **Modalidad:** la IA escribe el código, el humano prueba y aprueba cada tarea.

**Objetivo verificable al cerrar el sprint:** app desplegada en internet con URL de Vercel; esquema de las 11 tablas aplicado en PostgreSQL (Neon) sin errores; seed con tienda QueGrasa, categorías, tallas y usuarios; tasa BCV del día guardada.

---

## Prerrequisitos (los crea el humano, ~30 min, todos gratuitos)

- [ ] Cuenta GitHub (repo del proyecto)
- [ ] Cuenta Vercel (deploy) — se puede registrar con GitHub
- [ ] Cuenta Neon (PostgreSQL) — crear proyecto `quegrasa`, región más cercana (us-east-1)
- [ ] Cuenta Cloudinary (imágenes) — anotar: `cloud name`, `api key`, `api secret`
- [ ] Node.js LTS instalado (≥ 20)

---

## Tarea 1 — Inicializar el proyecto

**Pasos:**
1. `npx create-next-app@latest quegrasa` con TypeScript, App Router, Tailwind, ESLint, src dir NO, import alias `@/*`.
2. Git init + push a GitHub (repo privado).
3. `npm i prisma @prisma/client argon2 jose zod` y `npm i -D prisma @types/...` según necesite.
4. Crear `.gitignore` (verificar `.env` ignorado) y `.env.example` con todas las variables: `DATABASE_URL`, `AUTH_SECRET`, `CLOUDINARY_*`, `NEXT_PUBLIC_WHATSAPP_*`, `BCV_API_URL`, `CRON_SECRET`.
5. Estructura de carpetas base: `lib/` (db, auth, money, whatsapp), `app/(public)`, `app/(admin)`, `app/(platform)`, `components/`.

**Verificación:** `npm run dev` levanta en `localhost:3000` sin errores. Commit: `chore: proyecto inicial`.

## Tarea 2 — Prisma + PostgreSQL conectados

**Pasos:**
1. `npx prisma init` → `prisma/schema.prisma` con `provider = "postgresql"`.
2. Usar el `DATABASE_URL` de Neon (connection string con pooling).
3. `lib/db.ts` — cliente Prisma singleton (evita agotar conexiones en dev/hot reload).
4. Aplicar primera migración vacía para validar conexión: `npx prisma migrate dev`.

**Verificación:** `npx prisma db pull` o `migrate dev` conecta a Neon sin error; tabla `_prisma_migrations` visible en Neon Console. Commit: `feat: prisma + neon conectados`.

## Tarea 3 — Esquema completo (11 tablas)

**Pasos:** traducir el spec (sección 4) a `prisma/schema.prisma`:
- Modelos: `Store`, `Category`, `Size`, `Product`, `ProductImage`, `ProductVariant`, `User`, `StockMovement`, `Subscription`, `SubscriptionPayment`, `ExchangeRate`.
- Enums: `Role` (WORKER, PLATFORM_ADMIN), `MovementType` (SALE, RESTOCK, ADJUST, NEW), `SubscriptionStatus` (ACTIVE, PAST_DUE, SUSPENDED), `ExchangeSource` (BCV, MANUAL).
- Relaciones y restricciones del spec: `@@unique([storeId, name])` en Size, `@@unique([productId, sizeId])` en ProductVariant, `price Decimal @db.Decimal(10,2)` y `salePrice Decimal?` en Product, `ExchangeRate.date @unique`.
- `npx prisma migrate dev --name esquema-inicial`.

**Verificación:** migración aplicada; las 11 tablas visibles en `npx prisma studio`. Commit: `feat: esquema de bd completo`.

## Tarea 4 — Seed inicial

**Pasos:** `prisma/seed.ts`:
- `Store`: QueGrasa, slug `quegrasa`, `whatsappNumber` (el real, pedirlo al humano).
- Categorías base: Parte de arriba, Parte de abajo, Jeans, Chaquetas, Vestidos/Accesorios (editable después).
- Tallas diccionario: S, M, G, XL, XXL, 28, 30, 32, 34, 36, 38, Unitalla.
- Usuario `PLATFORM_ADMIN` (el del humano, email/contraseña por variables) + un `WORKER` de prueba.
- `Subscription` ACTIVE con `paidUntil` +30 días (para no bloquearse durante el desarrollo).
- 3-5 prendas de prueba con variantes y stock (para ver datos en pantalla desde el día 1).
- Configurar `prisma.seed` en `package.json`.

**Verificación:** `npx prisma db seed` carga todo; en Prisma Studio se ven las prendas con variantes. Commit: `feat: seed inicial`.

## Tarea 5 — Tasa BCV (tabla + fetch + cron)

**Pasos:**
1. `lib/exchange.ts`: `getBcvRate()` → consulta `ve.dolarapi.com/v1/dolares/oficial` (fallback: última `ExchangeRate` guardada).
2. Server Action / endpoint `/api/cron/rate` protegido por `CRON_SECRET`: guarda la tasa del día (`source=BCV`); idempotente por fecha.
3. `vercel.json` con cron diario (07:00 UTC ≈ 03:00 Venezuela, tras la publicación BCV).
4. `lib/money.ts`: `usdToBs(usd, rate)` + formatos `$15.00` / `Bs 1.234,56` (es-Ve).
5. Ejecutar el endpoint una vez manualmente para dejar la primera tasa.

**Verificación:** la tasa del día aparece en BD con fecha correcta; si se desactiva la conexión a internet, el sistema sigue sirviendo la última tasa. Commit: `feat: tasa bcv diaria con respaldo`.

## Tarea 6 — Deploy a Vercel

**Pasos:**
1. Importar el repo en Vercel; variables de entorno de producción (Neon, auth, Cloudinary, cron).
2. Build exitoso; primer deploy a la URL de Vercel.
3. `npx prisma migrate deploy` contra Neon (las migraciones ya aplicadas en T3 no se duplican).
4. Ejecutar seed contra producción si la BD de dev y prod son distintas (recomendado: una sola BD en el MVP).
5. Verificar la URL pública desde el celular.

**Verificación:** el sitio carga en producción desde el celular; Prisma Studio local muestra datos de la BD de producción. Commit: `chore: deploy inicial`.

---

## Definición de "Terminado" (Sprint 1)

- [ ] URL pública de Vercel funciona
- [ ] 11 tablas en Neon, migraciones aplicadas
- [ ] Seed: tienda, categorías, tallas, admin + worker, prendas de prueba
- [ ] Tasa BCV guardada del día con su fecha
- [ ] `.env.example` completo; ningún secreto en git
- [ ] Repo en GitHub privado con historial limpio

## Próximos sprints (se planifican igual al cerrar este)

- **S2:** CRUD prendas + fotos Cloudinary + inventario + categorías
- **S3:** Login JWT + pantalla "Vendí" + movimientos
- **S4:** Catálogo público + filtros + bolsa WhatsApp + precio dual visible
- **S5:** Suscripción + `/platform` + bloqueo + dominio + QR
