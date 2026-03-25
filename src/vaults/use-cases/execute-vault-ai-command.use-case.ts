import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VaultAiCommandInput } from 'src/schemas/vaults.schema';
import { VaultsRepositoryInterface } from '../vaults.interface';

type VaultHistoryEventType = 'deposit' | 'withdraw' | 'yield';

@Injectable()
export class ExecuteVaultAiCommandUseCase {
  constructor(private readonly vaultsRepository: VaultsRepositoryInterface) {}

  private async findVaultByNameOrThrow(name: string) {
    const normalized = name.trim().toLowerCase();
    const vaults = await this.vaultsRepository.findAll();

    let vault = vaults.find(
      (item) => item.name.trim().toLowerCase() === normalized,
    );
    if (!vault) {
      vault = vaults.find((item) =>
        item.name.trim().toLowerCase().includes(normalized),
      );
    }

    if (!vault) {
      const matching = vaults.find((item) =>
        normalized.includes(item.name.trim().toLowerCase()),
      );
      if (matching) {
        vault = matching;
      }
    }

    if (!vault) {
      throw new NotFoundException(`Cofrinho "${name}" não encontrado`);
    }

    return vault;
  }

  async execute(input: VaultAiCommandInput) {
    const rawText =
      input.text?.trim() ||
      input.command?.trim() ||
      input.message?.trim() ||
      '';

    if (!rawText) {
      throw new BadRequestException(
        'Comando de texto de IA não pode estar vazio',
      );
    }

    const textLower = rawText.toLowerCase();
    const amountMatch = textLower.match(/(\d+[\.,]?\d*)/);

    if (!amountMatch) {
      throw new BadRequestException('Valor não encontrado no comando de IA');
    }

    const amount = Number(amountMatch[1].replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Valor inválido no comando de IA');
    }

    const depositKeywords = [
      'adicion',
      'guarde',
      'deposit',
      'coloque',
      'poupe',
    ];
    const withdrawKeywords = ['resgate', 'retire', 'sacar', 'retirar'];
    const yieldKeywords = ['rendimento', 'juros', 'render', 'lucro'];

    let type: VaultHistoryEventType | null = null;

    if (depositKeywords.some((keyword) => textLower.includes(keyword))) {
      type = 'deposit';
    } else if (
      withdrawKeywords.some((keyword) => textLower.includes(keyword))
    ) {
      type = 'withdraw';
    } else if (yieldKeywords.some((keyword) => textLower.includes(keyword))) {
      type = 'yield';
    }

    if (!type) {
      throw new BadRequestException(
        'Tipo de ação não identificado no comando de IA',
      );
    }

    let vaultName: string | null = null;
    const vaultNameMatch = textLower.match(/cofrinho\s+([\w\sçãõéêáóíúàâ]+)$/);
    if (vaultNameMatch && vaultNameMatch[1]) {
      vaultName = vaultNameMatch[1].trim();
    } else {
      const potentialIndex = textLower.indexOf('cofrinho');
      if (potentialIndex !== -1) {
        const after = textLower
          .slice(potentialIndex + 'cofrinho'.length)
          .trim();
        const cleanedAfter = after
          .replace(/^(no|na|do|da)\s+/, '')
          .replace(/[\.\,;]*$/, '')
          .trim();
        if (cleanedAfter) {
          vaultName = cleanedAfter;
        }
      }
    }

    let vault;
    if (vaultName) {
      vault = await this.findVaultByNameOrThrow(vaultName);
    } else {
      const vaults = await this.vaultsRepository.findAll();
      if (vaults.length === 1) {
        vault = vaults[0];
      } else {
        throw new BadRequestException(
          'Nome do cofrinho não encontrado no comando de IA',
        );
      }
    }

    let actionAmount = amount;
    if (type === 'deposit') {
      await this.vaultsRepository.deposit(vault.id, { amount });
    } else if (type === 'withdraw') {
      await this.vaultsRepository.withdraw(vault.id, { amount });
      actionAmount = -amount;
    } else {
      await this.vaultsRepository.addYield(vault.id, { amount });
    }

    const updatedVault = await this.vaultsRepository.getVaultById(vault.id);
    if (!updatedVault) {
      throw new NotFoundException('Cofrinho não encontrado após operação');
    }

    return {
      vault: updatedVault,
      actionType: type,
      actionAmount,
    };
  }
}
