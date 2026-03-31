import { Inject, Injectable } from '@nestjs/common';
import { BaseAiTool } from './base-ai-tool';

@Injectable()
export class ToolRegistry {
  private readonly toolMap: Map<string, BaseAiTool<any>>;

  constructor(
    @Inject('AI_TOOLS_ARRAY') private readonly tools: BaseAiTool<any>[],
  ) {
    this.toolMap = new Map(tools.map((t) => [t.name, t]));
  }

  getTool(name: string) {
    return this.toolMap.get(name);
  }

  getAllTools() {
    return Array.from(this.toolMap.values());
  }

  getToolDefinitions() {
    return this.getAllTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.getJsonSchema(),
    }));
  }
}
