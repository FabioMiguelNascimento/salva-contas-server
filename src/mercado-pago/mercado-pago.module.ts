import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MercadoPagoWebhookController } from './mercado-pago-webhook.controller';
import { MercadoPagoController } from './mercado-pago.controller';
import { MercadoPagoService } from './mercado-pago.service';
import { ProcessWebhookUseCase } from './use-cases/process-webhook.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [MercadoPagoWebhookController, MercadoPagoController],
  providers: [
    MercadoPagoService,
    {
      provide: ProcessWebhookUseCase,
      useClass: ProcessWebhookUseCase,
    },
  ],
  exports: [MercadoPagoService],
})
export class MercadoPagoModule {}
