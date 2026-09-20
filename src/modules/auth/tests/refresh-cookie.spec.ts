import { refreshCookieOptions, REFRESH_COOKIE_PATH } from '../refresh-cookie';

describe('refreshCookieOptions', () => {
  const config = {
    get: (key: string) => (key === 'cookies.domain' ? undefined : undefined),
    getOrThrow: (key: string) => {
      if (key === 'jwt.refreshTtlSec') return 2592000;
      if (key === 'cookies.secure') return false;
      throw new Error(key);
    },
  };

  it('scopes the cookie to /api/v1 so permissioned APIs can refresh', () => {
    const opts = refreshCookieOptions(config as never);
    expect(opts.path).toBe(REFRESH_COOKIE_PATH);
    expect(opts.httpOnly).toBe(true);
    expect(opts.maxAge).toBe(2592000 * 1000);
  });
});
