import { Module } from '@nestjs/common';

import { Take5Controller } from './take5.controller';
import { Take5Service } from './take5.service';

@Module({
  controllers: [Take5Controller],
  providers: [Take5Service],
})
export class Take5Module {}
