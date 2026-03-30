import { Injectable, Logger } from '@nestjs/common';
import { PlanTier, BillingCycle } from 'generated/prisma/enums';
import { MercadoPagoConfig, PreApproval } from 'mercadopago';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly preApproval: PreApproval;

  constructor(private readonly prisma: PrismaService) {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    this.logger.log('Inicializando MercadoPagoService');

    if (!accessToken) {
      this.logger.error('MP_ACCESS_TOKEN não configurado');
      throw new Error('MP_ACCESS_TOKEN não configurado');
    }

    this.logger.debug(
      'MP_ACCESS_TOKEN encontrado, inicializando cliente Mercado Pago',
    );
    const client = new MercadoPagoConfig({ accessToken });
    this.preApproval = new PreApproval(client);
    this.logger.log('MercadoPagoService inicializado com sucesso');
  }

  async processWebhook(action?: string, preapprovalId?: string) {
    this.logger.log(
      `processWebhook chamado: action=${action ?? 'n/a'} id=${preapprovalId ?? 'n/a'}`,
    );

    if (!preapprovalId || preapprovalId === '123456') {
      this.logger.warn(
        `Webhook de teste ou sem ID ignorado. ID=${preapprovalId}`,
      );
      return { received: true, test: true };
    }

    let subscription: any;
    try {
      subscription = await this.preApproval.get({ id: preapprovalId });
      this.logger.debug(
        `Resposta MP get subscription: ${JSON.stringify(subscription)}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao buscar assinatura ${preapprovalId} no MP`,
        error,
      );
      return { received: true, error: 'Subscription not found' };
    }

    const status = this.asString(subscription?.status)?.toLowerCase();

    this.logger.log(
      `Status da assinatura ${preapprovalId}: ${status ?? 'desconhecido'}`,
    );

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
    const payerId =
      this.asString(subscription?.payer_id) ??
      this.asString(subscription?.payer?.id);

    const userId = this.extractUserId(externalReference);
    const planTier =
      this.extractPlanTier(externalReference) ??
      this.extractPlanTierFromPreapprovalPlanId(preapprovalPlanId);

    const billingCycle =
      this.extractBillingCycleFromPreapprovalPlanId(preapprovalPlanId);

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
        billingCycle,
        ...(payerId ? { mpCustomerId: payerId } : {}),
      },
    });

    this.logger.log(
      `Usuário ${targetUserId} atualizado para plano ${planTier} (${billingCycle ?? 'n/a'}). preapproval=${preapprovalId}`,
    );
  }

  private async handleCancelledSubscription(preapprovalId: string) {
    const result = await this.prisma.user.updateMany({
      where: { mpPreapprovalId: preapprovalId },
      data: {
        planTier: PlanTier.FREE,
        billingCycle: null,
        mpPreapprovalId: null,
      },
    });

    this.logger.log(
      `Assinatura ${preapprovalId} cancelada. Usuários afetados: ${result.count}`,
    );
  }

  async createCheckoutUrl(
    userId: string,
    planTier: PlanTier,
    cycle: 'monthly' | 'yearly',
  ) {
    this.logger.log(
      `createCheckoutUrl chamado para userId=${userId} planTier=${planTier} cycle=${cycle}`,
    );

    const planId = this.getPreapprovalPlanId(planTier, cycle);

    if (!planId) {
      this.logger.error(`Plano inválido para checkout: ${planTier} ${cycle}`);
      throw new Error(`Plano inválido para checkout: ${planTier}`);
    }

    const url = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${planId}&external_reference=${userId}`;

    this.logger.log(`URL de checkout gerada: ${url}`);
    return { url };
  }

  private getPreapprovalPlanId(
    planTier: PlanTier,
    cycle: 'monthly' | 'yearly',
  ): string | null {
    const envMap: Record<
      string,
      Record<'monthly' | 'yearly', string | undefined>
    > = {
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

  private extractUserId(
    ...sources: Array<string | undefined>
  ): string | undefined {
    const uuidRegex =
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

    for (const source of sources) {
      if (!source) continue;

      try {
        const parsed = JSON.parse(source) as Record<string, unknown>;
        const fromJson = this.asString(parsed?.userId ?? parsed?.user_id);
        if (fromJson) return fromJson;
      } catch {}

      const explicit = source.match(
        /(?:userId|user_id|uid)[=:]([a-zA-Z0-9-]+)/i,
      );
      if (explicit?.[1]) return explicit[1];

      const uuid = source.match(uuidRegex);
      if (uuid?.[0]) return uuid[0];
    }

    return undefined;
  }

  private extractPlanTier(
    ...sources: Array<string | undefined>
  ): PlanTier | undefined {
    for (const source of sources) {
      if (!source) continue;

      try {
        const parsed = JSON.parse(source) as Record<string, unknown>;
        const plan = this.toPlanTier(
          this.asString(parsed?.planTier ?? parsed?.plan_tier),
        );
        if (plan) return plan;
      } catch {}

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
    if (
      planId === process.env.MP_PLAN_FAMILY_MONTHLY ||
      planId === process.env.MP_PLAN_FAMILY_YEARLY
    )
      return PlanTier.FAMILY;
    if (
      planId === process.env.MP_PLAN_PRO_MONTHLY ||
      planId === process.env.MP_PLAN_PRO_YEARLY
    )
      return PlanTier.PRO;
    return PlanTier.PRO;
  }

  private extractBillingCycleFromPreapprovalPlanId(
    id?: string,
  ): BillingCycle | null {
    if (!id) return null;
    const planId = id.trim();

    if (
      planId === process.env.MP_PLAN_PRO_MONTHLY ||
      planId === process.env.MP_PLAN_FAMILY_MONTHLY
    ) {
      return BillingCycle.monthly;
    }

    if (
      planId === process.env.MP_PLAN_PRO_YEARLY ||
      planId === process.env.MP_PLAN_FAMILY_YEARLY
    ) {
      return BillingCycle.yearly;
    }

    return null;
  }
}
