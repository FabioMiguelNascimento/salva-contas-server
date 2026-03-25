import { Injectable } from '@nestjs/common';
import { VaultsRepositoryInterface } from '../vaults.interface';

@Injectable()
export class DeleteVaultUseCase {
  constructor(private readonly vaultsRepository: VaultsRepositoryInterface) {}

  async execute(id: string) {
    await this.vaultsRepository.delete(id);
  }
}
