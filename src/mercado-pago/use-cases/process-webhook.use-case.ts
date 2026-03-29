import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { MercadoPagoService } from '../mercado-pago.service';

export interface ProcessWebhookInput {
  testKey?: string;
  signature?: string;
  requestId?: string;
  payload: any;
}

@Injectable()
export class ProcessWebhookUseCase {
  private readonly logger = new Logger(ProcessWebhookUseCase.name);

  constructor(private readonly mercadoPagoService: MercadoPagoService) {}

  async execute(input: ProcessWebhookInput) {
    const { testKey, signature, requestId, payload } = input;
    const expectedKey = process.env.MP_WEBHOOK_SECRET;

    if (!expectedKey) {
      throw new BadRequestException('MP_WEBHOOK_SECRET não configurado');
    }

    const dataId =
      typeof payload?.data?.id === 'string' || typeof payload?.data?.id === 'number'
        ? String(payload.data.id)
        : undefined;

    if (testKey) {
      if (testKey !== expectedKey) {
        this.logger.error('Chave de teste do webhook inválida');
        throw new BadRequestException('Chave de teste inválida');
      }
      this.logger.log('Webhook validado via simulador de teste');
    } else if (signature) {
      if (!requestId || !dataId) {
        this.logger.error('Headers ou payload insuficientes para validar a assinatura');
        throw new BadRequestException('Dados incompletos para validação');
      }

      const isValid = this.validateSignature(signature, requestId, dataId, expectedKey);
      
      if (!isValid) {
        this.logger.error('Assinatura x-signature inválida. Possível fraude!');
        throw new BadRequestException('Assinatura inválida');
      }
      
      this.logger.log('Assinatura do webhook validada com sucesso via criptografia');
    } else {
      this.logger.warn('Webhook recebido sem nenhum header de segurança');
    }

    const action = typeof payload?.action === 'string' ? payload.action : undefined;
    const type = typeof payload?.type === 'string' ? payload.type : undefined;

    this.logger.log(`Webhook parseado: action=${action ?? 'n/a'} type=${type ?? 'n/a'} id=${dataId ?? 'n/a'}`);

    return this.mercadoPagoService.processWebhook(action, dataId);
  }

  private validateSignature(signature: string, requestId: string, dataId: string, secret: string): boolean {
    try {
      const parts = signature.split(',');
      let ts = '';
      let hash = '';

      parts.forEach((part) => {
        const [key, value] = part.split('=');
        if (key?.trim() === 'ts') ts = value?.trim();
        if (key?.trim() === 'v1') hash = value?.trim();
      });

      if (!ts || !hash) return false;

      const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
      
      const hmac = crypto.createHmac('sha256', secret);
      const digest = hmac.update(manifest).digest('hex');

      return digest === hash;
    } catch (error) {
      this.logger.error('Erro no processamento da assinatura criptográfica', error);
      return false;
    }
  }
}