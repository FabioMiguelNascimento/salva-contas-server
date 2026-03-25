import { Injectable } from '@nestjs/common';
import { VaultsRepositoryInterface } from '../vaults.interface';

@Injectable()
export class GetVaultsUseCase {
  constructor(private readonly vaultsRepository: VaultsRepositoryInterface) {}

  async execute() {
    return this.vaultsRepository.findAll();
  }
}
