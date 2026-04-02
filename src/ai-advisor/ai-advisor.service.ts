import { Injectable, Scope } from '@nestjs/common';
import { UserContext } from 'src/auth/user-context.service';
import { PLAN_LIMITS } from 'src/config/plan-limits.config';
import { AiAdvisorChatRequestInput } from 'src/schemas/ai-advisor.schema';
import { UsageService } from 'src/usage/usage.service';
import { AiAdvisorModelService } from './ai-advisor-model.service';
import { AiAdvisorToolsService } from './ai-advisor-tools.service';
import { AiVisualization } from './ai-advisor.types';
import { ToolExecutor } from './tools/tool-executor.service';

const MAX_MODEL_TURNS = 4;

@Injectable({ scope: Scope.REQUEST })
export class AiAdvisorService {
  constructor(
    private readonly modelService: AiAdvisorModelService,
    private readonly toolsService: AiAdvisorToolsService,
    private readonly toolExecutor: ToolExecutor,
    private readonly usageService: UsageService,
    private readonly userContext: UserContext,
  ) {}

  async chat(
    input: AiAdvisorChatRequestInput & { files?: Express.Multer.File[] },
  ) {
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
        ? process.env.AI_ADVISOR_BASIC_MODEL
        : process.env.AI_ADVISOR_ADVANCED_MODEL;

    const contents = this.buildConversationContents(input);

    let finalMessage = input.message || '';
    if (input.files?.length) {
      const filesCount = input.files.length;
      finalMessage += `${finalMessage ? '\n\n' : ''}[SISTEMA]: O usuário anexou ${filesCount} arquivo(s). Chame a ferramenta 'process_transaction_receipt' passando o 'fileIndex' correspondente (de 0 até ${filesCount - 1}) para extrair e registrar os dados.`;
    }

    contents.push({
      role: 'user',
      parts: [{ text: finalMessage }],
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
            text: `Você é o Boletinho, um assistente financeiro inteligente do app Salva Contas. Seja objetivo, amigável e responda em português do Brasil.

REGRAS CRÍTICAS DE COMPORTAMENTO:
1. NUNCA mencione nomes técnicos de ferramentas, funções ou comandos (ex: create_transaction, process_transaction_receipt) para o usuário. O uso de ferramentas deve ser 100% invisível para ele.
2. Se você acabou de chamar uma ferramenta e recebeu os dados de volta (como o resumo financeiro), USE esses dados para formular sua resposta. Jamais diga que "precisa de mais informações" se os dados já estiverem no histórico.
3. Se precisar de alguma informação, peça naturalmente, como um humano. Ex: "Você pode me dizer o valor e a data dessa compra?" (NÃO peça para ele usar comandos).
4. Nunca responda apenas com uma saudação genérica; responda de forma específica ao pedido atual e comente os números que a ferramenta trouxe de forma prestativa.
5. REFERÊNCIAS A LISTAS: Se o usuário pedir detalhes sobre um item que você acabou de listar (ex: "a primeira", "a segunda", "essa de compras"), procure o ID (UUID) exato desse item no histórico da ferramenta anterior. Use a ferramenta 'get_transaction_details' passando APENAS o 'transactionId' correspondente. NUNCA coloque palavras relativas (como "primeira") no campo 'query'.`,
          },
        ],
      },
      {
        role: 'user',
        parts: [
          {
            text: `Data atual: ${today}. Mês atual: ${currentMonth}. Ano atual: ${currentYear}. Use esses valores quando o usuário disser "este mês" ou "este ano".`,
          },
        ],
      },
      ...input.history
        .filter(
          (msg) =>
            typeof msg.content === 'string' && msg.content.trim().length > 0,
        )
        .map((msg) => ({
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
    const executedToolSignatures = new Set<string>();
    const toolResponseCache = new Map<
      string,
      { responseForModel: any; visualization: AiVisualization }
    >();

    let finalText = '';

    for (let i = 0; i < MAX_MODEL_TURNS; i++) {
      const currentTools = calledTools.length > 0 ? undefined : tools;

      const result = await this.modelService.generateContent(
        contents,
        currentTools!,
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
        finalText = text;
        break;
      }

      const repeatedCycle = normalizedFunctionCalls.every((call) => {
        const signature = `${call.name}:${JSON.stringify(call.args ?? {})}`;
        return executedToolSignatures.has(signature);
      });

      if (repeatedCycle) {
        contents.push({
          role: 'user',
          parts: [
            {
              text: 'Erro: Você já chamou esta ferramenta com os mesmos argumentos. Por favor, analise a resposta anterior e dê uma resposta final em texto para o usuário, sem chamar ferramentas.',
            },
          ],
        });
        continue;
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
          const executed = await this.toolExecutor.execute(
            functionCall.name,
            functionCall.args,
            { files },
          );
          if (!executed.success) {
            contents.push({
              role: 'user',
              parts: [
                {
                  functionResponse: {
                    name: functionCall.name,
                    response: {
                      error: `A ferramenta retornou o seguinte erro: ${executed.error}`,
                    },
                  },
                },
              ],
            });
            continue;
          }

          // Agora o TypeScript sabe que executed.success é true
          const successResult = executed;

          toolResult = {
            responseForModel: successResult.responseForModel,
            visualization: successResult.visualization,
          };

          toolResponseCache.set(signature, toolResult);
          executedToolSignatures.add(signature);
          if (!calledTools.includes(functionCall.name)) {
            calledTools.push(functionCall.name);
          }
          visualizations.push(successResult.visualization);
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

    let responseMessage = finalText?.trim() ? finalText : '';

    if (!responseMessage && calledTools.length > 0) {
      responseMessage =
        'Operações de ferramenta executadas com sucesso. Veja os dados gerados nas visualizações abaixo.';
    }

    if (!responseMessage) {
      responseMessage =
        'Resposta da IA indisponível no momento, tente novamente.';
    }

    return {
      message: responseMessage,
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
