import { z } from 'zod';
import { ToolExecutionResult } from '../ai-advisor.types';

export abstract class BaseAiTool<T extends z.ZodObject<any>> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly schema: T;

  abstract run(args: z.infer<T>, context?: any): Promise<ToolExecutionResult>;

  async execute(rawArgs: any, context?: any): Promise<ToolExecutionResult> {
    const validation = this.validate(rawArgs);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    return this.run(validation.data, context);
  }

  validate(
    rawArgs: any,
  ): { isValid: false; error: string } | { isValid: true; data: z.infer<T> } {
    const result = this.schema.safeParse(rawArgs);
    if (!result.success) {
      const errorMsg = result.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      return { isValid: false, error: errorMsg };
    }
    return { isValid: true, data: result.data as z.infer<T> };
  }

  getJsonSchema() {
    const shape = this.schema.shape;
    const properties: any = {};
    const required: string[] = [];

    for (const key in shape) {
      const field = shape[key];
      const description = field.description || field._def.description || key;

      let type = 'STRING';
      const def = field._def;

      if (def.typeName === 'ZodNumber') {
        type = 'NUMBER';
      } else if (def.typeName === 'ZodBoolean') {
        type = 'BOOLEAN';
      }

      properties[key] = {
        type,
        description,
      };

      if (!field.isOptional()) {
        required.push(key);
      }
    }

    return {
      type: 'OBJECT',
      properties,
      required,
    };
  }
}
