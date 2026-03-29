import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PlanTier } from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';

export type FeatureType = 'IA' | 'RECEIPT';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  // Definição dos limites por plano
  private readonly limits = {
    [PlanTier.FREE]: { IA: 0, RECEIPT: 0 },
    [PlanTier.PRO]: { IA: 50, RECEIPT: 30 },
    [PlanTier.FAMILY]: { IA: 200, RECEIPT: 100 },
  };

  constructor(private readonly prisma: PrismaService) {}

  async checkAndIncrementUsage(
    userId: string,
    planTier: PlanTier,
    feature: FeatureType,
  ) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // JS months are 0-11
    const currentYear = now.getFullYear();

    // 1. Buscar uso atual ou realizar Lazy Reset se necessário
    const usage = await this.getOrCreateUsage(userId, currentMonth, currentYear);

    // 2. Verificar limite baseado no plano
    const planLimits = this.limits[planTier];
    const currentCount =
      feature === 'IA' ? usage.aiInteractionsCount : usage.receiptsCount;
    const limit = planLimits[feature];

    if (currentCount >= limit) {
      this.logger.warn(
        `Limite atingido para usuário ${userId}: ${feature} (${currentCount}/${limit})`,
      );
      throw new HttpException(
        {
          code: 'LIMIT_REACHED',
          message: `Você atingiu seu limite mensal de ${feature === 'IA' ? 'interações com o Consultor' : 'leitura de recibos'}. Seu plano ${planTier} permite até ${limit} usos por mês.`,
          limit,
          current: currentCount,
        },
        HttpStatus.PAYMENT_REQUIRED, // Status 402
      );
    }

    // 3. Incrementar contador atomicamente
    return this.prisma.subscriptionUsage.update({
      where: { userId },
      data: {
        [feature === 'IA' ? 'aiInteractionsCount' : 'receiptsCount']: {
          increment: 1,
        },
      },
    });
  }

  private async getOrCreateUsage(
    userId: string,
    month: number,
    year: number,
  ) {
    const usage = await this.prisma.subscriptionUsage.findUnique({
      where: { userId },
    });

    // Se não existe ou se o mês/ano mudou, fazemos o reset (Lazy Reset)
    if (!usage || usage.month !== month || usage.year !== year) {
      return this.prisma.subscriptionUsage.upsert({
        where: { userId },
        create: {
          userId,
          month,
          year,
          aiInteractionsCount: 0,
          receiptsCount: 0,
        },
        update: {
          month,
          year,
          aiInteractionsCount: 0,
          receiptsCount: 0,
        },
      });
    }

    return usage;
  }
}
