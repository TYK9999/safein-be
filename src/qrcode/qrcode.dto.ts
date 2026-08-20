import { createZodDto } from 'nestjs-zod';
import { CreateQrSchema } from './qrcode.schema';

export class CreateQrDto extends createZodDto(CreateQrSchema) {}
