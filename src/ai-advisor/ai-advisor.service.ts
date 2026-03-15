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

  async chat(input: AiAdvisorChatRequestInput & { files?: Express.Multer.File[] }) {
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

    if (this.isMonthlyQuestion(input.message) && this.isGenericAssistantResponse(result.message)) {
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
        toolCalls: [...result.toolCalls, 'get_monthly_summary'],
        visualization,
        visualizations: [...result.visualizations, visualization],
      };
    }

    return result;
  }

  private buildConversationContents(input: AiAdvisorChatRequestInput & { files?: Express.Multer.File[] }) {
    const now = new Date();
    const today = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    return [
      {
        role: 'user',
        parts: [
          {
            text: 'Voce e o Boletinho, um assistente financeiro. Seja objetivo, amigavel e em portugues do Brasil. Quando receber dados de ferramentas, resuma em linguagem simples e acione insights acionaveis. Se o usuario enviar um comprovante (imagem), processe automaticamente e nao peca mais descricao. Nunca responda apenas com saudacao generica; responda de forma especifica ao pedido atual.',
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

  private async runModelLoop(contents: any[], tools: any[], files?: Express.Multer.File[]) {
    const visualizations: AiVisualization[] = [];
    const calledTools: string[] = [];

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

      if (!functionCalls.length) {
        finalText = text || 'Pronto. Aqui esta sua analise.';
        break;
      }

      contents.push({
        role: 'model',
        parts: functionCalls.map((call: any) => ({ functionCall: call })),
      });

      for (const functionCall of functionCalls) {
        const toolResult = await this.toolsService.executeTool(functionCall.name, functionCall.args || {}, files);
        calledTools.push(functionCall.name);
        visualizations.push(toolResult.visualization);

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

    return {
      message: finalText || 'Nao consegui concluir a analise agora. Tente novamente.',
      toolCalls: calledTools,
      visualization: visualizations.length > 0 ? visualizations[visualizations.length - 1] : null,
      visualizations,
    };
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
    return text.startsWith('ola! estou aqui para te ajudar') || text.includes('o que posso fazer por voce');
  }
}
