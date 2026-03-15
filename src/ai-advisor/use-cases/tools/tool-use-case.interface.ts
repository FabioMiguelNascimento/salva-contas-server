import { ToolExecutionResult } from '../../ai-advisor.types';

export type ToolExecutionContext = {
  files?: Express.Multer.File[];
};

export interface AiAdvisorToolUseCase {
  readonly name: string;
  execute(rawArgs: Record<string, any>, context?: ToolExecutionContext): Promise<ToolExecutionResult>;
}
