import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VaultAiCommandInput } from 'src/schemas/vaults.schema';
import { extractFirstAmountFromText } from 'src/utils/amount-parser';
import { VaultsRepositoryInterface } from '../vaults.interface';

type VaultHistoryEventType = 'deposit' | 'withdraw' | 'yield';

type StructuredVaultAiCommandInput = VaultAiCommandInput & {
  actionType?: VaultHistoryEventType;
  amount?: number;
  vaultName?: string;
};

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

  async execute(input: StructuredVaultAiCommandInput) {
    const rawText =
      input.text?.trim() ||
      input.command?.trim() ||
      input.message?.trim() ||
      '';

    const textLower = rawText.toLowerCase();
    const normalizedText = textLower
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const depositKeywords = [
      'adicion',
      'guarde',
      'deposit',
      'coloque',
      'poupe',
      'guardar',
    ];
    const withdrawKeywords = [
      'resgate',
      'resgatar',
      'retire',
      'retirar',
      'sacar',
      'saca',
      'saque',
      'remover',
      'remove',
      'remova',
      'remov',
      'tirar',
      'tira',
      'tire',
    ];
    const yieldKeywords = ['rendimento', 'juros', 'render', 'lucro', 'rende'];

    let type: VaultHistoryEventType | null = input.actionType ?? null;
    let amount: number | null =
      typeof input.amount === 'number' ? input.amount : null;
    let vaultName: string | null = input.vaultName?.trim() || null;

    if (type === null || amount === null) {
      if (!rawText) {
        throw new BadRequestException(
          'Informe action e amount ou um comando em texto.',
        );
      }

      const parsedAmount = extractFirstAmountFromText(textLower);
      if (parsedAmount === null) {
        throw new BadRequestException('Valor não encontrado no comando de IA');
      }

      amount = parsedAmount;

      if (depositKeywords.some((keyword) => normalizedText.includes(keyword))) {
        type = 'deposit';
      } else if (
        withdrawKeywords.some((keyword) => normalizedText.includes(keyword))
      ) {
        type = 'withdraw';
      } else if (yieldKeywords.some((keyword) => normalizedText.includes(keyword))) {
        type = 'yield';
      }
    }

    if (!type) {
      throw new BadRequestException(
        'Tipo de ação não identificado no comando de IA',
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Valor inválido no comando de IA');
    }

    if (!vaultName && rawText) {
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
