import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

export interface VerifiedGoogleIdentity {
  subject: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

const TRUSTED_GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

@Injectable()
export class GoogleIdentityService {
  private readonly oauthClient = new OAuth2Client();

  constructor(private readonly configService: ConfigService) {}

  async verifyCredential(credential: string): Promise<VerifiedGoogleIdentity> {
    const clientId = this.configService.get<string>('google.clientId')?.trim();

    if (!clientId) {
      throw new ServiceUnavailableException('Login com Google indisponivel');
    }

    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      const payload = ticket.getPayload();

      return this.toVerifiedIdentity(payload, clientId);
    } catch {
      throw new UnauthorizedException('Nao foi possivel autenticar com Google');
    }
  }

  private toVerifiedIdentity(
    payload: TokenPayload | undefined,
    clientId: string,
  ): VerifiedGoogleIdentity {
    if (!payload) {
      throw new UnauthorizedException('Nao foi possivel autenticar com Google');
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const email = payload.email?.trim().toLowerCase();
    const subject = payload.sub?.trim();
    const issuer = payload.iss?.trim();
    const audience = payload.aud?.trim();

    if (!subject || !email || !issuer || !audience || !payload.exp) {
      throw new UnauthorizedException('Nao foi possivel autenticar com Google');
    }

    if (!TRUSTED_GOOGLE_ISSUERS.has(issuer)) {
      throw new UnauthorizedException('Nao foi possivel autenticar com Google');
    }

    if (audience !== clientId) {
      throw new UnauthorizedException('Nao foi possivel autenticar com Google');
    }

    if (payload.exp <= nowInSeconds) {
      throw new UnauthorizedException('Nao foi possivel autenticar com Google');
    }

    if (payload.email_verified !== true) {
      throw new UnauthorizedException('Nao foi possivel autenticar com Google');
    }

    return {
      subject,
      email,
      name: payload.name?.trim() || email.split('@')[0] || email,
      emailVerified: true,
    };
  }
}
