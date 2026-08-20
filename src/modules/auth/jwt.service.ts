import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppLoggerService } from '../../logger/app-logger.service';
import {
  SignJWT,
  jwtVerify,
  generateKeyPair,
  importPKCS8,
  importSPKI,
  type KeyLike,
} from 'jose';

const ALG = 'EdDSA';

export interface AccessClaims {
  sub: number; // app_user.id
  email: string;
  tid: number; // tenant id
  role: string; // worker | supervisor (within the tenant)
}

export interface VerifiedAccess extends AccessClaims {
  type: 'access';
}

/**
 * Issues and verifies EdDSA-signed JWTs.
 *
 * In dev, if no keypair is configured an ephemeral one is generated at boot
 * (tokens reset on restart). In production both keys are required.
 */
@Injectable()
export class JwtService implements OnModuleInit {
  private privateKey!: KeyLike;
  private publicKey!: KeyLike;
  private issuer!: string;
  private accessTtlSec!: number;
  private refreshTtlSec!: number;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(JwtService.name);
  }

  async onModuleInit(): Promise<void> {
    this.issuer = this.config.getOrThrow<string>('jwt.issuer');
    this.accessTtlSec = this.config.getOrThrow<number>('jwt.accessTtlSec');
    this.refreshTtlSec = this.config.getOrThrow<number>('jwt.refreshTtlSec');

    const priv = this.config.get<string | null>('jwt.privateKey');
    const pub = this.config.get<string | null>('jwt.publicKey');

    if (priv && pub) {
      this.privateKey = await importPKCS8(priv, ALG);
      this.publicKey = await importSPKI(pub, ALG);
      return;
    }

    if (this.config.get<string>('nodeEnv') === 'production') {
      throw new Error(
        'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required in production.',
      );
    }

    const pair = await generateKeyPair(ALG);
    this.privateKey = pair.privateKey;
    this.publicKey = pair.publicKey;
    this.logger.warn(
      'No JWT keypair configured; generated an ephemeral EdDSA keypair (dev only). Tokens will not survive a restart.',
    );
  }

  async issueAccessToken(claims: AccessClaims): Promise<string> {
    const { sub, ...rest } = claims; // sub goes in the standard subject claim (a string)
    return new SignJWT({ ...rest, type: 'access' })
      .setProtectedHeader({ alg: ALG })
      .setIssuedAt()
      .setIssuer(this.issuer)
      .setSubject(String(sub))
      .setExpirationTime(`${this.accessTtlSec}s`)
      .sign(this.privateKey);
  }

  async issueRefreshToken(sub: number): Promise<string> {
    return new SignJWT({ type: 'refresh' })
      .setProtectedHeader({ alg: ALG })
      .setIssuedAt()
      .setIssuer(this.issuer)
      .setSubject(String(sub))
      .setExpirationTime(`${this.refreshTtlSec}s`)
      .sign(this.privateKey);
  }

  async verifyAccessToken(token: string): Promise<VerifiedAccess> {
    const { payload } = await jwtVerify(token, this.publicKey, {
      issuer: this.issuer,
    });
    if (payload.type !== 'access') throw new Error('Not an access token.');
    return {
      sub: Number(payload.sub),
      email: payload.email as string,
      tid: payload.tid as number,
      role: payload.role as string,
      type: 'access',
    };
  }

  async verifyRefreshToken(token: string): Promise<{ sub: number }> {
    const { payload } = await jwtVerify(token, this.publicKey, {
      issuer: this.issuer,
    });
    if (payload.type !== 'refresh' || !payload.sub)
      throw new Error('Not a refresh token.');
    return { sub: Number(payload.sub) };
  }
}
