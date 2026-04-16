-- CreateEnum
CREATE TYPE "ServiceBillingType" AS ENUM ('LABOR_ONLY', 'PARTS_AND_LABOR', 'FIXED_PRICE');

-- CreateEnum
CREATE TYPE "ServiceMaterialSource" AS ENUM (
    'SHOP_SUPPLIES',
    'CUSTOMER_SUPPLIES',
    'NO_PARTS_REQUIRED',
    'FLEXIBLE'
);

-- CreateTable
CREATE TABLE "ServiceCatalogItem" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "internalNotes" TEXT,
    "laborPrice" DECIMAL(12,2) NOT NULL,
    "productPrice" DECIMAL(12,2) NOT NULL,
    "suggestedTotalPrice" DECIMAL(12,2) NOT NULL,
    "billingType" "ServiceBillingType" NOT NULL,
    "materialSource" "ServiceMaterialSource" NOT NULL,
    "estimatedTimeMinutes" INTEGER,
    "warrantyDays" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCatalogItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ServiceCatalogItem_prices_check" CHECK (
      "laborPrice" >= 0
      AND "productPrice" >= 0
      AND "suggestedTotalPrice" >= 0
      AND "suggestedTotalPrice" = ("laborPrice" + "productPrice")
    ),
    CONSTRAINT "ServiceCatalogItem_duration_check" CHECK (
      "estimatedTimeMinutes" IS NULL OR "estimatedTimeMinutes" > 0
    ),
    CONSTRAINT "ServiceCatalogItem_warranty_check" CHECK (
      "warrantyDays" IS NULL OR "warrantyDays" >= 0
    ),
    CONSTRAINT "ServiceCatalogItem_labor_only_rules_check" CHECK (
      "billingType" <> 'LABOR_ONLY'
      OR (
        "productPrice" = 0
        AND "materialSource" IN ('CUSTOMER_SUPPLIES', 'NO_PARTS_REQUIRED', 'FLEXIBLE')
      )
    ),
    CONSTRAINT "ServiceCatalogItem_no_parts_required_check" CHECK (
      "materialSource" <> 'NO_PARTS_REQUIRED'
      OR (
        "productPrice" = 0
        AND "billingType" <> 'PARTS_AND_LABOR'
      )
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalogItem_code_key" ON "ServiceCatalogItem"("code");

-- CreateIndex
CREATE INDEX "ServiceCatalogItem_category_idx" ON "ServiceCatalogItem"("category");

-- CreateIndex
CREATE INDEX "ServiceCatalogItem_name_idx" ON "ServiceCatalogItem"("name");

-- CreateIndex
CREATE INDEX "ServiceCatalogItem_active_idx" ON "ServiceCatalogItem"("active");

-- CreateIndex
CREATE INDEX "ServiceCatalogItem_createdAt_idx" ON "ServiceCatalogItem"("createdAt");

-- CreateIndex
CREATE INDEX "ServiceCatalogItem_active_category_name_idx" ON "ServiceCatalogItem"("active", "category", "name");

-- CreateIndex
CREATE INDEX "ServiceCatalogItem_active_createdAt_idx" ON "ServiceCatalogItem"("active", "createdAt");
