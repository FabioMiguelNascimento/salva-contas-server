import { Injectable } from '@nestjs/common';
import { VaultsRepositoryInterface } from '../vaults.interface';

@Injectable()
export class GetVaultsSummaryUseCase {
  constructor(private readonly vaultsRepository: VaultsRepositoryInterface) {}

  async execute() {
    const vaults = await this.vaultsRepository.findAll();
    const totalSaved = vaults.reduce(
      (sum, vault) => sum + (vault.currentAmount?.toNumber() ?? 0),
      0,
    );
    const totalTarget = vaults.reduce(
      (sum, vault) => sum + (vault.targetAmount?.toNumber() ?? 0),
      0,
    );

    const metrics = {
      financials: {
        income: totalSaved,
        expenses: 0,
        balance: totalSaved,
        availableBalance: totalSaved,
        savedAmount: totalSaved,
      },
      pendingBills: {
        count: 0,
        totalAmount: 0,
        overdue: 0,
      },
      categoryBreakdown: [],
      lastUpdated: new Date().toISOString(),
    };

    return {
      vaults,
      metrics,
      totals: {
        totalVaults: vaults.length,
        totalTarget,
      },
    };
  }
}
