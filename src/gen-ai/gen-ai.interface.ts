export const GEN_AI_SERVICE = Symbol('GEN_AI_SERVICE');

export type GenerateStructuredInput = {
  prompt: string;
  textInput?: string | null;
  file?: {
    buffer: Buffer;
    mimetype: string;
    originalname?: string;
  } | null;
};

export abstract class GenAIServiceInterface {
  abstract generateStructuredJson(input: GenerateStructuredInput): Promise<string>;
}
