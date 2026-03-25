import { Injectable } from '@nestjs/common';
import { UpdateVaultInput } from 'src/schemas/vaults.schema';
import { VaultsRepositoryInterface } from '../vaults.interface';

@Injectable()
export class UpdateVaultUseCase {
  constructor(private readonly vaultsRepository: VaultsRepositoryInterface) {}

  async execute(id: string, data: UpdateVaultInput) {
    return this.vaultsRepository.update(id, data);
  }
}
