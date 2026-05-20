ALTER TABLE "PasswordResetToken" ADD COLUMN "revokedAt" TIMESTAMP(3);

CREATE INDEX "PasswordResetToken_revokedAt_idx" ON "PasswordResetToken"("revokedAt");
