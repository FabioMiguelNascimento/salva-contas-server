import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import 'dotenv/config';
import { join } from 'path';
import { AppModule } from './app.module';
import { GlobalExceptionHandler } from './common/execptions/global-exception-handler';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalFilters(new GlobalExceptionHandler());

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Servir arquivos estáticos da pasta uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT!, '0.0.0.0');
  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
}
bootstrap();

