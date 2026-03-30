import { Body, Controller, Headers, Post } from '@nestjs/common';
import { Public } from 'src/auth';
import { ProcessWebhookUseCase } from './use-cases/process-webhook.use-case';

@Controller('webhooks/mercado-pago')
export class MercadoPagoWebhookController {
  constructor(private readonly processWebhookUseCase: ProcessWebhookUseCase) {}

  @Public()
  @Post()
  async handleWebhook(
    @Headers('x-mercadopago-webhook-test-key') testKey: string,
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
    @Body() payload: any,
  ) {
    return this.processWebhookUseCase.execute({
      testKey,
      signature,
      requestId,
      payload,
    });
  }
}
