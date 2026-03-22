import { Injectable, Scope } from '@nestjs/common';
import { AiAdvisorChatRequestInput } from 'src/schemas/ai-advisor.schema';
import { AiAdvisorModelService } from './ai-advisor-model.service';
import { AiAdvisorToolsService } from './ai-advisor-tools.service';
import { AiVisualization } from './ai-advisor.types';

const MAX_MODEL_TURNS = 4;

@Injectable({ scope: Scope.REQUEST })
export class AiAdvisorService {
  constructor(
    private readonly modelService: AiAdvisorModelService,
    private readonly toolsService: AiAdvisorToolsService,
  ) {}

  async chat(
    input: AiAdvisorChatRequestInput & { files?: Express.Multer.File[] },
  ) {
    const contents = this.buildConversationContents(input);

    if (input.files?.length) {
      return this.toolsService.processAttachmentsAndReturn(input.files);
    }

    contents.push({
      role: 'user',
      parts: [{ text: input.message }],
    });

    const tools = this.toolsService.buildTools();
    const result = await this.runModelLoop(contents, tools, input.files);
    const filteredResult = this.filterVisualizationsByIntent(
      result,
      input.message,
    );

    if (
      this.isMonthlyQuestion(input.message) &&
      this.isGenericAssistantResponse(filteredResult.message)
    ) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const summary = await this.toolsService.getMonthlySummary(month, year);
      const visualization: AiVisualization = {
        type: 'table_summary',
        toolName: 'get_monthly_summary',
        title: `Resumo de ${month}/${year}`,
        payload: summary,
      };

      return {
        message: `Resumo de ${month}/${year}: Receitas R$ ${summary.totalIncome.toFixed(2)}, Despesas R$ ${summary.totalExpenses.toFixed(2)}, Saldo R$ ${summary.balance.toFixed(2)}.`,
        toolCalls: [...filteredResult.toolCalls, 'get_monthly_summary'],
        visualization,
        visualizations: [...filteredResult.visualizations, visualization],
      };
    }

    return filteredResult;
  }

  private filterVisualizationsByIntent(
    result: {
      message: string;
      toolCalls: string[];
      visualization: AiVisualization | null;
      visualizations: AiVisualization[];
    },
    userMessage: string,
  ) {
    const visualizations = (result.visualizations || []).filter((visual) =>
      this.shouldKeepVisualizationForMessage(visual, userMessage),
    );

    return {
      ...result,
      visualization:
        visualizations.length > 0
          ? visualizations[visualizations.length - 1]
          : null,
      visualizations,
    };
  }

  private shouldKeepVisualizationForMessage(
    visual: AiVisualization,
    message: string,
  ) {
    if ((visual.payload as any)?.requiresConfirmation) {
      return true;
    }

    const text = message.toLowerCase();

    if (visual.type === 'chart_donut') {
      return this.isCategoryQuestion(text);
    }

    if (visual.type === 'chart_line') {
      return this.isTrendQuestion(text);
    }

    return true;
  }

  private isCategoryQuestion(message: string) {
    return (
      message.includes('categoria') ||
      message.includes('categorias') ||
      message.includes('despesas por categoria') ||
      message.includes('gastos por categoria') ||
      message.includes('onde gasto') ||
      message.includes('maior despesa')
    );
  }

  private isTrendQuestion(message: string) {
    return (
      message.includes('tendencia') ||
      message.includes('evolucao') ||
      message.includes('ultimos dias') ||
      message.includes('ao longo')
    );
  }

  private buildConversationContents(
    input: AiAdvisorChatRequestInput & { files?: Express.Multer.File[] },
  ) {
    const now = new Date();
    const today = now.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    return [
      {
        role: 'user',
        parts: [
          {
            text: 'Voce e o Boletinho, um assistente financeiro. Seja objetivo, amigavel e em portugues do Brasil. Quando receber dados de ferramentas, resuma em linguagem simples e acione insights acionaveis. Se o usuario enviar um comprovante (imagem), processe automaticamente e nao peca mais descricao. Nunca responda apenas com saudacao generica; responda de forma especifica ao pedido atual. So chame get_expenses_by_category quando a pergunta mencionar categoria(s), maior categoria ou distribuicao de gastos. So chame get_spending_trend quando a pergunta pedir tendencia, evolucao temporal ou ultimos dias.',
          },
        ],
      },
      {
        role: 'user',
        parts: [
          {
            text: `Data atual: ${today}. Mes atual: ${currentMonth}. Ano atual: ${currentYear}. Use esses valores quando o usuario disser "este mes" ou "este ano".`,
          },
        ],
      },
      ...input.history.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
    ];
  }

  private async runModelLoop(
    contents: any[],
    tools: any[],
    files?: Express.Multer.File[],
  ) {
    const visualizations: AiVisualization[] = [];
    const calledTools: string[] = [];
    const toolResponseCache = new Map<
      string,
      { responseForModel: any; visualization: AiVisualization }
    >();

    let finalText = '';

    for (let i = 0; i < MAX_MODEL_TURNS; i++) {
      const result = await this.modelService.generateContent(contents, tools);
      const candidate = result.response?.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];

      const text = parts
        .map((part: any) => part.text)
        .filter(Boolean)
        .join('\n')
        .trim();

      const functionCalls = parts
        .map((part: any) => part.functionCall)
        .filter(Boolean);

      const normalizedFunctionCalls = functionCalls.map((call: any) => ({
        name: call?.name,
        args: call?.args ?? call?.arguments ?? {},
      }));

      if (!normalizedFunctionCalls.length) {
        finalText = text || 'Pronto. Aqui esta sua analise.';
        break;
      }

      contents.push({
        role: 'model',
        parts: normalizedFunctionCalls.map((call: any) => ({
          functionCall: call,
        })),
      });

      for (const functionCall of normalizedFunctionCalls) {
        const signature = `${functionCall.name}:${JSON.stringify(
          functionCall.args ?? {},
        )}`;

        let toolResult = toolResponseCache.get(signature);

        if (!toolResult) {
          const executed = await this.toolsService.executeTool(
            functionCall.name,
            functionCall.args,
            files,
          );

          toolResult = {
            responseForModel: executed.responseForModel,
            visualization: executed.visualization,
          };

          toolResponseCache.set(signature, toolResult);
          calledTools.push(functionCall.name);
          visualizations.push(executed.visualization);
        }

        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: functionCall.name,
                response: toolResult.responseForModel,
              },
            },
          ],
        });
      }
    }

    const uniqueVisualizations = this.deduplicateVisualizations(visualizations);

    return {
      message:
        finalText ||
        (uniqueVisualizations.length > 0
          ? 'Aqui estao os dados solicitados.'
          : 'Nao consegui concluir a analise agora. Tente novamente.'),
      toolCalls: calledTools,
      visualization:
        uniqueVisualizations.length > 0
          ? uniqueVisualizations[uniqueVisualizations.length - 1]
          : null,
      visualizations: uniqueVisualizations,
    };
  }

  private deduplicateVisualizations(visualizations: AiVisualization[]) {
    const seen = new Set<string>();

    return visualizations.filter((visual) => {
      const signature = `${visual.toolName}:${JSON.stringify(
        visual.payload ?? {},
      )}`;

      if (seen.has(signature)) {
        return false;
      }

      seen.add(signature);
      return true;
    });
  }

  private isMonthlyQuestion(message: string) {
    const text = message.toLowerCase();
    return (
      text.includes('este mes') ||
      text.includes('desse mes') ||
      text.includes('resumo do mes') ||
      text.includes('resumo desse mes')
    );
  }

  private isGenericAssistantResponse(message: string) {
    const text = message.toLowerCase().trim();
    return (
      text.startsWith('ola! estou aqui para te ajudar') ||
      text.includes('o que posso fazer por voce')
    );
  }
}
