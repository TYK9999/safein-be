import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { Public } from '../auth/decorators';
import { ExtractTake5Dto, type Take5ExtractResult } from './take5.schema';
import { Take5Service } from './take5.service';

/** Public. Reads documents and returns Take 5 checks via Cursor. */
@Public()
@Controller({ version: '1' })
export class Take5Controller {
  constructor(private readonly take5: Take5Service) {}

  @Post('take5/extract')
  @HttpCode(HttpStatus.OK)
  extract(@Body() dto: ExtractTake5Dto): Promise<Take5ExtractResult> {
    return this.take5.extract(dto);
  }
}
