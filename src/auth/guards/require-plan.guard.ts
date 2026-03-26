import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { ALLOWED_PLANS_KEY } from '../decorators/allowed-plans.decorator';
import { PlanTier } from 'generated/prisma/enums';

@Injectable()
export class RequirePlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlans = this.reflector.getAllAndOverride<PlanTier[]>(
      ALLOWED_PLANS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se nenhum plano for especificado, a rota é livre (ou controlada por outros guards)
    if (!requiredPlans || requiredPlans.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const targetUserId = request['targetUserId'];

    if (!targetUserId) {
      return false;
    }

    // Busca o plano do Dono do Caderno (targetUserId)
    const owner = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { planTier: true },
    });

    if (!owner) {
      return false;
    }

    const hasPlan = requiredPlans.includes(owner.planTier);

    if (!hasPlan) {
      throw new ForbiddenException(
        `Esta funcionalidade requer o plano ${requiredPlans.join(' ou ')}.`,
      );
    }

    return true;
  }
}
