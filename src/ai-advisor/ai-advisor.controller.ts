import { Body, Controller, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { AiAdvisorChatRequestInput, AiAdvisorChatRequestSchema } from 'src/schemas/ai-advisor.schema';
import { success } from 'src/utils/api-response-helper';
import { AiAdvisorService } from './ai-advisor.service';

@Controller('ai-advisor')
export class AiAdvisorController {
  constructor(private readonly aiAdvisorService: AiAdvisorService) {}

  @Post('chat')
  @UseInterceptors(FilesInterceptor('files'))
  async chat(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    const parsedBody = {
      ...body,
      history: typeof body.history === 'string' ? JSON.parse(body.history) : body.history,
    };

    const data = new ZodValidationPipe(AiAdvisorChatRequestSchema).transform(parsedBody) as AiAdvisorChatRequestInput;

    const response = await this.aiAdvisorService.chat({
      ...data,
      files,
    });

    return success(response, 'Resposta do assistente gerada com sucesso');
  }
}
