ALTER TYPE "BudgetItemType" ADD VALUE 'LABOR_AND_PART';

ALTER TABLE "BudgetItem"
ADD COLUMN "inventoryItemId" UUID;

ALTER TABLE "BudgetItem"
ADD CONSTRAINT "BudgetItem_inventoryItemId_fkey"
FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "BudgetItem_inventoryItemId_idx" ON "BudgetItem"("inventoryItemId");
