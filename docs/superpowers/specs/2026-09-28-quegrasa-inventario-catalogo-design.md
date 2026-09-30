# QueGrasa — Sistema de Inventario + Catálogo Público

**Especificación de diseño** · 28 de septiembre de 2026 · v1.0 (aprobada en conversación)

---

## 1. Visión y contexto

**QueGrasa** es una tienda de ropa mediana-pequeña que operaba únicamente en línea y ahora también tiene tienda física. Su problema: el catálogo que ven los clientes en internet muestra prendas que ya se agotaron en la tienda, así que la gente pide por WhatsApp cosas que ya no existen.

**Contexto monetario:** la tienda opera en Venezuela. Los precios se administran en **dólares (USD)** y se muestran también en **bolívares (Bs)** calculados con la tasa oficial BCV del día (actualización automática con respaldo manual).

La solución es un sistema de dos caras, siempre sincronizados por una sola base de datos:

1. **App de trabajadores** (web móvil con login): descuentan stock al vender, suben prendas nuevas con fotos, editan precios y ofertas.
2. **Catálogo público** (vitrina web sin login): los clientes filtran por categoría y talla, arman su pedido y lo envían por WhatsApp con un mensaje pre-armado que solo contiene prendas disponibles.

El software se comercializa como **SaaS con suscripción mensual**: el desarrollador registra los pagos y, si una tienda deja de pagar, el panel de trabajadores se bloquea.

### Modalidad de construcción

Construcción **asistida por IA**: el desarrollo se hace dirigiendo a un agente de código (el estudiante especifica, la IA escribe), con el objetivo de tener el MVP funcionando en **unos pocos días** (5-7 días de trabajo). El estudiante tiene bases de programación, BD y frontend/backend, lo que le permite revisar y validar lo que la IA genera. El stack elegido (Next.js + Prisma) es el que mejor conocen las IAs y el más documentado — maximiza la calidad del código generado.

**Dónde va el tiempo en esta modalidad:** no en escribir código, sino en (1) probar cada módulo con datos reales de la tienda, (2) subir el catálogo real con fotos, (3) afinar detalles de UX con los trabajadores y (4) desplegar.

---

## 2. Objetivos y no objetivos

### Objetivos (MVP)

- Controlar stock **por talla** (letras, números o mezclas, según el tipo de prenda).
- Publicar prendas con fotos desde el celular en menos de 2 minutos.
- Descontar una venta en menos de 10 segundos (2 toques).
- Catálogo público con filtros por categoría y talla, ofertas visibles y "carrito WhatsApp".
- **Envíos online (MRW):** registrar pedidos de venta online y marcar con un toque si ya fueron entregados a la agencia.
- **Collage promocional:** generar imágenes con prendas, tallas y precios libres para publicar en estados/comunidad de WhatsApp.
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

13 tablas. Léase como pseudoesquema de Prisma (los tipos exactos se definen al implementar).

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

**Por qué existe:** las tallas dependen del tipo de prenda (jeans: 24-38; franelas: S-XL). Una tabla diccionario evita duplicados ("M" vs "m") y permite sugerencias inteligentes.

- Único por `(storeId, name)`.
- Al subir una prenda se eligen tallas de la lista; si no existe, se escribe una vez y queda guardada.
- **Sugerencia por categoría:** al elegir "Pantalones" se proponen primero las tallas más usadas en productos de esa categoría (query de frecuencia simple).
- **Precarga inicial (tallas reales de QueGrasa):** Pantalones/Jeans → `24, 26, 28, 30, 32, 34, 36, 38` · Franelas, Chaquetas y Monos → `S, M, L, XL` · Accesorios (gorras etc.) → talla libre escrita a mano (p. ej. "Única") o detalle en la descripción.

### Product (prenda)
| Campo | Nota |
|---|---|
| id, storeId, createdAt, updatedAt | |
| categoryId | |
| name | incluye el color: "Playera negra oversize" (decisión: color va en el nombre, no en variantes) |
| description? | |
| price | Decimal, **en USD** ("piensa" en dólares, el Bs se calcula) |
| salePrice? | Decimal en USD; si es distinto de null → es oferta visible |
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
| amount | Decimal (en USD) |
| periodStart, periodEnd | mes cubierto |
| registeredById | qué PLATFORM_ADMIN registró el pago |

### Shipment (envío online) ⭐
| Campo | Nota |
|---|---|
| id, storeId, createdAt | |
| customerName | a nombre de quién se envía (para MRW) |
| customerPhone? | opcional |
| status | `PENDING` \| `AT_AGENCY` — **solo 2 estados** (decisión del cliente) |
| note? | dirección de la agencia, detalles |

### ShipmentItem
| Campo | Nota |
|---|---|
| id, shipmentId | |
| variantId | referencia a la variante exacta (producto + talla) |
| qty | piezas enviadas |
| priceSnapshot | precio USD al momento de la venta |

**Flujo:** crear el envío descuenta stock de inmediato (un `StockMovement(SALE)` por ítem). Marcar "En agencia" es un toggle de un toque. No hay estado de cancelación: si un pedido se devuelve, el trabajador repone el stock con un ajuste `+qty` y nota (regla 8 del borrado lógico aplicada a envíos).

### ExchangeRate (tasa BCV) ⭐
| Campo | Nota |
|---|---|
| id, createdAt | |
| date | única por día |
| rate | Decimal: Bs por 1 USD |
| source | `BCV` \| `MANUAL` |

Funcionamiento: un **Vercel Cron** diario consulta la tasa oficial (API pública de agregadores de tasa BCV; p. ej. `ve.dolarapi.com`) y guarda la del día. Si la fuente falla, el sistema usa la **última tasa guardada** y el panel `/platform` permite corregirla a mano (`source = MANUAL`). La tasa visible lleva su fecha ("tasa BCV 28-sep") para transparencia con los clientes.

---

## 5. Pantallas y flujos

### 5.1 Catálogo público (sin login, móvil-first)

**Home `/`**
- Grid de prendas: foto, nombre, **precio dual: `$15.00 · Bs 472,50`** (tachado + precio de oferta con etiqueta "OFERTA" cuando aplica).
- Pie de página del catálogo: "Precios en Bs calculados a tasa BCV del 28-sep" — siempre visible para evitar malentendidos.
- Barra de filtros (se reflejan en la URL para compartir/SEO):
  - Chips de categoría: *Todo, Parte de arriba, Parte de abajo, Chaquetas, Jeans...*
  - Chips de talla: **dinámicos** — solo se muestran las tallas presentes en los resultados actuales (filtras "Jeans" → ves 28/30/32/34; "Parte de arriba" → S/M/G/XL).
  - Chip "Solo ofertas".
- Solo se listan productos activos con ≥1 variante con stock > 0.
- Resultado vacío: mensaje amable "No hay prendas disponibles con esos filtros" + botón para limpiar filtros.

**Detalle `/producto/[id]`**
- Carrusel de fotos (swipe), nombre, descripción, precio/oferta.
- Tallas como botones; las agotadas tachadas y no seleccionables.
- **Prendas sin tallas estándar** (gorras, accesorios): la talla o detalle ("Única", "Talla libre", etc.) se muestra como **texto pequeño bajo el nombre**, sin selector — discreto en el catálogo.
- Botón "Agregar al pedido" (requiere talla elegida cuando hay selector).

**Bolsa de pedido (botón flotante)**
- Lista de prendas elegidas (nombre, talla, precio), quitar/agregar.
- Se guarda en `localStorage` (no requiere backend ni cuenta).
- Botón "Enviar por WhatsApp" → `https://wa.me/<numero>?text=<mensaje>` con mensaje armado:

```
Hola QueGrasa! 👀 Me interesan estas prendas:
1. Playera Negra Oversize — Talla M — $15 (Bs 472,50)
2. Jeans Azul — Talla 32 — $20 (Bs 630,00) — oferta, antes $25
¿Siguen disponibles?
```

*(Los Bs se calculan con la tasa vigente al armar el mensaje.)*

### 5.2 App de trabajadores `/admin` (login, móvil)

**Login** — email + contraseña. Sesión de 30 días renovable.

**Inicio** — 6 botones grandes:

| Botón | Pantalla |
|---|---|
| 🛒 **Vendí** | Buscador por nombre → resultados con foto y tallas → tap en la talla vendida → confirmación ✓ instantánea. Permanece en "modo venta" para descontar varias prendas seguidas, mostrando lo descontado en la sesión. Cada pieza genera `StockMovement(SALE, -1)`. Si la talla llega a 0, el botón queda deshabilitado. **Al cerrar la venta, opción "Es envío online":** pide el nombre del cliente y crea un `Shipment PENDING` además de la venta. |
| 📦 **Envíos** | Lista de envíos **pendientes** (los que hay que llevar a MRW) con botón grande de un toque **"En agencia ✓"**. Historial de ya entregados a la agencia con su fecha. Badge con la cantidad pendiente en el botón del inicio. |
| 🖼️ **Collage** | Elegir prendas del inventario → escribir tallas disponibles y **precio a mostrar** (libre — no toca el catálogo) → se genera automáticamente una imagen cuadrada (1080×1080, ideal para estados de WhatsApp) con fotos, tallas y precios → **descargar** y compartir a estados/comunidad. Solo prendas, sin marca ni número (decisión del cliente). Se genera en el navegador con Canvas: sin backend, sin costo. |
| 📋 **Inventario** | Lista agrupada por categoría con stock por talla. Editar con botones +/− (genera `RESTOCK`/`ADJUST`), buscar, marcar producto activo/inactivo, editar precio/oferta. |
| ➕ **Subir prenda** | Fotos (cámara o galería, hasta 5, reordenables) → nombre → categoría → tallas (sugeridas según categoría, con opción de crear nuevas o escribir talla libre) + stock inicial c/u → **precio en USD** (muestra el equivalente en Bs al capturar) → precio de oferta opcional → descripción → publicar. Aparece en el catálogo al instante. Genera `StockMovement(NEW)` por variante. |
| 🏷️ **Ofertas** | Lista de todas las prendas con botón rápido para poner/quitar `salePrice`. |

**Bloqueo por suscripción** — si `paidUntil < hoy`, cualquier ruta `/admin` muestra una pantalla "Suscripción vencida, contacta al administrador" con botón de WhatsApp al número del desarrollador. El catálogo público **sigue visible** (no castiga a los clientes finales; lo que se pierde es la capacidad de actualizar, que es el servicio que se cobra).

### 5.3 Panel del proveedor `/platform` (rol `PLATFORM_ADMIN`, tú)

- Lista de tiendas (MVP: una) con estado de suscripción: "Activa hasta 28-oct" / "Vencida desde 15-oct".
- **Tasa BCV del día** visible con su fecha y fuente; campo para corregirla manualmente (queda como `MANUAL`).
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
9. **Precio dual USD/Bs**: los precios se administran en USD. El display en Bs usa la tasa BCV del día (`ExchangeRate` más reciente); si la fuente diaria falla, se muestra la última tasa disponible y su fecha real — nunca un cálculo inventado. La corrección manual desde `/platform` es el respaldo.
10. **Envíos online**: crear un envío es una venta — descuenta stock en el momento con un `StockMovement(SALE)` por ítem y guarda `priceSnapshot`. Solo 2 estados: `PENDING` → `AT_AGENCY` (toggle de un toque). Sin estado de cancelación: una devolución se repone con ajuste `+qty` y nota obligatoria.
11. **Collage promocional**: los precios y tallas escritos en el collage son **libres** y no modifican el catálogo ni el inventario. La imagen se genera en el navegador (Canvas) y se descarga al dispositivo; no pasa por el servidor.

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

## 9. Plan de desarrollo — sprints de 1-2 días (construcción con IA)

Cada sprint cierra con el módulo **funcionando y probado con datos reales** antes de avanzar. La IA escribe el código; el humano prueba, ajusta y valida.

| Sprint | Duración | Alcance | Objetivo verificable |
|---|---|---|---|
| **S1. Base** | 1 día | Proyecto Next.js + Tailwind + Prisma, esquema completo de las 13 tablas, deploy a Vercel + Neon, seed (tienda, categorías, tallas reales: pantalones 24-38 / S-XL, usuario trabajador), **tabla ExchangeRate + cron de tasa BCV** | App desplegada en internet; el esquema aplica en BD sin errores; la tasa del día se guarda |
| **S2. Inventario** | 1-2 días | Subir prenda (fotos a Cloudinary, tallas sugeridas, talla libre, stock inicial), lista de inventario, categorías, edición de precios/ofertas | El catálogo real de QueGrasa capturado en el sistema |
| **S3. Venta y envíos** | 1-2 días | Login JWT, pantalla "Vendí" con modo venta, **envíos online MRW** (crear con nombre del cliente + "En agencia ✓" en un toque), ajustes +/−, historial de movimientos | Trabajador descontando ventas reales y gestionando envíos pendientes en la tienda |
| **S4. Catálogo público** | 1-2 días | Home con filtros (categoría, talla dinámica, ofertas), detalle con carrusel, bolsa WhatsApp, **precio dual USD/Bs con tasa visible**, SSR/SEO | Un cliente real pide por WhatsApp desde el catálogo |
| **S5. SaaS + collage + pulido** | 2 días | Subscription, panel `/platform`, middleware de bloqueo, **generador de collages (Canvas 1080×1080)**, dominio, QR de mostrador, PWA, respaldos | Primer pago mensual registrado; la dueña publicando collages en su comunidad; tienda operando con el sistema |

**Total: 6-8 días de trabajo efectivo.**

**Riesgos y mitigación**
- *La IA genera código que no se entiende* → el spec es la fuente de verdad; el estudiante revisa cada módulo antes de aceptarlo y pide explicación de lo que no entienda; cada módulo se prueba antes de avanzar.
- *Los trabajadores no lo usan* → el botón "Vendí" es de 2 toques; probarlo con ellos en el S3 y ajustar.
- *Fotos pesadas arruinan el catálogo* → Cloudinary transforma y comprime; validación de peso máximo por subida.
- *Stock no cuadra* → `StockMovement` como bitácora completa y ajustes con nota obligatoria.
- *Se subestima la carga de datos real* → subir el catálogo real es trabajo de la tienda (fotos por prenda); prever 2-4 horas para cargar las primeras prendas con el dueño.
- *Abandono del servicio* → bloqueo de panel con recuperación en un clic al registrar el pago.

---

## 10. Criterios de éxito del MVP

1. Subir una prenda con fotos desde el celular toma < 2 minutos.
2. Descontar una venta toma < 10 segundos.
3. Un cliente filtra "Jeans" + talla "32" y solo ve prendas disponibles en esa talla.
4. El mensaje de WhatsApp llega correcto: prendas, tallas y precios, con ofertas identificadas.
5. Al vencer la suscripción, el panel se bloquea y el catálogo sigue visible.
6. Costo operativo mensual: $0 (sin contar el dominio anual).
7. La tasa BCV se actualiza sola cada día; si la fuente falla, la última tasa guardada sigue operando y se puede corregir a mano desde `/platform`.
8. Los precios en el catálogo y en el mensaje de WhatsApp muestran USD y Bs consistentes con la tasa del día.
9. Un envío online se registra en menos de 30 segundos y pasa a "En agencia" con un solo toque.
10. Un collage de 4-6 prendas con precios libres se genera y descarga en menos de 1 minuto, en formato 1080×1080 listo para estados de WhatsApp.
