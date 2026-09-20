import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';

/** Sent on every `/api/v1/*` call so expired access tokens can be refreshed. */
export const REFRESH_COOKIE_PATH = '/api/v1';
/** Previous path — still cleared on logout so old cookies disappear. */
const LEGACY_REFRESH_COOKIE_PATH = '/api/v1/auth';

export const ACCESS_TOKEN_HEADER = 'X-Access-Token';

export function refreshCookieOptions(config: ConfigService): CookieOptions {
  const domain = config.get<string>('cookies.domain');
  const maxAgeSec = config.getOrThrow<number>('jwt.refreshTtlSec');
  return {
    httpOnly: true,
    secure: config.getOrThrow<boolean>('cookies.secure'),
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: maxAgeSec * 1000,
    ...(domain ? { domain } : {}),
  };
}

export function readRefreshCookie(
  req: Request,
  config: ConfigService,
): string | undefined {
  const name = config.getOrThrow<string>('cookies.refreshName');
  const value = req.cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function setRefreshCookie(
  res: Response,
  config: ConfigService,
  token: string,
): void {
  const name = config.getOrThrow<string>('cookies.refreshName');
  res.cookie(name, token, refreshCookieOptions(config));
}

export function clearRefreshCookie(res: Response, config: ConfigService): void {
  const name = config.getOrThrow<string>('cookies.refreshName');
  const domain = config.get<string>('cookies.domain');
  const base = {
    path: REFRESH_COOKIE_PATH,
    ...(domain ? { domain } : {}),
  };
  res.clearCookie(name, base);
  res.clearCookie(name, { ...base, path: LEGACY_REFRESH_COOKIE_PATH });
}

export function attachRefreshedAccessToken(
  req: Request,
  res: Response,
  accessToken: string,
): void {
  req.headers.authorization = `Bearer ${accessToken}`;
  res.setHeader(ACCESS_TOKEN_HEADER, accessToken);
}
