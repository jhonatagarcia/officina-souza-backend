import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from 'src/users/users.service';
import type { RequestUser } from 'src/common/types/request-user.type';

interface JwtPayload {
  sub: string;
  email: string;
  role: RequestUser['role'];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.jwtSecret'),
      issuer: configService.getOrThrow<string>('auth.jwtIssuer'),
      audience: configService.getOrThrow<string>('auth.jwtAudience'),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.usersService.findByEmail(payload.email);

    if (!user || !user.isActive || user.id !== payload.sub) {
      throw new UnauthorizedException('Token invalido');
    }

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
