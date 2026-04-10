import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthResponseDto } from 'src/auth/dto/auth-response.dto';
import { LoginDto } from 'src/auth/dto/login.dto';
import type { RequestUser } from 'src/common/types/request-user.type';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.validateCredentials(loginDto.email, loginDto.password);

    return this.buildAuthResponse({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async register(createUserDto: CreateUserDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create(createUserDto);

    return this.buildAuthResponse({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async me(userId: string): Promise<ReturnType<UsersService['findById']>> {
    return this.usersService.findById(userId);
  }

  private async buildAuthResponse(user: RequestUser): Promise<AuthResponseDto> {
    const accessToken = await this.jwtService.signAsync(user);
    const currentUser = await this.usersService.findById(user.sub);

    return {
      accessToken,
      user: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      },
    };
  }
}
