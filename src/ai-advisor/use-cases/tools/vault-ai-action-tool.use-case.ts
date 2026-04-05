import { Injectable, Scope } from '@nestjs/common';
import { ToolVaultAiActionArgsSchema } from 'src/schemas/ai-advisor.schema';
import { ExecuteVaultAiCommandUseCase } from 'src/vaults/use-cases/execute-vault-ai-command.use-case';
import { z } from 'zod';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { BaseAiTool } from '../../tools/base-ai-tool';

@Injectable({ scope: Scope.REQUEST })
export class VaultAiActionToolUseCase extends BaseAiTool<
  typeof ToolVaultAiActionArgsSchema
> {
  readonly name = 'vault_ai_action';
  readonly description =
    'Executa uma ação de cofrinho. Prefira argumentos estruturados (action, amount, vaultName) e use description apenas como fallback.';
  readonly schema = ToolVaultAiActionArgsSchema;

  getJsonSchema() {
    return {
      type: 'OBJECT',
      properties: {
        action: {
          type: 'STRING',
          enum: ['deposit', 'withdraw', 'yield'],
          description: 'Ação de cofrinho a executar.',
        },
        amount: {
          type: 'NUMBER',
          description: 'Valor da ação (ex.: 2000 para 2 mil).',
        },
        vaultName: {
          type: 'STRING',
          description: 'Nome do cofrinho alvo.',
        },
        description: {
          type: 'STRING',
          description:
            'Fallback em linguagem natural quando não for possível preencher campos estruturados.',
        },
      },
      required: ['action', 'amount'],
    };
  }

  constructor(
    private readonly executeVaultAiCommand: ExecuteVaultAiCommandUseCase,
  ) {
    super();
  }

  async run(
    args: z.infer<typeof ToolVaultAiActionArgsSchema>,
  ): Promise<ToolExecutionResult> {
    const result = await this.executeVaultAiCommand.execute({
      text: args.description,
      actionType: args.action,
      amount: args.amount,
      vaultName: args.vaultName,
    });

    const currentAmount = Number(result.vault.currentAmount || 0);
    const targetAmount =
      result.vault.targetAmount == null
        ? null
        : Number(result.vault.targetAmount);
    const progressPercent =
      targetAmount && targetAmount > 0
        ? Math.min(100, (currentAmount / targetAmount) * 100)
        : 0;

    return {
      responseForModel: {
        success: true,
        action: result.actionType,
        amount: result.actionAmount,
        vaultName: result.vault.name,
        currentBalance: currentAmount,
        targetAmount,
        progressPercent,
      },
      visualization: {
        type: 'table_summary',
        toolName: this.name,
        title: 'Ação no Cofrinho',
        payload: {
          name: result.vault.name,
          actionType: result.actionType,
          actionAmount: result.actionAmount,
          currentAmount,
          targetAmount,
          progressPercent,
          color: result.vault.color,
          icon: result.vault.icon,
          items: [
            {
              vault: result.vault.name,
              action: result.actionType,
              amount: result.actionAmount,
              balance: currentAmount,
              targetAmount,
              progressPercent,
            },
          ],
        },
      },
    };
  }
}
