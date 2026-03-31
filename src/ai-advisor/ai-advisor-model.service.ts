import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { GroqGenAIProvider } from 'src/gen-ai/providers/groq-gen-ai.provider';

@Injectable()
export class AiAdvisorModelService {
  private readonly logger = new Logger(AiAdvisorModelService.name);
  private readonly genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  private readonly modelName = process.env.AI_ADVISOR_MODEL;

  constructor(private readonly groqProvider: GroqGenAIProvider) {}

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

    // 1. Monta o histórico de conversa
    for (const c of contents) {
      for (const part of c.parts || []) {
        if (part.text) promptParts.push(part.text);
      }
    }

    const hasTools = tools && tools.length > 0;

    // 2. Só injeta instruções de ferramenta E de JSON se existirem ferramentas!
    if (hasTools) {
      promptParts.push('### FERRAMENTAS DISPONIVEIS:');
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
### INSTRUCOES ESTRITAS:
1) Retorne EXCLUSIVAMENTE um JSON valido. Nao adicione nenhum texto antes ou depois.
2) O formato obrigatorio e: {"message": "seu texto", "functionCalls": [{"name": "tool", "args": {}}]}
`);
    } else {
      // Se não há ferramentas, pede texto puro!
      promptParts.push(`
### INSTRUCOES FINAIS:
Responda de forma natural e amigável em texto puro (formato Markdown permitido). NÃO utilize formato JSON.
`);
    }

    const prompt = promptParts.join('\n\n');

    const text = await this.groqProvider.generateStructuredJson({
      prompt,
      textInput: '',
    });

    // 3. Se não pedimos ferramentas, a IA respondeu em texto normal. Retorna direto!
    if (!hasTools) {
      return {
        response: {
          candidates: [{ content: { parts: [{ text }] } }],
        },
      };
    }

    // 4. Se pedimos ferramentas, extraímos e validamos o JSON de forma mais inteligente
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
        'Fallback Groq retornou JSON invalido, retornando como texto puro.',
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
