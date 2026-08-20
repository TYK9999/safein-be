import { Inject, Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { Kysely } from 'kysely';

import { DATABASE } from '../database/database.provider';
import { Database } from '../database/database.types';
import { CreateQrDto } from './qrcode.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QrcodeService {
  private readonly logger = new Logger(QrcodeService.name);

  constructor(
    @Inject(DATABASE) // however your project injects Kysely
    private readonly db: Kysely<Database>,

    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateQrDto) {
    const qr = await this.db
      .insertInto('qr_codes')
      .values({
        site: dto.site,
        asset: dto.asset,
        task_type: dto.taskType,
        risk_type: dto.riskType,
        destination_types: dto.destinationTypes,
        active: dto.active ?? true,
        context: dto.context,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const payload = {
      id: qr.id,
      site: qr.site,
      asset: qr.asset,
      taskType: qr.task_type,
      riskType: qr.risk_type,
      destinationTypes: qr.destination_types,
      active: qr.active,
    };

    const encoded = JSON.stringify(payload);

    console.log(encoded);

    const qrCode = await QRCode.toDataURL(encoded);
    return {
      ...qr,
      qrCode,
      payload,
    };
  }

  async createWithRedirect(dto: CreateQrDto) {
    const qr = await this.db
      .insertInto('qr_codes')
      .values({
        site: dto.site,
        asset: dto.asset,
        task_type: dto.taskType,
        risk_type: dto.riskType,
        destination_types: dto.destinationTypes,
        active: dto.active ?? true,
        context: dto.context,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const qrUrl = `${this.config.get('APP_URL')}/qr/${qr.id}`;

    const qrCode = await QRCode.toDataURL(qrUrl);

    return {
      ...qr,
      qrCode,
      url: qrUrl,
    };
  }
}
