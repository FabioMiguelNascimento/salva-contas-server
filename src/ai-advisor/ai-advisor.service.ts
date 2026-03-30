import { Injectable, Scope } from '@nestjs/common';
import { UserContext } from 'src/auth/user-context.service';
import { PLAN_LIMITS } from 'src/config/plan-limits.config';
import { AiAdvisorChatRequestInput } from 'src/schemas/ai-advisor.schema';
import { UsageService } from 'src/usage/usage.service';
import { AiAdvisorModelService } from './ai-advisor-model.service';
import { AiAdvisorToolsService } from './ai-advisor-tools.service';
import { AiVisualization } from './ai-advisor.types';

const MAX_MODEL_TURNS = 4;

@Injectable({ scope: Scope.REQUEST })
export class AiAdvisorService {
  constructor(
    private readonly modelService: AiAdvisorModelService,
    private readonly toolsService: AiAdvisorToolsService,
    private readonly usageService: UsageService,
    private readonly userContext: UserContext,
  ) {}

  async chat(
    input: AiAdvisorChatRequestInput & { files?: Express.Multer.File[] },
  ) {
    // 1. Verificar e incrementar cota de uso IA
    const localUser = await this.userContext.localUser;
    if (!localUser) {
      throw new Error('Usuário não autenticado.');
    }

    await this.usageService.checkAndIncrementUsage(
      this.userContext.actorUserId,
      localUser.planTier,
      'IA',
    );

    const planLimits = PLAN_LIMITS[localUser.planTier];
    const aiModelName =
      planLimits.aiModel === 'BASIC'
        ? process.env.AI_ADVISOR_BASIC_MODEL || 'gemini-2.5-flash'
        : process.env.AI_ADVISOR_ADVANCED_MODEL || 'gemini-3.5-pro';

    const contents = this.buildConversationContents(input);

    if (input.files?.length) {
      return this.toolsService.processAttachmentsAndReturn(input.files);
    }

    contents.push({
      role: 'user',
      parts: [{ text: input.message }],
    });

    const tools = this.toolsService.buildTools();
    const result = await this.runModelLoop(
      contents,
      tools,
      input.files,
      aiModelName,
    );

    return result;
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
            text: 'Voce e o Boletinho, um assistente financeiro. Seja objetivo, amigavel e em portugues do Brasil. Quando receber dados de ferramentas, resuma em linguagem simples e acione insights acionaveis. Se o usuario enviar um comprovante (imagem), processe automaticamente e nao peca mais descricao. Nunca responda apenas com saudacao generica; responda de forma especifica ao pedido atual. Para registrar por texto sem anexo, use create_transaction. Para extrair dados de comprovante com anexo, use process_transaction_receipt. So chame get_expenses_by_category quando a pergunta mencionar categoria(s), maior categoria ou distribuicao de gastos. So chame get_spending_trend quando a pergunta pedir tendencia, evolucao temporal ou ultimos dias.',
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
    aiModelName?: string,
  ) {
    const visualizations: AiVisualization[] = [];
    const calledTools: string[] = [];
    const toolResponseCache = new Map<
      string,
      { responseForModel: any; visualization: AiVisualization }
    >();

    let finalText = '';

    for (let i = 0; i < MAX_MODEL_TURNS; i++) {
      const result = await this.modelService.generateContent(
        contents,
        tools,
        aiModelName,
      );
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
      message: finalText,
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
}
