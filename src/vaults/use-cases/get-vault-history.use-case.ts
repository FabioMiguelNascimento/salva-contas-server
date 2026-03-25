import { Injectable } from '@nestjs/common';
import { GetVaultHistoryInput } from 'src/schemas/vaults.schema';
import { VaultsRepositoryInterface } from '../vaults.interface';

@Injectable()
export class GetVaultHistoryUseCase {
  constructor(private readonly vaultsRepository: VaultsRepositoryInterface) {}

  async execute(id: string, query: GetVaultHistoryInput) {
    return this.vaultsRepository.getHistory(id, query);
  }
}
