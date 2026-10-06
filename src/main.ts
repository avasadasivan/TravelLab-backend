import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { validationPipeOptions } from './validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
  // The Next.js app runs on a different port, which makes it a different
  // origin, so the browser needs the backend's permission to call it.
  app.enableCors({ origin: 'http://localhost:3000' });
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
