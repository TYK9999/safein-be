import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuthService, PublicUser, Session } from './auth.service';
import {
  MagicLinkRequestDto,
  OtpRequestDto,
  OtpVerifyDto,
  RegisterDto,
} from './auth.schema';
import { CurrentUser, Public } from './decorators';
import type { VerifiedAccess } from './jwt.service';

@Controller({ version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ─── Signup (self-register into Community) ──────────────────────────────────
  @Public()
  @Post('auth/register')
  @HttpCode(HttpStatus.NO_CONTENT)
  async register(@Body() dto: RegisterDto): Promise<void> {
    await this.auth.register(dto.email, dto.firstName, dto.lastName);
  }

  // ─── OTP login ──────────────────────────────────────────────────────────────
  @Public()
  @Post('auth/otp/request')
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestOtp(@Body() dto: OtpRequestDto): Promise<void> {
    await this.auth.requestOtp(dto.email);
  }

  @Public()
  @Post('auth/otp/verify')
  async verifyOtp(
    @Body() dto: OtpVerifyDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ accessToken: string; user: PublicUser }> {
    const session = await this.auth.verifyOtp(dto.email, dto.code);
    return this.completeLogin(session, reply);
  }

  // ─── Magic link ─────────────────────────────────────────────────────────────
  @Public()
  @Post('auth/magic-link')
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestMagicLink(@Body() dto: MagicLinkRequestDto): Promise<void> {
    await this.auth.requestMagicLink(dto.email);
  }

  @Public()
  @Get('auth/magic/:token')
  async verifyMagicLink(
    @Param('token') token: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ accessToken: string; user: PublicUser }> {
    const session = await this.auth.verifyMagicLink(token);
    return this.completeLogin(session, reply);
  }

  // ─── Refresh / logout ───────────────────────────────────────────────────────
  @Public()
  @Post('auth/refresh')
  async refresh(
    @Req() req: FastifyRequest,
  ): Promise<{ accessToken: string; user: PublicUser }> {
    const name = this.config.get<string>('cookies.refreshName')!;
    const token = req.cookies?.[name];
    if (!token) throw new UnauthorizedException('No refresh token.');
    return this.auth.refresh(token);
  }

  @Public()
  @Post('auth/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) reply: FastifyReply): void {
    reply.clearCookie(this.config.get<string>('cookies.refreshName')!, {
      path: '/api/v1/auth',
    });
  }

  // ─── Current user ───────────────────────────────────────────────────────────
  @Get('me')
  async me(@CurrentUser() user: VerifiedAccess): Promise<PublicUser> {
    return this.auth.me(user.sub);
  }

  // ─── helpers ────────────────────────────────────────────────────────────────
  private completeLogin(
    session: Session,
    reply: FastifyReply,
  ): { accessToken: string; user: PublicUser } {
    reply.setCookie(
      this.config.getOrThrow<string>('cookies.refreshName'),
      session.refreshToken,
      {
        httpOnly: true,
        secure: this.config.getOrThrow<boolean>('cookies.secure'),
        sameSite: 'lax',
        path: '/api/v1/auth',
        maxAge: this.config.getOrThrow<number>('jwt.refreshTtlSec'),
        domain: this.config.get<string>('cookies.domain'),
      },
    );
    return { accessToken: session.accessToken, user: session.user };
  }
}
