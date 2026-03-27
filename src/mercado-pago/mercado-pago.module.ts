import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MercadoPagoWebhookController } from './mercado-pago-webhook.controller';
import { MercadoPagoController } from './mercado-pago.controller';
import { MercadoPagoService } from './mercado-pago.service';

@Module({
  imports: [PrismaModule],
  controllers: [MercadoPagoWebhookController, MercadoPagoController],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class MercadoPagoModule {}
