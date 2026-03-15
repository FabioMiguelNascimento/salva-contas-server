import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { GroqGenAIProvider } from 'src/gen-ai/providers/groq-gen-ai.provider';

@Injectable()
export class AiAdvisorModelService {
  private readonly logger = new Logger(AiAdvisorModelService.name);
  private readonly genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  private readonly modelName = process.env.AI_ADVISOR_MODEL || 'gemini-2.5-flash';

  constructor(private readonly groqProvider: GroqGenAIProvider) {}

  async generateContent(contents: any[], tools: any[]) {
    const model = this.genAI.getGenerativeModel({ model: this.modelName });

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

  private async generateContentWithGroqFallback(contents: any[], tools: any[]) {
    const promptParts: string[] = [];

    for (const c of contents) {
      for (const part of c.parts || []) {
        if (part.text) promptParts.push(part.text);
      }
    }

    promptParts.push('### FERRAMENTAS DISPONIVEIS:');
    for (const tool of tools[0]?.functionDeclarations ?? []) {
      promptParts.push(`- ${tool.name}: ${tool.description}`);
    }

    promptParts.push(`
### INSTRUCOES:
1) Retorne apenas um JSON valido.
2) O JSON deve ter duas chaves: message e functionCalls.
3) message e o texto da resposta.
4) functionCalls e uma lista de objetos { name, arguments }.
5) Nao coloque mais nada fora do JSON.
`);

    const prompt = promptParts.join('\n\n');

    const text = await this.groqProvider.generateStructuredJson({
      prompt,
      textInput: '',
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : text;

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      this.logger.warn('Fallback Groq retornou JSON invalido, retornando como texto puro.');
      return {
        response: {
          candidates: [
            {
              content: {
                parts: [{ text }],
              },
            },
          ],
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
                  ? parsed.functionCalls.map((fn: any) => ({ functionCall: fn }))
                  : []),
              ],
            },
          },
        ],
      },
    };
  }
}
