import { Body, Controller, Post } from '@nestjs/common';
import { QrcodeService } from './qrcode.service';
import { CreateQrDto } from './qrcode.dto';

@Controller('qrcode')
export class QrcodeController {
  constructor(private readonly qrcodeService: QrcodeService) {}

  @Post()
  async create(@Body() createQrDto: CreateQrDto) {
    return this.qrcodeService.create(createQrDto);
  }
}
