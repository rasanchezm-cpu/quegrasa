# QueGrasa — Sistema de Inventario + Catálogo Online para Tiendas de Ropa

**SaaS completo para tiendas de ropa pequeñas** que resuelve un problema real: el catálogo que muestran los clientes en internet nunca coincide con el inventario real de la tienda. Con QueGrasa, el stock se descuenta al momento de vender — y el catálogo público se actualiza solo.

> Caso real: [QueGrasa](https://quegrasa.vercel.app) — tienda de ropa con +10K seguidores en Instagram, Barquisimeto, Venezuela.

## El problema que resuelve

Las tiendas de ropa que venden por WhatsApp muestran un catálogo que se desactualiza al instante: los clientes piden prendas que ya se agotaron en la tienda física. QueGrasa conecta el **inventario real** con el **catálogo público** en tiempo real.

## Features principales

### Para la tienda (panel de trabajadores, `/admin`)
- **🛒 Vendido** — descontar una venta en 2 toques: busca la prenda, toca la talla vendida. Con stock visible por talla en cada botón y modo venta continua.
- **📦 Envíos por agencia (MRW)** — los pedidos online quedan en una cola de pendientes con el nombre del cliente; un toque los marca como entregados en la agencia.
- **📋 Inventario visual** — cuadrícula de prendas por secciones, ajuste de stock por talla con ±, agregar tallas nuevas a prendas existentes, edición de precios y ofertas.
- **➕ Subir prenda** — con **recortador interactivo de fotos** (arrastrar y zoom para encuadrar la prenda en proporción 3:4) y publicación instantánea al catálogo.
- **🏷️ Ofertas** — poner o quitar precios rebajados que salen tachados en el catálogo.
- **🧾 Bitácora de movimientos** — auditoría completa: quién descontó qué, cuándo y con qué nota.
- **🎓 Tutorial de bienvenida** — carrusel para que trabajadores nuevos se orienten solos.

### Para los clientes (catálogo público)
- **Catálogo estilo boutique** — hero editorial con logo de la marca, marquee animado, tarjetas de prendas en proporción retrato con **tallas visibles y clicables**: toca tu talla y se agrega al carrito sin salir del catálogo.
- **Carrito → WhatsApp** — el pedido llega a la tienda con nombre, talla y precios ya escritos en el mensaje.
- **Precio dual USD/Bs** — precios administrados en dólares, mostrados también en bolívares con la tasa oficial BCV que se actualiza sola cada día (con respaldo manual).
- **Filtros y búsqueda** — por tipo de prenda (jeans, chaquetas, accesorios...) y por género (Hombre/Mujer), con URL compartible.
- **Prendas agotadas** — desaparecen del catálogo automáticamente al agotarse; regresan solas al reponer stock.

### Para el dueño del software (panel SaaS, `/platform`)
- **Suscripción mensual** — registro de pagos por tienda; si una tienda no paga, el panel se congela pero el catálogo público sigue visible.
- **Multi-tienda listo** — `storeId` en todo el esquema y categorías múltiples por prenda.

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) + TypeScript |
| Base de datos | PostgreSQL en Neon, con Prisma 7 (15 tablas) |
| Imágenes | Cloudinary con subida firmada y recorte interactivo en el cliente |
| Autenticación | Sesiones JWT en cookie httpOnly, contraseñas con argon2 |
| Tasa de cambio | Vercel Cron diario → ExchangeRate con respaldo manual |
| Animaciones | Framer Motion + CSS puro con `prefers-reduced-motion` |
| UI | Tailwind CSS 4, Bebas Neue + Jost, identidad negro/dorado de la marca |
| Despliegue | Vercel (deploy continuo desde GitHub) |

## Arquitectura

Un solo proyecto Next.js con tres caras: catálogo público (SSR, sin login), panel de trabajadores (móvil, con login) y panel del propietario. La regla de oro del inventario: **ningún stock cambia sin un movimiento registrado** (`StockMovement`).

## Documentación

- `docs/superpowers/specs/` — especificación de diseño completa
- `docs/superpowers/plans/` — planes de implementación por sprint
- `docs/diagrams/` — diagrama de arquitectura interactivo
