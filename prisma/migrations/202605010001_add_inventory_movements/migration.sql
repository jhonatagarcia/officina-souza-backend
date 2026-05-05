CREATE TYPE "InventoryMovementType" AS ENUM ('OUT', 'ADJUSTMENT');

CREATE TABLE "InventoryMovement" (
  "id" UUID NOT NULL,
  "inventoryItemId" UUID NOT NULL,
  "serviceOrderId" UUID,
  "serviceOrderPartId" UUID,
  "type" "InventoryMovementType" NOT NULL,
  "quantityChange" INTEGER NOT NULL,
  "quantityBefore" INTEGER NOT NULL,
  "quantityAfter" INTEGER NOT NULL,
  "unitCost" DECIMAL(12,2),
  "totalCost" DECIMAL(12,2),
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryMovement_inventoryItemId_createdAt_idx" ON "InventoryMovement"("inventoryItemId", "createdAt");
CREATE INDEX "InventoryMovement_serviceOrderId_idx" ON "InventoryMovement"("serviceOrderId");
CREATE INDEX "InventoryMovement_serviceOrderPartId_idx" ON "InventoryMovement"("serviceOrderPartId");
CREATE INDEX "InventoryMovement_type_createdAt_idx" ON "InventoryMovement"("type", "createdAt");

ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_serviceOrderPartId_fkey" FOREIGN KEY ("serviceOrderPartId") REFERENCES "ServiceOrderPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;
