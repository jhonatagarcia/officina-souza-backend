import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from 'src/auth/auth.service';
import { AuthResponseDto } from 'src/auth/dto/auth-response.dto';
import { ForgotPasswordDto } from 'src/auth/dto/forgot-password.dto';
import { GoogleLoginDto } from 'src/auth/dto/google-login.dto';
import { LoginDto } from 'src/auth/dto/login.dto';
import { MessageResponseDto } from 'src/auth/dto/message-response.dto';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { ResetPasswordDto } from 'src/auth/dto/reset-password.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { RequestUser } from 'src/common/types/request-user.type';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Realiza login e retorna JWT' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('google')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Realiza login com credencial validada do Google' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  google(@Body() googleLoginDto: GoogleLoginDto): Promise<AuthResponseDto> {
    return this.authService.loginWithGoogle(googleLoginDto);
  }

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria oficina e usuario administrador inicial' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  register(@Body() registerDto: RegisterDto): Promise<MessageResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('signup')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria oficina e usuario administrador inicial' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  signup(@Body() registerDto: RegisterDto): Promise<MessageResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicita redefinicao segura de senha' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefine senha usando token temporario' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna usuário autenticado' })
  me(@CurrentUser() user: RequestUser) {
    return this.authService.me(user.sub);
  }
}
