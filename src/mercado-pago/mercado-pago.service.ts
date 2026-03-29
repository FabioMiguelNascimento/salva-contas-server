import { Injectable, Logger } from '@nestjs/common';
import { PlanTier } from 'generated/prisma/enums';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly preApproval: PreApproval;

  constructor(private readonly prisma: PrismaService) {
    const accessToken = process.env.MP_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error('MP_ACCESS_TOKEN não configurado');
    }

    const client = new MercadoPagoConfig({ accessToken });
    this.preApproval = new PreApproval(client);
  }


  async createCheckoutUrl(userId: string, planTier: PlanTier, cycle: 'monthly' | 'yearly') {
    const planId = this.getPreapprovalPlanId(planTier, cycle);

    if (!planId) {
      throw new Error(`Plano inválido para checkout: ${planTier} ${cycle}`);
    }

    const url = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${planId}&external_reference=${userId}`;

    this.logger.log(`Checkout gerado para userId=${userId} planTier=${planTier} cycle=${cycle}`);

    return { url };
  }


  async processWebhook(action?: string, preapprovalId?: string, type?: string) {
    this.logger.log(`Webhook recebido: action=${action ?? 'n/a'} id=${preapprovalId ?? 'n/a'} type=${type ?? 'n/a'}`);

    if (type !== 'subscription_preapproval' && type !== 'preapproval') {
      this.logger.log(`Webhook ignorado: tipo "${type}" não é de assinatura`);
      return { received: true, ignored: true };
    }

    if (!preapprovalId || preapprovalId === '123456') {
      this.logger.warn('Webhook de teste ou sem ID ignorado');
      return { received: true, test: true };
    }

    let subscription: any;
    try {
      subscription = await this.preApproval.get({ id: preapprovalId });
    } catch (error) {
      this.logger.error(`Erro ao buscar assinatura ${preapprovalId} no MP`, error);
      return { received: true, error: 'Subscription not found' };
    }

    const status = this.asString(subscription?.status)?.toLowerCase();
    this.logger.log(`Status da assinatura ${preapprovalId}: ${status ?? 'desconhecido'}`);

    if (status === 'authorized') {
      await this.handleAuthorizedSubscription(subscription);
      return { received: true, status };
    }

    if (status === 'cancelled') {
      await this.handleCancelledSubscription(preapprovalId);
      return { received: true, status };
    }

    this.logger.warn(`Status não tratado: ${status ?? 'desconhecido'}`);
    return { received: true, status: status ?? 'unknown' };
  }


  private async handleAuthorizedSubscription(subscription: any) {
    const preapprovalId = this.asString(subscription?.id);
    if (!preapprovalId) {
      this.logger.warn('Assinatura autorizada sem id. Evento ignorado.');
      return;
    }

    const externalReference = this.asString(subscription?.external_reference);
    const preapprovalPlanId = this.asString(subscription?.preapproval_plan_id);
    const payerId = this.asString(subscription?.payer_id) ?? this.asString(subscription?.payer?.id);

    const userId = this.extractUserId(externalReference);
    const planTier =
      this.extractPlanTier(externalReference) ??
      this.extractPlanTierFromPreapprovalPlanId(preapprovalPlanId);

    let targetUserId = userId;

    if (!targetUserId) {
      const existing = await this.prisma.user.findFirst({
        where: { mpPreapprovalId: preapprovalId },
        select: { id: true },
      });
      targetUserId = existing?.id;
    }

    if (!targetUserId) {
      this.logger.warn(
        `Não foi possível identificar userId para assinatura ${preapprovalId}. external_reference=${externalReference ?? 'n/a'}`,
      );
      return;
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        mpPreapprovalId: preapprovalId,
        planTier,
        ...(payerId ? { mpCustomerId: payerId } : {}),
      },
    });

    this.logger.log(`Usuário ${targetUserId} atualizado para plano ${planTier}. preapproval=${preapprovalId}`);
  }

  private async handleCancelledSubscription(preapprovalId: string) {
    const result = await this.prisma.user.updateMany({
      where: { mpPreapprovalId: preapprovalId },
      data: { planTier: PlanTier.FREE, mpPreapprovalId: null },
    });

    this.logger.log(`Assinatura ${preapprovalId} cancelada. Usuários afetados: ${result.count}`);
  }


  private getPreapprovalPlanId(planTier: PlanTier, cycle: 'monthly' | 'yearly'): string | null {
    const envMap: Record<string, Record<'monthly' | 'yearly', string | undefined>> = {
      PRO: {
        monthly: process.env.MP_PLAN_PRO_MONTHLY,
        yearly: process.env.MP_PLAN_PRO_YEARLY,
      },
      FAMILY: {
        monthly: process.env.MP_PLAN_FAMILY_MONTHLY,
        yearly: process.env.MP_PLAN_FAMILY_YEARLY,
      },
    };

    return envMap[planTier]?.[cycle] ?? null;
  }

  private asString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    }
    if (typeof value === 'number') return String(value);
    return undefined;
  }

  private extractUserId(...sources: Array<string | undefined>): string | undefined {
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

    for (const source of sources) {
      if (!source) continue;

      try {
        const parsed = JSON.parse(source) as Record<string, unknown>;
        const fromJson = this.asString(parsed?.userId ?? parsed?.user_id);
        if (fromJson) return fromJson;
      } catch { }

      const explicit = source.match(/(?:userId|user_id|uid)[=:]([a-zA-Z0-9-]+)/i);
      if (explicit?.[1]) return explicit[1];

      const uuid = source.match(uuidRegex);
      if (uuid?.[0]) return uuid[0];
    }

    return undefined;
  }

  private extractPlanTier(...sources: Array<string | undefined>): PlanTier | undefined {
    for (const source of sources) {
      if (!source) continue;

      try {
        const parsed = JSON.parse(source) as Record<string, unknown>;
        const plan = this.toPlanTier(this.asString(parsed?.planTier ?? parsed?.plan_tier));
        if (plan) return plan;
      } catch { }

      const plan = this.toPlanTier(source);
      if (plan) return plan;
    }

    return undefined;
  }

  private toPlanTier(input?: string): PlanTier | undefined {
    if (!input) return undefined;
    const normalized = input.toUpperCase();
    if (normalized.includes('FAMILY')) return PlanTier.FAMILY;
    if (normalized.includes('PRO')) return PlanTier.PRO;
    if (normalized.includes('FREE')) return PlanTier.FREE;
    return undefined;
  }

  private extractPlanTierFromPreapprovalPlanId(id?: string): PlanTier {
    if (!id) return PlanTier.PRO;
    const planId = id.trim();
    if (planId === process.env.MP_PLAN_FAMILY_MONTHLY || planId === process.env.MP_PLAN_FAMILY_YEARLY) return PlanTier.FAMILY;
    if (planId === process.env.MP_PLAN_PRO_MONTHLY || planId === process.env.MP_PLAN_PRO_YEARLY) return PlanTier.PRO;
    return PlanTier.PRO;
  }
}