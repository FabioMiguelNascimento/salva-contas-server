import {
  Controller,
  Get,
  Header,
  Logger,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { PlanTier } from 'generated/prisma/enums';
import { AllowedPlans } from 'src/auth/decorators/allowed-plans.decorator';
import { RequirePlanGuard } from 'src/auth/guards/require-plan.guard';
import { UserContext } from 'src/auth/user-context.service';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import {
  ExportReportParamsInput,
  ExportReportParamsSchema,
  ExportReportQueryInput,
  ExportReportQuerySchema,
  PreviewReportQueryInput,
  PreviewReportQuerySchema,
} from 'src/schemas/reports.schema';
import { success } from 'src/utils/api-response-helper';
import { ExportReportUseCase } from './use-cases/export-report.use-case';

@Controller('reports')
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(
    private readonly exportReportUseCase: ExportReportUseCase,
    private readonly userContext: UserContext,
  ) {}

  @Get(':feature/preview')
  async previewReport(
    @Param(new ZodValidationPipe(ExportReportParamsSchema))
    params: ExportReportParamsInput,
    @Query(new ZodValidationPipe(PreviewReportQuerySchema))
    query: PreviewReportQueryInput,
  ) {
    try {
      const result = await this.exportReportUseCase.preview(
        this.userContext.userId,
        params.feature,
        query,
      );

      return success(result, 'Prévia do relatório carregada com sucesso');
    } catch (error: any) {
      this.logger.error(
        `Falha ao carregar prévia de relatório feature=${params.feature} userId=${this.userContext.userId} message=${error?.message ?? 'unknown'}`,
        error?.stack,
      );
      throw error;
    }
  }

  @Get(':feature/export')
  @UseGuards(RequirePlanGuard)
  @AllowedPlans(PlanTier.PRO, PlanTier.FAMILY)
  @Header('Cache-Control', 'no-store')
  async exportReport(
    @Param(new ZodValidationPipe(ExportReportParamsSchema))
    params: ExportReportParamsInput,
    @Query(new ZodValidationPipe(ExportReportQuerySchema))
    query: ExportReportQueryInput,
    @Res() response: Response,
  ) {
    try {
      const result = await this.exportReportUseCase.execute(
        this.userContext.userId,
        params.feature,
        query.format,
        query,
      );

      response.setHeader('Content-Type', result.contentType);
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.fileName}"`,
      );

      return response.status(200).send(result.content);
    } catch (error: any) {
      this.logger.error(
        `Falha ao exportar relatório feature=${params.feature} format=${query.format} userId=${this.userContext.userId} message=${error?.message ?? 'unknown'}`,
        error?.stack,
      );
      throw error;
    }
  }
}
