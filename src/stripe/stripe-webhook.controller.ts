import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { Public } from 'src/auth';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(private readonly stripeService: StripeService) {}

  @Public()
  @Post()
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    if (!signature) {
      throw new BadRequestException('Stripe signature missing');
    }

    if (!request.rawBody) {
      throw new BadRequestException('Raw body missing. Check NestJS main.ts configuration.');
    }

    return this.stripeService.handleWebhook(signature, request.rawBody);
  }
}
