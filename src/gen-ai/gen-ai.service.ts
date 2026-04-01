import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  GenAIServiceInterface,
  GenerateStructuredInput,
} from './gen-ai.interface';
import { GeminiGenAIProvider } from './providers/gemini-gen-ai.provider';
import { GroqGenAIProvider } from './providers/groq-gen-ai.provider';
import pdfParse = require('pdf-parse');

@Injectable()
export class GenAIService implements GenAIServiceInterface {
  private readonly logger = new Logger(GenAIService.name);

  private readonly providersOrder = (
    process.env.GEN_AI_PROVIDER_ORDER || 'groq,gemini'
  )
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  constructor(
    private readonly geminiProvider: GeminiGenAIProvider,
    private readonly groqProvider: GroqGenAIProvider,
  ) {}

  async generateStructuredJson(
    input: GenerateStructuredInput,
  ): Promise<string> {
    const normalizedInput = await this.prepareInput(input);
    const orderedProviders = this.getProvidersForInput(normalizedInput);
    let lastError: any;

    for (const provider of orderedProviders) {
      const providerName = provider.constructor?.name || 'UnknownProvider';
      try {
        return await provider.generateStructuredJson(normalizedInput);
      } catch (error: any) {
        lastError = error;
        const status = error?.status;

        if (status === 422) {
          this.logger.warn(
            `${providerName} skipped input (status 422). Trying next provider.`,
          );
          continue;
        }

        if (status === 429 || status === 503) {
          this.logger.warn(
            `${providerName} rate limited/unavailable (status ${status}). Trying next provider.`,
          );
          continue;
        }

        throw error;
      }
    }

    if (lastError?.status === 429 || lastError?.status === 503) {
      throw new ServiceUnavailableException({
        code: 'AI_RATE_LIMIT',
        message:
          'Todos os provedores de IA estão temporariamente indisponíveis por cota/limite. Tente novamente em instantes.',
      });
    }

    if (lastError?.status === 422) {
      throw new ServiceUnavailableException({
        code: 'AI_UNSUPPORTED_INPUT',
        message:
          'Os provedores de IA não suportam esse tipo de entrada no momento.',
      });
    }
    throw lastError;
  }

  private async prepareInput(
    input: GenerateStructuredInput,
  ): Promise<GenerateStructuredInput> {
    if (!input.file) {
      return input;
    }

    const isPdf =
      input.file.mimetype === 'application/pdf' ||
      (input.file.originalname || '').toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      return input;
    }

    try {
      const PdfParseCtor = (pdfParse as any).PDFParse;
      const parser = new PdfParseCtor({ data: input.file.buffer });
      const pdfData = await parser.getText();
      await parser.destroy();
      const pdfText = this.normalizePdfText(pdfData.text);

      if (!pdfText) {
        this.logger.warn(
          'PDF recebido sem texto extraivel. Mantendo arquivo para o fluxo Gemini.',
        );
        return input;
      }

      const combinedText = this.mergeTextInput(
        input.textInput,
        [
          'O usuário enviou um comprovante/DANFE em PDF.',
          'Texto extraído do documento:',
          '--- INÍCIO DO TEXTO DO PDF ---',
          pdfText,
          '--- FIM DO TEXTO DO PDF ---',
          'Analise o texto acima e extraia os dados necessários em JSON estruturado.',
        ].join('\n'),
      );

      return {
        ...input,
        file: null,
        textInput: combinedText,
      };
    } catch (error: any) {
      this.logger.warn(
        `Falha ao extrair texto do PDF (${input.file.originalname || 'arquivo'}): ${error?.message ?? 'erro desconhecido'}`,
      );
      return input;
    }
  }

  private mergeTextInput(base?: string | null, extra?: string | null): string {
    const pieces = [base?.trim(), extra?.trim()].filter(Boolean);
    return pieces.join('\n\n');
  }

  private normalizePdfText(text: string): string {
    const normalized = text
      .replace(/\r/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const maxLength = 20000;
    if (normalized.length <= maxLength) {
      return normalized;
    }

    return `${normalized.slice(0, maxLength)}\n\n[Texto truncado por limite de contexto]`;
  }

  private getProvidersForInput(input: GenerateStructuredInput): Array<{
    generateStructuredJson: (input: GenerateStructuredInput) => Promise<string>;
  }> {
    const byName: Record<
      string,
      {
        generateStructuredJson: (
          input: GenerateStructuredInput,
        ) => Promise<string>;
      }
    > = {
      groq: this.groqProvider,
      gemini: this.geminiProvider,
    };

    let ordered = this.providersOrder
      .map((name) => byName[name])
      .filter(Boolean);

    if (ordered.length === 0) {
      ordered = [this.groqProvider, this.geminiProvider];
    }

    const isPdf =
      !!input.file &&
      ((input.file.originalname || '').toLowerCase().endsWith('.pdf') ||
        input.file.mimetype === 'application/pdf');
    const isNonImageFile =
      !!input.file && !input.file.mimetype.startsWith('image/');

    if (isPdf || isNonImageFile) {
      ordered = [this.geminiProvider];
    }

    return [...new Set(ordered)];
  }
}
