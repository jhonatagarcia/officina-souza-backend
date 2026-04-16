ALTER TABLE "ServiceCatalogItem"
DROP CONSTRAINT IF EXISTS "ServiceCatalogItem_duration_check";

ALTER TABLE "ServiceCatalogItem"
DROP COLUMN IF EXISTS "estimatedTimeMinutes";
