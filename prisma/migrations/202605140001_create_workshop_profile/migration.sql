CREATE TABLE "Workshop" (
  "id" UUID NOT NULL,
  "tradeName" TEXT NOT NULL,
  "cnpj" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Workshop_cnpj_key" ON "Workshop"("cnpj");
CREATE INDEX "Workshop_isActive_createdAt_idx" ON "Workshop"("isActive", "createdAt");
