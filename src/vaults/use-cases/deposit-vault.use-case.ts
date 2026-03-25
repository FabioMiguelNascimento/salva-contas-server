import { Injectable } from '@nestjs/common';
import { VaultAmountInput } from 'src/schemas/vaults.schema';
import { VaultsRepositoryInterface } from '../vaults.interface';

@Injectable()
export class DepositVaultUseCase {
  constructor(private readonly vaultsRepository: VaultsRepositoryInterface) {}

  async execute(id: string, input: VaultAmountInput) {
    return this.vaultsRepository.deposit(id, input);
  }
}
