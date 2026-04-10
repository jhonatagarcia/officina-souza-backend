-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'ATENDENTE', 'MECANICO', 'FINANCEIRO');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "BudgetItemType" AS ENUM ('PART', 'LABOR');

-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'FINALIZADA', 'ENTREGUE');

-- CreateEnum
CREATE TYPE "FinancialEntryType" AS ENUM ('RECEIVABLE', 'PAYABLE');

-- CreateEnum
CREATE TYPE "FinancialStatus" AS ENUM ('PENDENTE', 'PAGO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'BOLETO', 'TRANSFERENCIA', 'OUTRO');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "plate" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT,
    "mileage" INTEGER,
    "fuel" TEXT,
    "chassis" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Vehicle_year_check" CHECK ("year" BETWEEN 1900 AND 2100),
    CONSTRAINT "Vehicle_mileage_check" CHECK ("mileage" IS NULL OR "mileage" >= 0)
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "clientId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "status" "BudgetStatus" NOT NULL DEFAULT 'PENDENTE',
    "problemDescription" TEXT NOT NULL,
    "notes" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "convertedToServiceOrder" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Budget_amounts_check" CHECK (
      "subtotal" >= 0
      AND "discount" >= 0
      AND "total" >= 0
      AND "discount" <= "subtotal"
      AND "total" = ("subtotal" - "discount")
    ),
    CONSTRAINT "Budget_status_dates_check" CHECK (
      ("status" = 'PENDENTE' AND "approvedAt" IS NULL AND "rejectedAt" IS NULL)
      OR ("status" = 'APROVADO' AND "approvedAt" IS NOT NULL AND "rejectedAt" IS NULL)
      OR ("status" = 'REPROVADO' AND "approvedAt" IS NULL AND "rejectedAt" IS NOT NULL)
    )
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "type" "BudgetItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BudgetItem_values_check" CHECK (
      "quantity" > 0
      AND "unitPrice" >= 0
      AND "totalPrice" = ("quantity" * "unitPrice")
    )
);

-- CreateTable
CREATE TABLE "ServiceOrder" (
    "id" UUID NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "budgetId" UUID,
    "clientId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "mechanicId" UUID,
    "problemDescription" TEXT NOT NULL,
    "diagnosis" TEXT,
    "servicesPerformed" TEXT,
    "vehicleChecklist" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDeliveryAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "status" "ServiceOrderStatus" NOT NULL DEFAULT 'ABERTA',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOrder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ServiceOrder_dates_check" CHECK (
      ("expectedDeliveryAt" IS NULL OR "expectedDeliveryAt" >= "openedAt")
      AND ("finishedAt" IS NULL OR "finishedAt" >= "openedAt")
      AND (
        "deliveredAt" IS NULL
        OR ("finishedAt" IS NOT NULL AND "deliveredAt" >= "finishedAt")
      )
    )
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "category" TEXT,
    "supplier" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minimumQuantity" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(12,2) NOT NULL,
    "salePrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InventoryItem_values_check" CHECK (
      "quantity" >= 0
      AND "minimumQuantity" >= 0
      AND "cost" >= 0
      AND "salePrice" >= 0
    )
);

-- CreateTable
CREATE TABLE "ServiceOrderPart" (
    "id" UUID NOT NULL,
    "serviceOrderId" UUID NOT NULL,
    "inventoryItemId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOrderPart_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ServiceOrderPart_values_check" CHECK (
      "quantity" > 0
      AND "unitPrice" >= 0
      AND "totalPrice" = ("quantity" * "unitPrice")
    )
);

-- CreateTable
CREATE TABLE "FinancialEntry" (
    "id" UUID NOT NULL,
    "type" "FinancialEntryType" NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" "PaymentMethod",
    "status" "FinancialStatus" NOT NULL DEFAULT 'PENDENTE',
    "clientId" UUID,
    "serviceOrderId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FinancialEntry_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "FinancialEntry_payment_consistency_check" CHECK (
      ("status" = 'PAGO' AND "paidAt" IS NOT NULL AND "paymentMethod" IS NOT NULL)
      OR ("status" <> 'PAGO' AND "paidAt" IS NULL)
    )
);

-- CreateTable
CREATE TABLE "VehicleHistory" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "serviceOrderId" UUID,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "mileage" INTEGER,
    "servicesSummary" TEXT NOT NULL,
    "partsSummary" TEXT,
    "totalAmount" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleHistory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VehicleHistory_values_check" CHECK (
      ("mileage" IS NULL OR "mileage" >= 0)
      AND ("totalAmount" IS NULL OR "totalAmount" >= 0)
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "User_isActive_createdAt_idx" ON "User"("isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Client_document_key" ON "Client"("document");

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE INDEX "Client_document_idx" ON "Client"("document");

-- CreateIndex
CREATE INDEX "Client_isActive_name_idx" ON "Client"("isActive", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_key" ON "Vehicle"("plate");

-- CreateIndex
CREATE INDEX "Vehicle_clientId_idx" ON "Vehicle"("clientId");

-- CreateIndex
CREATE INDEX "Vehicle_plate_idx" ON "Vehicle"("plate");

-- CreateIndex
CREATE INDEX "Vehicle_clientId_createdAt_idx" ON "Vehicle"("clientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_id_clientId_key" ON "Vehicle"("id", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_code_key" ON "Budget"("code");

-- CreateIndex
CREATE INDEX "Budget_clientId_idx" ON "Budget"("clientId");

-- CreateIndex
CREATE INDEX "Budget_vehicleId_idx" ON "Budget"("vehicleId");

-- CreateIndex
CREATE INDEX "Budget_status_idx" ON "Budget"("status");

-- CreateIndex
CREATE INDEX "Budget_clientId_status_createdAt_idx" ON "Budget"("clientId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Budget_vehicleId_status_createdAt_idx" ON "Budget"("vehicleId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BudgetItem_budgetId_idx" ON "BudgetItem"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetItem_budgetId_type_idx" ON "BudgetItem"("budgetId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrder_orderNumber_key" ON "ServiceOrder"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrder_budgetId_key" ON "ServiceOrder"("budgetId");

-- CreateIndex
CREATE INDEX "ServiceOrder_clientId_idx" ON "ServiceOrder"("clientId");

-- CreateIndex
CREATE INDEX "ServiceOrder_vehicleId_idx" ON "ServiceOrder"("vehicleId");

-- CreateIndex
CREATE INDEX "ServiceOrder_mechanicId_idx" ON "ServiceOrder"("mechanicId");

-- CreateIndex
CREATE INDEX "ServiceOrder_status_idx" ON "ServiceOrder"("status");

-- CreateIndex
CREATE INDEX "ServiceOrder_status_openedAt_idx" ON "ServiceOrder"("status", "openedAt");

-- CreateIndex
CREATE INDEX "ServiceOrder_vehicleId_status_openedAt_idx" ON "ServiceOrder"("vehicleId", "status", "openedAt");

-- CreateIndex
CREATE INDEX "ServiceOrder_mechanicId_status_openedAt_idx" ON "ServiceOrder"("mechanicId", "status", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrder_id_clientId_key" ON "ServiceOrder"("id", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_internalCode_key" ON "InventoryItem"("internalCode");

-- CreateIndex
CREATE INDEX "InventoryItem_name_idx" ON "InventoryItem"("name");

-- CreateIndex
CREATE INDEX "InventoryItem_internalCode_idx" ON "InventoryItem"("internalCode");

-- CreateIndex
CREATE INDEX "InventoryItem_category_name_idx" ON "InventoryItem"("category", "name");

-- CreateIndex
CREATE INDEX "ServiceOrderPart_serviceOrderId_idx" ON "ServiceOrderPart"("serviceOrderId");

-- CreateIndex
CREATE INDEX "ServiceOrderPart_inventoryItemId_idx" ON "ServiceOrderPart"("inventoryItemId");

-- CreateIndex
CREATE INDEX "ServiceOrderPart_inventoryItemId_createdAt_idx" ON "ServiceOrderPart"("inventoryItemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrderPart_serviceOrderId_inventoryItemId_key" ON "ServiceOrderPart"("serviceOrderId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "FinancialEntry_type_idx" ON "FinancialEntry"("type");

-- CreateIndex
CREATE INDEX "FinancialEntry_status_idx" ON "FinancialEntry"("status");

-- CreateIndex
CREATE INDEX "FinancialEntry_dueDate_idx" ON "FinancialEntry"("dueDate");

-- CreateIndex
CREATE INDEX "FinancialEntry_clientId_idx" ON "FinancialEntry"("clientId");

-- CreateIndex
CREATE INDEX "FinancialEntry_serviceOrderId_idx" ON "FinancialEntry"("serviceOrderId");

-- CreateIndex
CREATE INDEX "FinancialEntry_status_dueDate_idx" ON "FinancialEntry"("status", "dueDate");

-- CreateIndex
CREATE INDEX "FinancialEntry_type_status_dueDate_idx" ON "FinancialEntry"("type", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleHistory_serviceOrderId_key" ON "VehicleHistory"("serviceOrderId");

-- CreateIndex
CREATE INDEX "VehicleHistory_vehicleId_entryDate_idx" ON "VehicleHistory"("vehicleId", "entryDate");

-- CreateIndex
CREATE INDEX "VehicleHistory_entryDate_idx" ON "VehicleHistory"("entryDate");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_vehicleId_clientId_fkey" FOREIGN KEY ("vehicleId", "clientId") REFERENCES "Vehicle"("id", "clientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_vehicleId_clientId_fkey" FOREIGN KEY ("vehicleId", "clientId") REFERENCES "Vehicle"("id", "clientId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_mechanicId_fkey" FOREIGN KEY ("mechanicId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderPart" ADD CONSTRAINT "ServiceOrderPart_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderPart" ADD CONSTRAINT "ServiceOrderPart_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleHistory" ADD CONSTRAINT "VehicleHistory_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleHistory" ADD CONSTRAINT "VehicleHistory_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
