import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './core/core.module';
import { getAllowedOrigins } from './lib/utils/allowedOrigins.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = app.get(ConfigService);

  app.enableCors({
    origin: getAllowedOrigins(config),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());
  console.log('CORS ORIGINS:', getAllowedOrigins(config));
  console.log('CLIENT_URLS =', config.getOrThrow<string>('CLIENT_URLS'));

  await app.listen(process.env.PORT ?? 4200);
}
bootstrap();
