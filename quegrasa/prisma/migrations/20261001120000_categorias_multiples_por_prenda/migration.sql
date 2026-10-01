-- Categorías múltiples por prenda (decisión del dueño, 01-oct-2026)
-- Una prenda puede pertenecer a varias categorías (ej: Parte de abajo + Jeans + Mujer).

-- CreateTable: tabla de unión
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- DataMigration: preservar las categorías actuales de cada prenda
-- (el INSERT va ANTES del DROP para no perder la referencia)
INSERT INTO "ProductCategory" ("id", "productId", "categoryId", "sortOrder")
SELECT
    md5(random()::text || clock_timestamp()::text),
    "id",
    "categoryId",
    0
FROM "Product"
WHERE "categoryId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_productId_categoryId_key" ON "ProductCategory"("productId", "categoryId");
CREATE INDEX "ProductCategory_categoryId_idx" ON "ProductCategory"("categoryId");

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey (de la relación vieja producto→categoría)
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_categoryId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Product_categoryId_idx";

-- DropColumn: la categoría única vieja
ALTER TABLE "Product" DROP COLUMN "categoryId";
