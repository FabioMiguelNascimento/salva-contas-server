export type AiVisualizationType = 'chart_donut' | 'chart_line' | 'table_summary' | 'transaction';

export type AiVisualization = {
  type: AiVisualizationType;
  toolName: string;
  title: string;
  payload: Record<string, any>;
};

export type ToolExecutionResult = {
  responseForModel: Record<string, any>;
  visualization: AiVisualization;
};

export type ToolEntry = {
  name: string;
  description: string;
  parameters: Record<string, any>;
};
