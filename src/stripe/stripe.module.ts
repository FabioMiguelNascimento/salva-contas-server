import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeController } from './stripe.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({

  imports: [PrismaModule],
  controllers: [StripeWebhookController, StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
