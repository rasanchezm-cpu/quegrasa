# QueGrasa — Sistema de Inventario + Catálogo Público

**Especificación de diseño** · 28 de septiembre de 2026 · v1.0 (aprobada en conversación)

---

## 1. Visión y contexto

**QueGrasa** es una tienda de ropa mediana-pequeña que operaba únicamente en línea y ahora también tiene tienda física. Su problema: el catálogo que ven los clientes en internet muestra prendas que ya se agotaron en la tienda, así que la gente pide por WhatsApp cosas que ya no existen.

La solución es un sistema de dos caras, siempre sincronizados por una sola base de datos:

1. **App de trabajadores** (web móvil con login): descuentan stock al vender, suben prendas nuevas con fotos, editan precios y ofertas.
2. **Catálogo público** (vitrina web sin login): los clientes filtran por categoría y talla, arman su pedido y lo envían por WhatsApp con un mensaje pre-armado que solo contiene prendas disponibles.

El software se comercializa como **SaaS con suscripción mensual**: el desarrollador registra los pagos y, si una tienda deja de pagar, el panel de trabajadores se bloquea.

### Perfil del desarrollador

Estudiante de ingeniería con bases de programación, BD y frontend/backend. El stack elegido prioriza un solo lenguaje, abundancia de tutoriales y transferencia al mercado laboral. Ritmo estimado: 10-15 h/semana.

---

## 2. Objetivos y no objetivos

### Objetivos (MVP)

- Controlar stock **por talla** (letras, números o mezclas, según el tipo de prenda).
- Publicar prendas con fotos desde el celular en menos de 2 minutos.
- Descontar una venta en menos de 10 segundos (2 toques).
- Catálogo público con filtros por categoría y talla, ofertas visibles y "carrito WhatsApp".
- Suscripción mensual con bloqueo del panel si vence.
- Infraestructura gratuita o de costo mínimo.

### No objetivos (fuera del MVP)

- Pagos en línea / carrito con checkout.
- Cuentas de cliente en el catálogo.
- Escáner de códigos de barras.
- Multi-tienda real (varias tiendas operando). **Pero** el esquema lleva `storeId` desde el día 1 para no reescribir después.
- Reportes avanzados de ventas (solo historial de movimientos).
- Apps nativas iOS/Android (la app de trabajadores es una web-app instalable/PWA).

---

## 3. Arquitectura

**Enfoque: monolito Next.js.** Un solo repo, un solo deploy.

| Capa | Tecnología |
|---|---|
| Framework full-stack | Next.js (App Router) + TypeScript |
| Estilos | Tailwind CSS, diseño móvil-first |
| Base de datos | PostgreSQL en Neon (tier gratuito) |
| ORM | Prisma (esquema declarativo + Prisma Studio visual) |
| Imágenes | Cloudinary (tier gratuito, compresión/transformación automática) |
| Autenticación | Propia: login + JWT en cookie httpOnly |
| Validación | Zod en Server Actions |
| Deploy | Vercel (tier gratuito) |
| Costo | $0 mensual; dominio opcional ~$10/año (Fase 5) |

### Rutas del proyecto

- `/` — Catálogo público (SSR para SEO y rapidez).
- `/producto/[id]` — Detalle de prenda.
- `/admin/*` — App de trabajadores (protegida por sesión + suscripción activa).
- `/platform` — Panel del dueño del software (rol `PLATFORM_ADMIN`).
- `/api/*` — Solo lo imprescindible (p. ej. firma de subida a Cloudinary).

### Decisiones técnicas clave

1. **Mutaciones vía Server Actions** (vender, subir prenda, ajustar stock) — menos código repetido que una API REST paralela.
2. **Auth propia con JWT en cookie httpOnly** (`jose` + hash de contraseñas con `argon2`). Didáctica, transparente y controlada — sin dependencias mágicas.
3. **`storeId` en todas las tablas operativas** desde el inicio → cuando se venda a la tienda #2 solo se agregan registro de tienda, slug y subdominio.
4. **El catálogo nunca depende de JavaScript para renderizar** (SSR + filtros por query params) — indexable por Google y rápido en celulares modestos.

---

## 4. Modelo de datos

10 tablas. Léase como pseudoesquema de Prisma (los tipos exactos se definen al implementar).

> **MVP de una sola tienda:** el catálogo público y las Server Actions operan sobre la primera `Store` activa (seed inicial: QueGrasa). El `storeId` está presente en el esquema para que la evolución a multi-tienda no requiera migraciones de datos, solo lógica de selección (subdominio → `Store`).

### Store (tienda)
| Campo | Nota |
|---|---|
| id, createdAt | |
| slug | único, p. ej. `quegrasa` (futuro subdominio) |
| name | "QueGrasa" |
| whatsappNumber | número E.164, destino de los pedidos |
| logoUrl? | opcional |

### Category (categoría)
| Campo | Nota |
|---|---|
| id, storeId | |
| name | "Parte de arriba", "Jeans", "Chaquetas"... |
| slug | único por tienda, se usa en filtros del catálogo |
| sortOrder | orden de los chips en el catálogo |

Se administran desde el panel (crear, renombrar, reordenar, desactivar). Nunca se borran con productos asociados (se marcan inactivas).

### Size (talla — diccionario por tienda) ⭐
| Campo | Nota |
|---|---|
| id, storeId | |
| name | "S", "M", "28", "32", "Unitalla"... |
| sortOrder | |

**Por qué existe:** las tallas dependen del tipo de prenda (jeans: 28-38; playeras: S-XL). Una tabla diccionario evita duplicados ("M" vs "m") y permite sugerencias inteligentes.

- Único por `(storeId, name)`.
- Al subir una prenda se eligen tallas de la lista; si no existe, se escribe una vez y queda guardada.
- **Sugerencia por categoría:** al elegir "Jeans" se proponen primero las tallas más usadas en productos de esa categoría (query de frecuencia simple).

### Product (prenda)
| Campo | Nota |
|---|---|
| id, storeId, createdAt, updatedAt | |
| categoryId | |
| name | incluye el color: "Playera negra oversize" (decisión: color va en el nombre, no en variantes) |
| description? | |
| price | Decimal |
| salePrice? | si es distinto de null → es oferta visible |
| isActive | publicada / retirada del catálogo |

### ProductImage
| Campo | Nota |
|---|---|
| id, productId | |
| url, publicId | Cloudinary |
| sortOrder | 1-5 fotos por prenda |

### ProductVariant ⭐ (el corazón del sistema)
| Campo | Nota |
|---|---|
| id, productId | |
| sizeId | referencia a Size |
| stock | entero, nunca negativo |
| **único** por `(productId, sizeId)` | |

El stock de QueGrasa vive aquí: "Jean azul / talla 32 / 4 piezas".

### User
| Campo | Nota |
|---|---|
| id, email (único), name | |
| passwordHash | argon2 |
| role | `WORKER` \| `PLATFORM_ADMIN` |
| storeId | null para PLATFORM_ADMIN (dueño del software) |
| isActive | para desactivar trabajadores sin borrarlos |

Todos los `WORKER` tienen los mismos permisos (decisión del cliente). `PLATFORM_ADMIN` es el desarrollador/propietario del software.

### StockMovement (historial — auditoría)
| Campo | Nota |
|---|---|
| id, createdAt | |
| variantId | qué variante cambió |
| userId | quién lo hizo |
| type | `SALE` \| `RESTOCK` \| `ADJUST` \| `NEW` |
| quantity | con signo: -1 venta, +2 reabasto |
| note? | "se dañó la prenda", "llegó proveedor"... |

**Regla:** ningún stock cambia sin un movimiento registrado. Si "desaparecen" prendas, se puede reconstruir quién descontó qué y cuándo.

### Subscription
| Campo | Nota |
|---|---|
| id, storeId (único), updatedAt | |
| status | `ACTIVE` \| `PAST_DUE` \| `SUSPENDED` (recalculado al vuelo contra `paidUntil`) |
| paidUntil | fecha límite cubierta por el último pago |

### SubscriptionPayment
| Campo | Nota |
|---|---|
| id, subscriptionId, createdAt | |
| amount | Decimal |
| periodStart, periodEnd | mes cubierto |
| registeredById | qué PLATFORM_ADMIN registró el pago |

---

## 5. Pantallas y flujos

### 5.1 Catálogo público (sin login, móvil-first)

**Home `/`**
- Grid de prendas: foto, nombre, precio (tachado + precio de oferta con etiqueta "OFERTA" cuando aplica).
- Barra de filtros (se reflejan en la URL para compartir/SEO):
  - Chips de categoría: *Todo, Parte de arriba, Parte de abajo, Chaquetas, Jeans...*
  - Chips de talla: **dinámicos** — solo se muestran las tallas presentes en los resultados actuales (filtras "Jeans" → ves 28/30/32/34; "Parte de arriba" → S/M/G/XL).
  - Chip "Solo ofertas".
- Solo se listan productos activos con ≥1 variante con stock > 0.
- Resultado vacío: mensaje amable "No hay prendas disponibles con esos filtros" + botón para limpiar filtros.

**Detalle `/producto/[id]`**
- Carrusel de fotos (swipe), nombre, descripción, precio/oferta.
- Tallas como botones; las agotadas tachadas y no seleccionables.
- Botón "Agregar al pedido" (requiere talla elegida).

**Bolsa de pedido (botón flotante)**
- Lista de prendas elegidas (nombre, talla, precio), quitar/agregar.
- Se guarda en `localStorage` (no requiere backend ni cuenta).
- Botón "Enviar por WhatsApp" → `https://wa.me/<numero>?text=<mensaje>` con mensaje armado:

```
Hola QueGrasa! 👀 Me interesan estas prendas:
1. Playera Negra Oversize — Talla M — $150
2. Jeans Azul — Talla 32 — $320 (oferta, antes $400)
¿Siguen disponibles?
```

### 5.2 App de trabajadores `/admin` (login, móvil)

**Login** — email + contraseña. Sesión de 30 días renovable.

**Inicio** — 4 botones grandes:

| Botón | Pantalla |
|---|---|
| 🛒 **Vendí** | Buscador por nombre → resultados con foto y tallas → tap en la talla vendida → confirmación ✓ instantánea. Permanece en "modo venta" para descontar varias prendas seguidas, mostrando lo descontado en la sesión. Cada pieza genera `StockMovement(SALE, -1)`. Si la talla llega a 0, el botón queda deshabilitado. |
| 📦 **Inventario** | Lista agrupada por categoría con stock por talla. Editar con botones +/− (genera `RESTOCK`/`ADJUST`), buscar, marcar producto activo/inactivo, editar precio/oferta. |
| ➕ **Subir prenda** | Fotos (cámara o galería, hasta 5, reordenables) → nombre → categoría → tallas (sugeridas según categoría, con opción de crear nuevas) + stock inicial c/u → precio → precio de oferta opcional → descripción → publicar. Aparece en el catálogo al instante. Genera `StockMovement(NEW)` por variante. |
| 🏷️ **Ofertas** | Lista de todas las prendas con botón rápido para poner/quitar `salePrice`. |

**Bloqueo por suscripción** — si `paidUntil < hoy`, cualquier ruta `/admin` muestra una pantalla "Suscripción vencida, contacta al administrador" con botón de WhatsApp al número del desarrollador. El catálogo público **sigue visible** (no castiga a los clientes finales; lo que se pierde es la capacidad de actualizar, que es el servicio que se cobra).

### 5.3 Panel del proveedor `/platform` (rol `PLATFORM_ADMIN`, tú)

- Lista de tiendas (MVP: una) con estado de suscripción: "Activa hasta 28-oct" / "Vencida desde 15-oct".
- Botón "Registrar pago" → monto + periodo → extiende `paidUntil` (+30 días por defecto).
- Historial de pagos de cada tienda.
- Alta de trabajadores de una tienda (crear usuario con email/contraseña) — porque la tienda pierde su panel si no paga.

---

## 6. Reglas de negocio

1. **Stock**: entero ≥ 0, por variante. Toda variación genera un `StockMovement`. Nunca negativo (la acción falla con mensaje claro).
2. **Oferta**: `salePrice != null` → el catálogo muestra `price` tachado + `salePrice` + etiqueta. `salePrice >= price` se rechaza por validación.
3. **Visibilidad en catálogo**: producto activo con ≥1 variante con stock > 0. Variante agotada → talla tachada en el detalle. Producto sin stock → no aparece en el grid.
4. **Tallas**: diccionario por tienda; sugerencia de las más frecuentes por categoría; creación inline única.
5. **Bolsa WhatsApp**: almacenada en `localStorage`; validar al armar el mensaje que los ítems sigan activos; si algo cambió, el catálogo lo refleja al recargar.
6. **Suscripción**: bloqueo del panel al vencer. Catálogo público sigue visible. El estado se recalcula al vuelo (`paidUntil` vs hoy) — sin jobs externos en el MVP.
7. **Permisos**: `WORKER` = todas las operaciones de tienda (decisión del cliente: todos iguales). `PLATFORM_ADMIN` = suscripciones + administración de tiendas y usuarios. Sin más roles.
8. **Borrado**: nada se borra físicamente. Productos se desactivan, trabajadores se marcan inactivos, categorías se inactivan. Los datos de inventario son la memoria de la tienda.

---

## 7. Seguridad

- Contraseñas con hash `argon2`; política mínima: 8+ caracteres.
- Sesión: JWT en cookie `httpOnly`, `SameSite=Lax`, `Secure` en producción, 30 días con refresh.
- `PLATFORM_ADMIN` se distingue solo por `role` en BD; el primer usuario admin se crea con seed protegido.
- Todas las Server Actions validan con Zod y verifican sesión (y suscripción activa) en el servidor.
- Login con limitador de intentos simple (incremental delay por IP).
- Cloudinary: subida firmada (preset restringido a imágenes, carpeta por tienda).
- Secretos solo en variables de entorno de Vercel. `.env` local ignorado por git.
- Imágenes de Cloudinary servidas con transformaciones (`f_auto,q_auto`) — también mitiga peso y abuso.

---

## 8. Despliegue y operación

- **Deploy**: Vercel conectado al repo GitHub. Preview por PR, producción en `main`.
- **BD**: Neon PostgreSQL con connection pooling. Respaldos: dump semanal programado (script en Fase 5) + PITR del proveedor.
- **Costos**: $0 (tiers gratuitos de Vercel/Neon/Cloudinary). Dominio propio + QR impreso en el mostrador en Fase 5.
- **Observabilidad MVP**: logs de Vercel + estado del middleware. Sin APM externo en esta fase.

---

## 9. Plan de desarrollo por fases

Ritmo estimado: 10-15 h/semana. Cada fase cierra con un **objetivo verificable** demostrable a la tienda.

| Fase | Semanas | Alcance | Objetivo verificable |
|---|---|---|---|
| **0. Fundamentos** | 1 | Entorno local (Node, VS Code, Postgres con Docker), repo GitHub, proyecto Next.js + Tailwind, esquema Prisma inicial, deploy a Vercel + Neon, seed de datos de prueba | "Hola mundo" visible en internet con URL propia y BD conectada |
| **1. Inventario core** | 2-4 | CRUD completo de prendas con fotos, categorías, diccionario de tallas, variantes con stock, subida a Cloudinary, pantallas de Inventario y Subir Prenda | El catálogo **real** completo de QueGrasa capturado en el sistema |
| **2. Vender en tienda** | 5-6 | Login propio con JWT, pantalla "Vendí" con modo venta, movimientos con historial, ajustes y reabasto, validaciones de stock | Los trabajadores descontando ventas reales en la tienda física cada día |
| **3. Catálogo público** | 7-9 | Home con grid y filtros (categoría, talla dinámica, ofertas), detalle con carrusel, bolsa WhatsApp, SSR/SEO, PWA instalable para trabajadores | **Lanzamiento**: clientes pidiendo por WhatsApp desde el catálogo real |
| **4. SaaS** | 10-11 | Subscription + pagos, panel `/platform`, middleware de bloqueo, alta de trabajadores | Primer pago mensual registrado en el sistema |
| **5. Pulido y lanzamiento** | 12 | Dominio propio, QR de mostrador, respaldos automáticos, capacitación a trabajadores, corrección de bugs de uso real | QueGrasa operando 100% con el sistema |

**Riesgos y mitigación**
- *Los trabajadores no lo usan* → Fase 2 entrega la operación diaria lo antes posible y el botón "Vendí" es de 2 toques; capacitación en Fase 5.
- *Fotos pesadas arruinan el catálogo* → Cloudinary transforma y comprime; validación de peso máximo por subida.
- *Stock no cuadra* → `StockMovement` como bitácora completa y ajustes con nota obligatoria.
- *Abandono del servicio* → bloqueo de panel con recuperación en un clic al registrar el pago.

---

## 10. Criterios de éxito del MVP

1. Subir una prenda con fotos desde el celular toma < 2 minutos.
2. Descontar una venta toma < 10 segundos.
3. Un cliente filtra "Jeans" + talla "32" y solo ve prendas disponibles en esa talla.
4. El mensaje de WhatsApp llega correcto: prendas, tallas y precios, con ofertas identificadas.
5. Al vencer la suscripción, el panel se bloquea y el catálogo sigue visible.
6. Costo operativo mensual: $0 (sin contar el dominio anual).
