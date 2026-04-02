import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import 'dotenv/config';
import { join } from 'path';
import { AppModule } from './app.module';
import { GlobalExceptionHandler } from './common/execptions/global-exception-handler';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.useGlobalFilters(new GlobalExceptionHandler());

  app.enableCors({
    origin: ['http://localhost:3000', process.env.FRONTEND_URL!],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT!;

  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
}
bootstrap();
