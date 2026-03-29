import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { CreateVaultInput } from 'src/schemas/vaults.schema';
import { VaultsRepositoryInterface } from '../vaults.interface';
import { UserContext } from 'src/auth/user-context.service';

@Injectable()
export class CreateVaultUseCase {
  constructor(
    @Inject(VaultsRepositoryInterface)
    private readonly vaultsRepository: VaultsRepositoryInterface,
    private readonly userContext: UserContext,
  ) {}

  async execute(data: CreateVaultInput) {
    const user = this.userContext.localUser;
    
    if (user?.planTier === 'FREE') {
      const vaults = await this.vaultsRepository.findAll();
      if (vaults.length >= 3) {
        throw new ForbiddenException(
          'O plano FREE permite apenas 3 cofrinhos ativos. Faça upgrade para o plano PRO para ter cofrinhos ilimitados.',
        );
      }
    }

    return this.vaultsRepository.create(data);
  }
}
