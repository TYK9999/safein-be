import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import { AuthService, PublicUser, Session } from './auth.service';
import {
  OtpRequestDto,
  OtpVerifyDto,
  RegisterDto,
} from './auth.schema';
import { CurrentUser, Public } from './decorators';
import type { VerifiedAccess } from './jwt.service';
import { JwtService } from './jwt.service';
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from './refresh-cookie';

type AuthSessionResponse = {
  accessToken: string;
  user: PublicUser;
  expiresIn: number;
};

@Controller({ version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  // ─── Signup (self-register into Community) ──────────────────────────────────
  @Public()
  @Post('auth/register')
  @HttpCode(HttpStatus.NO_CONTENT)
  async register(@Body() dto: RegisterDto): Promise<void> {
    await this.auth.register(dto.email, dto.firstName, dto.lastName);
  }

  // ─── OTP sign-up / sign-in ──────────────────────────────────────────────────
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
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    const session = await this.auth.verifyOtp(dto.email, dto.code);
    return this.completeLogin(session, res);
  }

  // ─── Refresh / logout ───────────────────────────────────────────────────────
  @Public()
  @Post('auth/refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    const token = readRefreshCookie(req, this.config);
    if (!token) throw new UnauthorizedException('No refresh token.');
    const session = await this.auth.refresh(token);
    return this.completeLogin(session, res);
  }

  @Public()
  @Post('auth/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    clearRefreshCookie(res, this.config);
    this.auth.logout();
  }

  // ─── Current user ───────────────────────────────────────────────────────────
  @Get('me')
  async me(@CurrentUser() user: VerifiedAccess): Promise<PublicUser> {
    return this.auth.me(user.sub);
  }

  // ─── helpers ────────────────────────────────────────────────────────────────
  private completeLogin(
    session: Session,
    res: Response,
  ): AuthSessionResponse {
    setRefreshCookie(res, this.config, session.refreshToken);
    return {
      accessToken: session.accessToken,
      user: session.user,
      expiresIn: this.jwt.accessTtlSeconds,
    };
  }
}
