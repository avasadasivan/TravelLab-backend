// Loads DATABASE_URL and friends from .env before anything reads them.
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { checkOrigin } from './cors.js';
import { validationPipeOptions } from './validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
  // The Next.js app runs on a different port (or site), which makes it a
  // different origin, so the browser needs the backend's permission to call it.
  app.enableCors({ origin: checkOrigin });
  // Render (and most hosts) tell the app which port to use via PORT.
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
