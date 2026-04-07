import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { IdempotencyInterceptor } from 'src/idempotency/idempotency.interceptor';
import { User } from '@supabase/supabase-js';
import { CurrentUser } from 'src/auth';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import {
  MercadoPagoCheckoutInput,
  MercadoPagoCheckoutSchema,
} from 'src/schemas/mercado-pago.schema';
import { success } from 'src/utils/api-response-helper';
import { MercadoPagoService } from './mercado-pago.service';

@Controller('mercado-pago')
export class MercadoPagoController {
  constructor(private readonly mercadoPagoService: MercadoPagoService) {}

  @Post('checkout')
  @UseInterceptors(IdempotencyInterceptor)
  async createCheckout(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(MercadoPagoCheckoutSchema))
    data: MercadoPagoCheckoutInput,
  ) {
    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }

    const { url } = await this.mercadoPagoService.createCheckoutUrl(
      user.id,
      data.planTier,
      data.cycle,
    );

    return success(
      { url },
      'URL de checkout do Mercado Pago gerada com sucesso',
    );
  }
}
