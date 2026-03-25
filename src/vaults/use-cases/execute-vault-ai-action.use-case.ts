import { BadRequestException, Injectable } from '@nestjs/common';
import { VaultAiActionInput } from 'src/schemas/vaults.schema';
import { VaultsRepositoryInterface } from '../vaults.interface';

@Injectable()
export class ExecuteVaultAiActionUseCase {
  constructor(private readonly vaultsRepository: VaultsRepositoryInterface) {}

  async execute(id: string, input: VaultAiActionInput) {
    switch (input.type) {
      case 'deposit':
        return this.vaultsRepository.deposit(id, { amount: input.amount });
      case 'withdraw':
        return this.vaultsRepository.withdraw(id, { amount: input.amount });
      case 'yield':
        return this.vaultsRepository.addYield(id, { amount: input.amount });
      default:
        throw new BadRequestException('Tipo de ação inválido');
    }
  }
}
