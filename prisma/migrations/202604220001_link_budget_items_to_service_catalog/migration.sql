-- AlterTable
ALTER TABLE "BudgetItem"
ADD COLUMN "serviceCatalogItemId" UUID,
ADD COLUMN "serviceCode" TEXT;

-- CreateIndex
CREATE INDEX "BudgetItem_serviceCatalogItemId_idx" ON "BudgetItem"("serviceCatalogItemId");

-- AddForeignKey
ALTER TABLE "BudgetItem"
ADD CONSTRAINT "BudgetItem_serviceCatalogItemId_fkey"
FOREIGN KEY ("serviceCatalogItemId") REFERENCES "ServiceCatalogItem"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
