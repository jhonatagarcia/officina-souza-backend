import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

const RESET_TOKEN_BYTES = 32;

@Injectable()
export class PasswordResetTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async create(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(RESET_TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(Date.now() + this.getTtlMinutes() * 60_000);

    await this.revokeActiveTokensForUser(userId);

    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: this.hash(token),
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  async consumeValidToken(token: string): Promise<string | null> {
    const tokenHash = this.hash(token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    const now = new Date();

    if (!record || record.usedAt || record.revokedAt || record.expiresAt <= now) {
      return null;
    }

    if (!this.hashMatches(token, record.tokenHash)) {
      return null;
    }

    const updated = await this.prisma.passwordResetToken.updateMany({
      where: {
        id: record.id,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    return updated.count === 1 ? record.userId : null;
  }

  async revokeActiveTokensForUser(userId: string): Promise<void> {
    const now = new Date();

    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now },
    });
  }

  private getTtlMinutes(): number {
    return this.configService.get<number>('passwordReset.tokenTtlMinutes') ?? 30;
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private hashMatches(token: string, expectedHash: string): boolean {
    const current = Buffer.from(this.hash(token), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');

    return current.length === expected.length && timingSafeEqual(current, expected);
  }
}
