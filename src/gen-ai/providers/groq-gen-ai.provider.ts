import { Injectable, Logger } from '@nestjs/common';
import { GenerateStructuredInput } from '../gen-ai.interface';

@Injectable()
export class GroqGenAIProvider {
  private readonly logger = new Logger(GroqGenAIProvider.name);
  private readonly apiKey = process.env.GROQ_API_KEY || '';
  private readonly endpoint = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1/chat/completions';

  private readonly modelPool = (process.env.GROQ_TRANSACTION_MODELS || 'meta-llama/llama-4-scout-17b-16e-instruct')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  private readonly modelCooldownMs = Number(process.env.GROQ_TRANSACTION_MODEL_COOLDOWN_MS || 15000);

  private readonly modelCooldownUntil = new Map<string, number>();
  private readonly modelLastSuccess = new Map<string, number>();

  private getModelsToTry(): string[] {
    const unique = [...new Set(this.modelPool)];
    const now = Date.now();

    const available = unique.filter((model) => (this.modelCooldownUntil.get(model) || 0) <= now);
    const blocked = unique.filter((model) => !available.includes(model));

    const score = (model: string) => this.modelLastSuccess.get(model) || 0;
    available.sort((a, b) => score(b) - score(a));

    return available.length > 0 ? [...available, ...blocked] : unique;
  }

  private getRetryDelayMs(errorBody: any): number {
    const defaultDelay = this.modelCooldownMs;
    const message = typeof errorBody?.error?.message === 'string' ? errorBody.error.message : '';
    const match = message.match(/retry\s+in\s+([\d.]+)\s*ms/i);

    if (match) {
      const ms = Math.ceil(Number(match[1]));
      if (Number.isFinite(ms) && ms > 0) {
        return Math.max(ms, defaultDelay);
      }
    }

    return defaultDelay;
  }

  private buildGroqContent(input: GenerateStructuredInput): any[] {
    const content: any[] = [{ type: 'text', text: input.prompt }];

    if (input.textInput) {
      content.push({ type: 'text', text: `Contexto: ${input.textInput}` });
    }

    if (input.file && input.file.mimetype.startsWith('image/')) {
      const base64 = input.file.buffer.toString('base64');
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${input.file.mimetype};base64,${base64}`,
        },
      });
    }

    if (input.file && !input.file.mimetype.startsWith('image/')) {
      // Groq vision handles images. For non-image files (e.g. PDF), caller should fallback to Gemini.
      throw Object.assign(new Error('Groq provider supports image inputs only for vision.'), { status: 422 });
    }

    return content;
  }

  async generateStructuredJson(input: GenerateStructuredInput): Promise<string> {
    if (!this.apiKey) {
      throw Object.assign(new Error('GROQ_API_KEY not configured'), { status: 401 });
    }

    const content = this.buildGroqContent(input);
    const modelsToTry = this.getModelsToTry();
    let lastError: unknown;

    for (const modelName of modelsToTry) {
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              {
                role: 'user',
                content,
              },
            ],
            temperature: 0.1,
            max_tokens: 900,
          }),
        });

        const data: any = await response.json().catch(() => ({}));
        if (!response.ok) {
          const error = Object.assign(new Error(data?.error?.message || `Groq request failed: ${response.status}`), {
            status: response.status,
            errorBody: data,
            name: 'GroqAPIError',
          });
          throw error;
        }

        const text = data?.choices?.[0]?.message?.content;
        if (!text || typeof text !== 'string') {
          throw Object.assign(new Error('Groq returned empty content'), { status: 502, name: 'GroqAPIError' });
        }

        this.modelLastSuccess.set(modelName, Date.now());
        this.modelCooldownUntil.delete(modelName);
        return text.replace(/```json|```/g, '').trim();
      } catch (error: any) {
        lastError = error;
        const status = error?.status;
        if (status === 429 || status === 503) {
          const retryMs = this.getRetryDelayMs(error?.errorBody);
          this.modelCooldownUntil.set(modelName, Date.now() + retryMs);
          this.logger.warn(`Groq indisponivel (${modelName}) - status ${status}. Cooldown ${retryMs}ms.`);
          continue;
        }
        throw error;
      }
    }

    throw lastError;
  }
}
