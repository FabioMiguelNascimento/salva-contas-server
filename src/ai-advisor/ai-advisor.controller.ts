import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PlanTier } from 'generated/prisma/enums';
import { AllowedPlans } from 'src/auth/decorators/allowed-plans.decorator';
import { RequirePlanGuard } from 'src/auth/guards/require-plan.guard';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import {
  AiAdvisorChatRequestInput,
  AiAdvisorChatRequestSchema,
} from 'src/schemas/ai-advisor.schema';
import { success } from 'src/utils/api-response-helper';
import { AiAdvisorService } from './ai-advisor.service';

@Controller('ai-advisor')
export class AiAdvisorController {
  constructor(private readonly aiAdvisorService: AiAdvisorService) {}

  @Post('chat')
  @UseGuards(RequirePlanGuard)
  @AllowedPlans(PlanTier.PRO, PlanTier.FAMILY)
  @UseInterceptors(FilesInterceptor('files'))
  async chat(
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    const parsedBody = {
      ...body,
      history:
        typeof body.history === 'string'
          ? JSON.parse(body.history)
          : body.history,
    };

    const data = new ZodValidationPipe(AiAdvisorChatRequestSchema).transform(
      parsedBody,
    ) as AiAdvisorChatRequestInput;

    const response = await this.aiAdvisorService.chat({
      ...data,
      files,
    });

    return success(response, 'Resposta do assistente gerada com sucesso');
  }
}
