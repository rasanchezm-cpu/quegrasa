// ============================================================
// Seed inicial de QueGrasa — idempotente (se puede correr varias veces)
// corre con: npx prisma db seed
// ============================================================
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ---------- Tienda ----------
  const store = await prisma.store.upsert({
    where: { slug: "quegrasa" },
    update: { whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "584141234567" },
    create: {
      slug: "quegrasa",
      name: "QueGrasa",
      whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "584141234567",
    },
  });

  // ---------- Suscripción (30 días para no bloquear el desarrollo) ----------
  const paidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.subscription.upsert({
    where: { storeId: store.id },
    update: { paidUntil, status: "ACTIVE" },
    create: { storeId: store.id, paidUntil, status: "ACTIVE" },
  });

  // ---------- Categorías ----------
  const categoryDefs: [string, string, number][] = [
    ["Parte de arriba", "parte-arriba", 1],
    ["Parte de abajo", "parte-abajo", 2],
    ["Jeans", "jeans", 3],
    ["Chaquetas", "chaquetas", 4],
    ["Monos", "monos", 5],
    ["Accesorios", "accesorios", 6],
    ["Hombre", "hombre", 7],
    ["Mujer", "mujer", 8],
  ];
  const categories: Record<string, string> = {};
  for (const [name, slug, sortOrder] of categoryDefs) {
    const c = await prisma.category.upsert({
      where: { storeId_slug: { storeId: store.id, slug } },
      update: {},
      create: { storeId: store.id, name, slug, sortOrder },
    });
    categories[slug] = c.id;
  }

  // ---------- Tallas (diccionario — las reales de QueGrasa) ----------
  const sizeDefs = [
    // Pantalones / jeans
    "24", "26", "28", "30", "32", "34", "36", "38",
    // Franelas, chaquetas y monos
    "XS", "S", "M", "L", "XL", "XXL",
    // Accesorios (gorras etc.)
    "Única",
  ];
  const sizes: Record<string, string> = {};
  for (let i = 0; i < sizeDefs.length; i++) {
    const s = await prisma.size.upsert({
      where: { storeId_name: { storeId: store.id, name: sizeDefs[i] } },
      update: {},
      create: { storeId: store.id, name: sizeDefs[i], sortOrder: i + 1 },
    });
    sizes[sizeDefs[i]] = s.id;
  }

  // ---------- Usuarios ----------
  // Admin del software (PLATFORM_ADMIN, sin tienda)
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@quegrasa.app";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "cambiar-antes-de-produccion";
  const adminHash = await argon2.hash(adminPassword);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminHash },
    create: {
      email: adminEmail,
      name: "Admin (dueño del software)",
      passwordHash: adminHash,
      role: "PLATFORM_ADMIN",
    },
  });

  // Trabajador de prueba (WORKER de la tienda)
  const workerHash = await argon2.hash("trabajador123");
  const worker = await prisma.user.upsert({
    where: { email: "trabajador@quegrasa.app" },
    update: { passwordHash: workerHash },
    create: {
      email: "trabajador@quegrasa.app",
      name: "Trabajador de prueba",
      passwordHash: workerHash,
      role: "WORKER",
      storeId: store.id,
    },
  });

  // ---------- Prendas de prueba ----------
  type SeedVariant = [string, number]; // [talla, stock]
  const products: {
    name: string;
    categorySlugs: string[];
    price: number;
    salePrice?: number;
    description?: string;
    variants: SeedVariant[];
  }[] = [
    {
      name: "Jean recto azul",
      categorySlugs: ["jeans", "parte-abajo"],
      price: 18,
      description: "Jeans recto de mezclilla azul, tiro alto.",
      variants: [["26", 2], ["28", 3], ["30", 4], ["32", 1], ["34", 2]],
    },
    {
      name: "Franela negra oversize",
      categorySlugs: ["parte-arriba", "mujer"],
      price: 12,
      description: "Franela oversize de algodón, color negro.",
      variants: [["S", 3], ["M", 5], ["L", 4], ["XL", 2]],
    },
    {
      name: "Chaqueta denim clara",
      categorySlugs: ["chaquetas", "parte-arriba", "mujer"],
      price: 25,
      salePrice: 20,
      description: "Chaqueta de denim en tono claro.",
      variants: [["M", 2], ["L", 1], ["XL", 1]],
    },
    {
      name: "Mono lila",
      categorySlugs: ["monos", "parte-abajo"],
      price: 22,
      description: "Mono (overol) en color lila.",
      variants: [["S", 1], ["M", 2], ["L", 3]],
    },
    {
      name: "Gorra roja",
      categorySlugs: ["accesorios"],
      price: 8,
      description: "Gorra ajustable, color rojo. Talla única.",
      variants: [["Única", 6]],
    },
  ];

  for (const p of products) {
    const existing = await prisma.product.findFirst({
      where: { storeId: store.id, name: p.name },
    });
    if (existing) continue; // ya estaba sembrado

    const created = await prisma.product.create({
      data: {
        storeId: store.id,
        productCategories: {
          create: p.categorySlugs.map((slug, i) => ({
            categoryId: categories[slug],
            sortOrder: i,
          })),
        },
        name: p.name,
        description: p.description,
        price: p.price,
        salePrice: p.salePrice,
        variants: {
          create: p.variants.map(([sizeName, stock]) => ({
            sizeId: sizes[sizeName],
            stock,
          })),
        },
      },
      include: { variants: true },
    });

    // Movimiento NEW por variante: la bitácora empieza desde el día 1
    for (const v of created.variants) {
      await prisma.stockMovement.create({
        data: {
          variantId: v.id,
          userId: worker.id,
          type: "NEW",
          quantity: v.stock,
          note: "Seed inicial",
        },
      });
    }
  }

  // ---------- Tasa BCV inicial (el cron diario la reemplaza con la real) ----------
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  await prisma.exchangeRate.upsert({
    where: { date: today },
    update: {},
    create: { date: today, rate: 36.5, source: "MANUAL" },
  });

  console.log("Seed completado:");
  console.log("  - Tienda: QueGrasa + suscripción 30 días");
  console.log("  - 6 categorías, 13 tallas, 5 prendas con stock");
  console.log("  - Admin:", adminEmail);
  console.log("  - Trabajador: trabajador@quegrasa.app / trabajador123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
