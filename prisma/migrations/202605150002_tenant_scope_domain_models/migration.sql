INSERT INTO "Workshop" ("id", "tradeName", "createdAt", "updatedAt")
SELECT '00000000-0000-4000-8000-000000000001'::uuid, 'Oficina Legada', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Workshop")
  AND (
    EXISTS (SELECT 1 FROM "Client")
    OR EXISTS (SELECT 1 FROM "Vehicle")
    OR EXISTS (SELECT 1 FROM "Budget")
    OR EXISTS (SELECT 1 FROM "ServiceOrder")
    OR EXISTS (SELECT 1 FROM "InventoryItem")
    OR EXISTS (SELECT 1 FROM "ServiceCatalogItem")
    OR EXISTS (SELECT 1 FROM "FinancialEntry")
    OR EXISTS (SELECT 1 FROM "VehicleHistory")
  );

ALTER TABLE "Client" ADD COLUMN "workshopId" UUID;
ALTER TABLE "Vehicle" ADD COLUMN "workshopId" UUID;
ALTER TABLE "Budget" ADD COLUMN "workshopId" UUID;
ALTER TABLE "ServiceOrder" ADD COLUMN "workshopId" UUID;
ALTER TABLE "InventoryItem" ADD COLUMN "workshopId" UUID;
ALTER TABLE "ServiceCatalogItem" ADD COLUMN "workshopId" UUID;
ALTER TABLE "InventoryMovement" ADD COLUMN "workshopId" UUID;
ALTER TABLE "FinancialEntry" ADD COLUMN "workshopId" UUID;
ALTER TABLE "VehicleHistory" ADD COLUMN "workshopId" UUID;

UPDATE "Client" SET "workshopId" = COALESCE((SELECT "workshopId" FROM "User" WHERE "workshopId" IS NOT NULL ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "Workshop" ORDER BY "createdAt" ASC LIMIT 1)) WHERE "workshopId" IS NULL;
UPDATE "InventoryItem" SET "workshopId" = COALESCE((SELECT "workshopId" FROM "User" WHERE "workshopId" IS NOT NULL ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "Workshop" ORDER BY "createdAt" ASC LIMIT 1)) WHERE "workshopId" IS NULL;
UPDATE "ServiceCatalogItem" SET "workshopId" = COALESCE((SELECT "workshopId" FROM "User" WHERE "workshopId" IS NOT NULL ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "Workshop" ORDER BY "createdAt" ASC LIMIT 1)) WHERE "workshopId" IS NULL;

UPDATE "Vehicle" v SET "workshopId" = c."workshopId" FROM "Client" c WHERE v."clientId" = c."id" AND v."workshopId" IS NULL;
UPDATE "Budget" b SET "workshopId" = c."workshopId" FROM "Client" c WHERE b."clientId" = c."id" AND b."workshopId" IS NULL;
UPDATE "ServiceOrder" so SET "workshopId" = c."workshopId" FROM "Client" c WHERE so."clientId" = c."id" AND so."workshopId" IS NULL;
UPDATE "FinancialEntry" fe SET "workshopId" = c."workshopId" FROM "Client" c WHERE fe."clientId" = c."id" AND fe."workshopId" IS NULL;
UPDATE "FinancialEntry" fe SET "workshopId" = so."workshopId" FROM "ServiceOrder" so WHERE fe."serviceOrderId" = so."id" AND fe."workshopId" IS NULL;
UPDATE "FinancialEntry" SET "workshopId" = COALESCE((SELECT "workshopId" FROM "User" WHERE "workshopId" IS NOT NULL ORDER BY "createdAt" ASC LIMIT 1), (SELECT "id" FROM "Workshop" ORDER BY "createdAt" ASC LIMIT 1)) WHERE "workshopId" IS NULL;
UPDATE "VehicleHistory" vh SET "workshopId" = v."workshopId" FROM "Vehicle" v WHERE vh."vehicleId" = v."id" AND vh."workshopId" IS NULL;
UPDATE "InventoryMovement" im SET "workshopId" = ii."workshopId" FROM "InventoryItem" ii WHERE im."inventoryItemId" = ii."id" AND im."workshopId" IS NULL;

ALTER TABLE "Client" ALTER COLUMN "workshopId" SET NOT NULL;
ALTER TABLE "Vehicle" ALTER COLUMN "workshopId" SET NOT NULL;
ALTER TABLE "Budget" ALTER COLUMN "workshopId" SET NOT NULL;
ALTER TABLE "ServiceOrder" ALTER COLUMN "workshopId" SET NOT NULL;
ALTER TABLE "InventoryItem" ALTER COLUMN "workshopId" SET NOT NULL;
ALTER TABLE "ServiceCatalogItem" ALTER COLUMN "workshopId" SET NOT NULL;
ALTER TABLE "InventoryMovement" ALTER COLUMN "workshopId" SET NOT NULL;
ALTER TABLE "FinancialEntry" ALTER COLUMN "workshopId" SET NOT NULL;
ALTER TABLE "VehicleHistory" ALTER COLUMN "workshopId" SET NOT NULL;

ALTER TABLE "Client" DROP CONSTRAINT IF EXISTS "Client_document_key";
ALTER TABLE "Vehicle" DROP CONSTRAINT IF EXISTS "Vehicle_plate_key";
ALTER TABLE "Budget" DROP CONSTRAINT IF EXISTS "Budget_code_key";
ALTER TABLE "ServiceOrder" DROP CONSTRAINT IF EXISTS "ServiceOrder_orderNumber_key";
ALTER TABLE "InventoryItem" DROP CONSTRAINT IF EXISTS "InventoryItem_internalCode_key";
ALTER TABLE "ServiceCatalogItem" DROP CONSTRAINT IF EXISTS "ServiceCatalogItem_code_key";
ALTER TABLE "VehicleHistory" DROP CONSTRAINT IF EXISTS "VehicleHistory_serviceOrderId_key";

ALTER TABLE "Client" ADD CONSTRAINT "Client_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceCatalogItem" ADD CONSTRAINT "ServiceCatalogItem_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleHistory" ADD CONSTRAINT "VehicleHistory_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Client_workshopId_document_key" ON "Client"("workshopId", "document");
CREATE UNIQUE INDEX "Client_id_workshopId_key" ON "Client"("id", "workshopId");
CREATE UNIQUE INDEX "Vehicle_workshopId_plate_key" ON "Vehicle"("workshopId", "plate");
CREATE UNIQUE INDEX "Vehicle_id_workshopId_key" ON "Vehicle"("id", "workshopId");
CREATE UNIQUE INDEX "Vehicle_id_clientId_workshopId_key" ON "Vehicle"("id", "clientId", "workshopId");
CREATE UNIQUE INDEX "Budget_workshopId_code_key" ON "Budget"("workshopId", "code");
CREATE UNIQUE INDEX "Budget_id_workshopId_key" ON "Budget"("id", "workshopId");
CREATE UNIQUE INDEX "ServiceOrder_workshopId_orderNumber_key" ON "ServiceOrder"("workshopId", "orderNumber");
CREATE UNIQUE INDEX "ServiceOrder_workshopId_budgetId_key" ON "ServiceOrder"("workshopId", "budgetId");
CREATE UNIQUE INDEX "ServiceOrder_id_workshopId_key" ON "ServiceOrder"("id", "workshopId");
CREATE UNIQUE INDEX "ServiceOrder_id_clientId_workshopId_key" ON "ServiceOrder"("id", "clientId", "workshopId");
CREATE UNIQUE INDEX "InventoryItem_workshopId_internalCode_key" ON "InventoryItem"("workshopId", "internalCode");
CREATE UNIQUE INDEX "InventoryItem_id_workshopId_key" ON "InventoryItem"("id", "workshopId");
CREATE UNIQUE INDEX "ServiceCatalogItem_workshopId_code_key" ON "ServiceCatalogItem"("workshopId", "code");
CREATE UNIQUE INDEX "ServiceCatalogItem_id_workshopId_key" ON "ServiceCatalogItem"("id", "workshopId");
CREATE UNIQUE INDEX "FinancialEntry_id_workshopId_key" ON "FinancialEntry"("id", "workshopId");
CREATE UNIQUE INDEX "VehicleHistory_workshopId_serviceOrderId_key" ON "VehicleHistory"("workshopId", "serviceOrderId");

CREATE INDEX "Client_workshopId_isActive_name_idx" ON "Client"("workshopId", "isActive", "name");
CREATE INDEX "Vehicle_workshopId_clientId_createdAt_idx" ON "Vehicle"("workshopId", "clientId", "createdAt");
CREATE INDEX "Budget_workshopId_status_idx" ON "Budget"("workshopId", "status");
CREATE INDEX "ServiceOrder_workshopId_status_openedAt_idx" ON "ServiceOrder"("workshopId", "status", "openedAt");
CREATE INDEX "InventoryItem_workshopId_category_name_idx" ON "InventoryItem"("workshopId", "category", "name");
CREATE INDEX "ServiceCatalogItem_workshopId_active_category_name_idx" ON "ServiceCatalogItem"("workshopId", "active", "category", "name");
CREATE INDEX "InventoryMovement_workshopId_inventoryItemId_createdAt_idx" ON "InventoryMovement"("workshopId", "inventoryItemId", "createdAt");
CREATE INDEX "FinancialEntry_workshopId_type_status_dueDate_idx" ON "FinancialEntry"("workshopId", "type", "status", "dueDate");
CREATE INDEX "VehicleHistory_workshopId_vehicleId_entryDate_idx" ON "VehicleHistory"("workshopId", "vehicleId", "entryDate");
