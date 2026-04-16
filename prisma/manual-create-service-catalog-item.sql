DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ServiceBillingType'
  ) THEN
    CREATE TYPE "ServiceBillingType" AS ENUM (
      'LABOR_ONLY',
      'PARTS_AND_LABOR',
      'FIXED_PRICE'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ServiceMaterialSource'
  ) THEN
    CREATE TYPE "ServiceMaterialSource" AS ENUM (
      'SHOP_SUPPLIES',
      'CUSTOMER_SUPPLIES',
      'NO_PARTS_REQUIRED',
      'FLEXIBLE'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public."ServiceCatalogItem" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceCatalogItem_code_key"
  ON public."ServiceCatalogItem" ("code");

CREATE INDEX IF NOT EXISTS "ServiceCatalogItem_category_idx"
  ON public."ServiceCatalogItem" ("category");

CREATE INDEX IF NOT EXISTS "ServiceCatalogItem_name_idx"
  ON public."ServiceCatalogItem" ("name");

CREATE INDEX IF NOT EXISTS "ServiceCatalogItem_active_idx"
  ON public."ServiceCatalogItem" ("active");

CREATE INDEX IF NOT EXISTS "ServiceCatalogItem_createdAt_idx"
  ON public."ServiceCatalogItem" ("createdAt");

CREATE INDEX IF NOT EXISTS "ServiceCatalogItem_active_category_name_idx"
  ON public."ServiceCatalogItem" ("active", "category", "name");

CREATE INDEX IF NOT EXISTS "ServiceCatalogItem_active_createdAt_idx"
  ON public."ServiceCatalogItem" ("active", "createdAt");
