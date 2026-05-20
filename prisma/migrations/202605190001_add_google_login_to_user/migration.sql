ALTER TABLE "User"
ADD COLUMN "googleSubject" TEXT,
ADD COLUMN "googleEmailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "googleLinkedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_googleSubject_key" ON "User"("googleSubject");
CREATE INDEX "User_googleSubject_idx" ON "User"("googleSubject");
