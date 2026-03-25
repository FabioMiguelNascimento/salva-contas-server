import { Injectable, Scope } from '@nestjs/common';
import { ToolVaultAiActionArgsSchema } from 'src/schemas/ai-advisor.schema';
import { ExecuteVaultAiCommandUseCase } from 'src/vaults/use-cases/execute-vault-ai-command.use-case';
import { ToolExecutionResult } from '../../ai-advisor.types';
import { AiAdvisorToolUseCase } from './tool-use-case.interface';

@Injectable({ scope: Scope.REQUEST })
export class VaultAiActionToolUseCase implements AiAdvisorToolUseCase {
  readonly name = 'vault_ai_action';

  constructor(
    private readonly executeVaultAiCommandUseCase: ExecuteVaultAiCommandUseCase,
  ) {}

  async execute(rawArgs: Record<string, any>): Promise<ToolExecutionResult> {
    const args = ToolVaultAiActionArgsSchema.parse(rawArgs);

    const result = await this.executeVaultAiCommandUseCase.execute({
      text: args.text,
    });

    const vault = result.vault;

    return {
      responseForModel: {
        message: `Cofrinho atualizado: ${vault.name} (${vault.id})`,
        vault,
      },
      visualization: {
        type: 'table_summary',
        toolName: this.name,
        title: `Cofrinho atualizado: ${vault.name}`,
        payload: {
          id: vault.id,
          name: vault.name,
          currentAmount: vault.currentAmount,
          targetAmount: vault.targetAmount,
          color: vault.color,
          icon: vault.icon,
          actionType: result.actionType || 'deposit',
          actionAmount: result.actionAmount ?? 0,
        },
      },
    };
  }
}
