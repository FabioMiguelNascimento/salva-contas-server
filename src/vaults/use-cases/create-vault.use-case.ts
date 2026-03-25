import { Injectable } from '@nestjs/common';
import { CreateVaultInput } from 'src/schemas/vaults.schema';
import { VaultsRepositoryInterface } from '../vaults.interface';

@Injectable()
export class CreateVaultUseCase {
  constructor(private readonly vaultsRepository: VaultsRepositoryInterface) {}

  async execute(data: CreateVaultInput) {
    return this.vaultsRepository.create(data);
  }
}
