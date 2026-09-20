import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';

export class CorsIoAdapter extends IoAdapter {
  constructor(
    app: INestApplication,
    private readonly allowedOrigins: string[],
  ) {
    super(app);
  }

  createIOServer(port: number, options?: Partial<ServerOptions>): unknown {
    const origin =
      this.allowedOrigins.length === 1 && this.allowedOrigins[0] === '*'
        ? true
        : this.allowedOrigins;

    return super.createIOServer(port, {
      ...options,
      cors: {
        origin,
        credentials: true,
      },
    });
  }
}
