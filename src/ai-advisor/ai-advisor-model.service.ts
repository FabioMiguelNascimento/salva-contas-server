import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { GroqGenAIProvider } from 'src/gen-ai/providers/groq-gen-ai.provider';

@Injectable()
export class AiAdvisorModelService {
  private readonly logger = new Logger(AiAdvisorModelService.name);
  private readonly genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  private readonly modelName = process.env.AI_ADVISOR_MODEL;

  constructor(private readonly groqProvider: GroqGenAIProvider) { }

  async generateContent(contents: any[], tools: any[], modelName?: string) {
    const selectedModel = modelName || this.modelName;
    if (!selectedModel) {
      throw new Error('Nenhum modelo de IA configurado no ambiente (.env).');
    }
    const model = this.genAI.getGenerativeModel({ model: selectedModel });

    try {
      return await model.generateContent({ contents, tools } as any);
    } catch (error: any) {
      const status = error?.status;
      if (status === 429 || status === 503) {
        return this.generateContentWithGroqFallback(contents, tools);
      }
      throw error;
    }
  }

  private async generateContentWithGroqFallback(
    contents: any[],
    tools?: any[],
  ) {
    const promptParts: string[] = [];

    promptParts.push('### HISTÓRICO DA CONVERSA:');
    for (const c of contents) {
      const roleName = c.role === 'model' ? 'Boletinho (Você)' : 'Usuário';

      for (const part of c.parts || []) {
        if (part.text) {
          promptParts.push(`[${roleName}]: ${part.text}`);
        } else if (part.functionCall) {
          promptParts.push(
            `[SISTEMA]: Você chamou a ferramenta '${part.functionCall.name}'.`,
          );
        } else if (part.functionResponse) {
          promptParts.push(
            `[SISTEMA - RETORNO DA FERRAMENTA '${part.functionResponse.name}']: ${JSON.stringify(part.functionResponse.response)}`,
          );
        }
      }
    }

    const hasTools = tools && tools.length > 0;

    if (hasTools) {
      promptParts.push('### FERRAMENTAS DISPONÍVEIS:');
      for (const tool of tools[0]?.functionDeclarations ?? []) {
        promptParts.push(`- ${tool.name}: ${tool.description}`);
        if (tool.parameters) {
          promptParts.push(
            `  Parâmetros: ${JSON.stringify(tool.parameters.properties)}`,
          );
          promptParts.push(
            `  Obrigatórios: ${JSON.stringify(tool.parameters.required)}`,
          );
        }
      }

      promptParts.push(`
        ### REGRAS DE SAÍDA (CRÍTICO):
        1. Você é o motor de um sistema automatizado. É ESTRITAMENTE PROIBIDO gerar tutoriais, exemplos, passo-a-passo, explicações ou qualquer texto fora do JSON.
        2. A sua única saída permitida é um ÚNICO OBJETO JSON VÁLIDO e nada mais.
        3. Leia o histórico acima e responda à última interação do usuário preenchendo o formato EXATO abaixo:

        {
          "message": "Sua resposta falada para o usuário (como assistente Boletinho)",
          "functionCalls": [
            {
              "name": "nome_da_ferramenta",
              "args": { "chave": "valor" }
            }
          ]
        }

        Se não precisar de ferramentas, envie "functionCalls": [].
        NUNCA escreva nada antes ou depois das chaves { }.
        `);
            } else {
              promptParts.push(`
        ### INSTRUÇÕES FINAIS:
        Responda de forma natural e amigável em texto puro (formato Markdown permitido). NÃO utilize formato JSON.
        `);
    }

    const prompt = promptParts.join('\n\n');

    const text = await this.groqProvider.generateStructuredJson({
      prompt,
      textInput: '',
    });

    if (!hasTools) {
      return {
        response: {
          candidates: [{ content: { parts: [{ text }] } }],
        },
      };
    }

    let parsed: any;
    try {
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      const jsonText =
        firstBrace !== -1 && lastBrace !== -1
          ? text.substring(firstBrace, lastBrace + 1)
          : text;

      parsed = JSON.parse(jsonText);
    } catch {
      this.logger.warn(
        'Fallback Groq retornou JSON inválido, retornando como texto puro.',
      );
      return {
        response: {
          candidates: [{ content: { parts: [{ text }] } }],
        },
      };
    }

    return {
      response: {
        candidates: [
          {
            content: {
              parts: [
                { text: parsed.message || '' },
                ...(Array.isArray(parsed.functionCalls)
                  ? parsed.functionCalls.map((fn: any) => ({
                    functionCall: {
                      name: fn?.name,
                      args: fn?.args ?? fn?.arguments ?? {},
                    },
                  }))
                  : []),
              ],
            },
          },
        ],
      },
    };
  }
}
