import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
import { Public } from 'src/auth';
import { MercadoPagoService } from './mercado-pago.service';

@Controller('webhooks/mercado-pago')
export class MercadoPagoWebhookController {
  constructor(private readonly mercadoPagoService: MercadoPagoService) {}

  @Public()
  @Post()
  async handleWebhook(
    // @Headers('x-mercadopago-webhook-test-key') webhookKey: string,
    @Body() payload: any,
  ) {
    // console.log('MercadoPago webhook recebido', { webhookKey, payload });
    const expectedKey = process.env.MP_WEBHOOK_SECRET;

    if (!expectedKey) {
      console.error('MP_WEBHOOK_SECRET não configurado');
      throw new BadRequestException('MP_WEBHOOK_SECRET não configurado');
    }

    // if (!webhookKey) {
    //   throw new BadRequestException('Header x-mercadopago-webhook-test-key não informado');
    // }

    // if (webhookKey !== expectedKey) {
    //   console.error('Chave de webhook inválida', { provided: webhookKey, expected: expectedKey });
    //   throw new BadRequestException('Chave de webhook inválida');
    // }

    const action =
      typeof payload?.action === 'string' ? payload.action : undefined;
    const dataId =
      typeof payload?.data?.id === 'string' ||
      typeof payload?.data?.id === 'number'
        ? String(payload.data.id)
        : undefined;

    console.log('Webhook parseado', { action, dataId });
    const result = await this.mercadoPagoService.processWebhook(action, dataId);
    console.log('processWebhook resultado', result);
    return result;
  }
}
