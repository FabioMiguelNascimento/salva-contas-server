import { Injectable, Logger } from '@nestjs/common';
import { ToolRegistry } from './tool-registry.service';
import { ToolExecutionResult } from '../ai-advisor.types';

type ExecuteResult =
  | ({ success: true } & ToolExecutionResult)
  | { success: false; error: string };

@Injectable()
export class ToolExecutor {
  private readonly logger = new Logger(ToolExecutor.name);

  constructor(private readonly registry: ToolRegistry) {}

  async execute(
    name: string,
    rawArgs: any,
    context?: any,
  ): Promise<ExecuteResult> {
    const tool = this.registry.getTool(name);
    if (!tool) {
      return { success: false, error: `Ferramenta '${name}' não encontrada.` };
    }

    const validation = tool.validate(rawArgs);
    if (!validation.isValid) {
      this.logger.warn(
        `Falha na validação da tool ${name}: ${validation.error}`,
      );
      return {
        success: false,
        error: validation.error ?? 'Error de validação desconhecido',
      };
    }

    try {
      const result = await tool.run(validation.data, context);
      return { success: true, ...result };
    } catch (error: any) {
      this.logger.error(`Erro ao executar tool ${name}`, error);
      return {
        success: false,
        error: error.message || 'Erro interno na ferramenta',
      };
    }
  }
}
