import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { UserContext } from 'src/auth/user-context.service';
import { PLAN_LIMITS } from 'src/config/plan-limits.config';
import { CreateVaultInput } from 'src/schemas/vaults.schema';
import { VaultsRepositoryInterface } from '../vaults.interface';

@Injectable()
export class CreateVaultUseCase {
  constructor(
    @Inject(VaultsRepositoryInterface)
    private readonly vaultsRepository: VaultsRepositoryInterface,
    private readonly userContext: UserContext,
  ) {}

  async execute(data: CreateVaultInput) {
    const user = this.userContext.localUser;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado.');
    }

    const limits = PLAN_LIMITS[user.planTier];

    if (limits.maxVaults === 0) {
      throw new ForbiddenException(
        'O seu plano não permite criar cofrinhos. Faça upgrade para PRO ou FAMILY.',
      );
    }

    if (limits.maxVaults !== Infinity) {
      const vaults = await this.vaultsRepository.findAll();
      if (vaults.length >= limits.maxVaults) {
        throw new ForbiddenException(
          `Você atingiu o limite de ${limits.maxVaults} cofrinhos do seu plano.`,
        );
      }
    }

    return this.vaultsRepository.create(data);
  }
}
