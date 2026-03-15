import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { GenAIServiceInterface, GenerateStructuredInput } from './gen-ai.interface';
import { GeminiGenAIProvider } from './providers/gemini-gen-ai.provider';
import { GroqGenAIProvider } from './providers/groq-gen-ai.provider';

@Injectable()
export class GenAIService implements GenAIServiceInterface {
  private readonly logger = new Logger(GenAIService.name);

  private readonly providersOrder = (process.env.GEN_AI_PROVIDER_ORDER || 'groq,gemini')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  constructor(
    private readonly geminiProvider: GeminiGenAIProvider,
    private readonly groqProvider: GroqGenAIProvider,
  ) {}

  async generateStructuredJson(input: GenerateStructuredInput): Promise<string> {
    const orderedProviders = this.getProvidersForInput(input);
    let lastError: any;

    for (const provider of orderedProviders) {
      const providerName = provider.constructor?.name || 'UnknownProvider';
      try {
        return await provider.generateStructuredJson(input);
      } catch (error: any) {
        lastError = error;
        const status = error?.status;

        if (status === 422) {
          this.logger.warn(`${providerName} skipped input (status 422). Trying next provider.`);
          continue;
        }

        if (status === 429 || status === 503) {
          this.logger.warn(`${providerName} rate limited/unavailable (status ${status}). Trying next provider.`);
          continue;
        }

        throw error;
      }
    }

    if (lastError?.status === 429 || lastError?.status === 503) {
      throw new ServiceUnavailableException({
        code: 'AI_RATE_LIMIT',
        message: 'Todos os provedores de IA estao temporariamente indisponiveis por cota/limite. Tente novamente em instantes.',
      });
    }

    if (lastError?.status === 422) {
      throw new ServiceUnavailableException({
        code: 'AI_UNSUPPORTED_INPUT',
        message: 'Os provedores de IA nao suportam esse tipo de entrada no momento.',
      });
    }

    throw lastError;
  }

  private getProvidersForInput(input: GenerateStructuredInput): Array<{ generateStructuredJson: (input: GenerateStructuredInput) => Promise<string> }> {
    const byName: Record<string, { generateStructuredJson: (input: GenerateStructuredInput) => Promise<string> }> = {
      groq: this.groqProvider,
      gemini: this.geminiProvider,
    };

    let ordered = this.providersOrder
      .map((name) => byName[name])
      .filter(Boolean);

    if (ordered.length === 0) {
      ordered = [this.groqProvider, this.geminiProvider];
    }

    const isPdf = !!input.file && ((input.file.originalname || '').toLowerCase().endsWith('.pdf') || input.file.mimetype === 'application/pdf');
    const isNonImageFile = !!input.file && !input.file.mimetype.startsWith('image/');

    if (isPdf || isNonImageFile) {
      ordered = [this.geminiProvider, ...ordered.filter((provider) => provider !== this.geminiProvider)];
    }

    return [...new Set(ordered)];
  }
}
