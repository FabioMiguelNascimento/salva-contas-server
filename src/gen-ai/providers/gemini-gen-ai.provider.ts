import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { GenerateStructuredInput } from '../gen-ai.interface';

@Injectable()
export class GeminiGenAIProvider {
  private readonly logger = new Logger(GeminiGenAIProvider.name);
  private readonly client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  private readonly modelName = process.env.GEMINI_TRANSACTION_MODEL || 'gemini-2.5-flash';
  private readonly fallbackModels = (process.env.GEMINI_TRANSACTION_FALLBACK_MODELS || 'gemini-1.5-flash,gemini-2.0-flash-lite')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  private readonly modelPool = (process.env.GEMINI_TRANSACTION_MODELS || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  private readonly modelCooldownMs = Number(process.env.GEMINI_TRANSACTION_MODEL_COOLDOWN_MS || 15000);

  private readonly modelCooldownUntil = new Map<string, number>();
  private readonly modelLastSuccess = new Map<string, number>();

  private uniqueModels(models: string[]): string[] {
    return [...new Set(models.filter(Boolean))];
  }

  private getModelsToTry(): string[] {
    const baseModels = this.modelPool.length > 0 ? this.modelPool : [this.modelName, ...this.fallbackModels];
    const ordered = this.uniqueModels(baseModels);
    const now = Date.now();

    const available = ordered.filter((model) => (this.modelCooldownUntil.get(model) || 0) <= now);
    const blocked = ordered.filter((model) => !available.includes(model));

    const score = (model: string) => this.modelLastSuccess.get(model) || 0;
    available.sort((a, b) => score(b) - score(a));

    return available.length > 0 ? [...available, ...blocked] : ordered;
  }

  private getRetryDelayMs(error: any): number {
    const defaultDelay = this.modelCooldownMs;

    const message: string = error?.message || '';
    const retryMsMatch = message.match(/Please retry in\s+([\d.]+)ms/i);
    if (retryMsMatch) {
      const retryMs = Math.ceil(Number(retryMsMatch[1]));
      if (Number.isFinite(retryMs) && retryMs > 0) {
        return Math.max(retryMs, defaultDelay);
      }
    }

    const retryInfo = Array.isArray(error?.errorDetails)
      ? error.errorDetails.find((d: any) => d?.['@type']?.includes('RetryInfo'))
      : null;
    const retryDelay = retryInfo?.retryDelay;
    if (typeof retryDelay === 'string') {
      const secMatch = retryDelay.match(/([\d.]+)s/);
      if (secMatch) {
        const sec = Number(secMatch[1]);
        if (Number.isFinite(sec) && sec >= 0) {
          return Math.max(Math.ceil(sec * 1000), defaultDelay);
        }
      }
    }

    return defaultDelay;
  }

  async generateStructuredJson(input: GenerateStructuredInput): Promise<string> {
    const payload: any[] = [input.prompt];

    if (input.file) {
      let finalMimeType = input.file.mimetype;
      if ((input.file.originalname || '').toLowerCase().endsWith('.pdf')) {
        finalMimeType = 'application/pdf';
      }

      payload.push({
        inlineData: {
          data: input.file.buffer.toString('base64'),
          mimeType: finalMimeType,
        },
      });
    }

    if (input.textInput) {
      payload.push(`Contexto: ${input.textInput}`);
    }

    const modelsToTry = this.getModelsToTry();
    let lastError: unknown;

    for (const modelName of modelsToTry) {
      try {
        const model = this.client.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(payload);
        this.modelLastSuccess.set(modelName, Date.now());
        this.modelCooldownUntil.delete(modelName);
        return result.response.text().replace(/```json|```/g, '').trim();
      } catch (error: any) {
        lastError = error;
        const status = error?.status;
        if (status === 429 || status === 503) {
          const retryMs = this.getRetryDelayMs(error);
          this.modelCooldownUntil.set(modelName, Date.now() + retryMs);
          this.logger.warn(`Gemini indisponivel (${modelName}) - status ${status}. Cooldown ${retryMs}ms.`);
          continue;
        }
        throw error;
      }
    }

    throw lastError;
  }
}
