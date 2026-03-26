import {
  Body,
  Controller,
  Post,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { CurrentUser } from 'src/auth';
import { StripeService } from './stripe.service';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import {
  StripeCheckoutInput,
  StripeCheckoutSchema,
} from 'src/schemas/stripe.schema';
import { Request } from 'express';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('checkout')
  async createCheckout(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(StripeCheckoutSchema)) data: StripeCheckoutInput,
  ) {
    return this.stripeService.createCheckoutSession(user.id, data.priceId);
  }

  @Post('portal')
  async createPortal(@Req() request: Request) {
    const localUser = request['localUser'];

    if (!localUser?.stripeCustomerId) {
      throw new BadRequestException(
        'Você ainda não possui uma assinatura ativa para gerenciar.',
      );
    }

    return this.stripeService.createPortalSession(localUser.stripeCustomerId);
  }
}
