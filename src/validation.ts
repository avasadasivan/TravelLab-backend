import { ValidationPipeOptions } from '@nestjs/common';

// Shared by main.ts and the tests so both validate requests the same way.
export const validationPipeOptions: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
};
