import { Injectable, Scope } from '@nestjs/common';
import { z } from 'zod';
import { ToolVaultAiActionArgsSchema } from 'src/schemas/ai-advisor.schema';
import { ExecuteVaultAiCommandUseCase } from 'src/vaults/use-cases/execute-vault-ai-command.use-case';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { BaseAiTool } from '../../tools/base-ai-tool';

@Injectable({ scope: Scope.REQUEST })
export class VaultAiActionToolUseCase extends BaseAiTool<
  typeof ToolVaultAiActionArgsSchema
> {
  readonly name = 'vault_ai_action';
  readonly description =
    'Executa uma ação de cofrinho (depositar/resgatar/rendimento) com base no texto.';
  readonly schema = ToolVaultAiActionArgsSchema;

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
    });

    return {
      responseForModel: {
        success: true,
        action: result.actionType,
        amount: result.actionAmount,
        vaultName: result.vault.name,
        currentBalance: result.vault.currentAmount,
      },
      visualization: {
        type: 'table_summary',
        toolName: this.name,
        title: 'Ação no Cofrinho',
        payload: {
          items: [
            {
              vault: result.vault.name,
              action: result.actionType,
              amount: result.actionAmount,
              balance: result.vault.currentAmount,
            },
          ],
        },
      },
    };
  }
}
