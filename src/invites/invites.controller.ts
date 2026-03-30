import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { PlanTier } from 'generated/prisma/enums';
import { AllowedPlans } from 'src/auth/decorators/allowed-plans.decorator';
import { RequirePlanGuard } from 'src/auth/guards/require-plan.guard';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import {
  AcceptInviteInput,
  AcceptInviteSchema,
} from 'src/schemas/invites.schema';
import { success } from 'src/utils/api-response-helper';
import { AcceptInviteUseCase } from './use-cases/accept-invite.use-case';
import { GenerateInviteUseCase } from './use-cases/generate-invite.use-case';
import { GetFamilyInviteTokensUseCase } from './use-cases/get-family-invite-tokens.use-case';
import { GetFamilyMembersUseCase } from './use-cases/get-family-members.use-case';
import { PreviewInviteUseCase } from './use-cases/preview-invite.use-case';
import { RemoveFamilyMemberUseCase } from './use-cases/remove-family-member.use-case';

@Controller('invites')
@UseGuards(RequirePlanGuard)
@AllowedPlans(PlanTier.FAMILY)
export class InvitesController {
  constructor(
    private readonly generateInviteUseCase: GenerateInviteUseCase,
    private readonly acceptInviteUseCase: AcceptInviteUseCase,
    private readonly previewInviteUseCase: PreviewInviteUseCase,
    private readonly getFamilyInviteTokensUseCase: GetFamilyInviteTokensUseCase,
    private readonly getFamilyMembersUseCase: GetFamilyMembersUseCase,
    private readonly removeFamilyMemberUseCase: RemoveFamilyMemberUseCase,
  ) {}

  @Post('generate')
  async generateInvite() {
    const data = await this.generateInviteUseCase.execute();
    return success(data, 'Link de convite gerado com sucesso');
  }

  @Post('accept')
  async acceptInvite(
    @Body(new ZodValidationPipe(AcceptInviteSchema)) body: AcceptInviteInput,
  ) {
    const data = await this.acceptInviteUseCase.execute(body);
    return success(data, 'Convite aceito com sucesso');
  }

  @Get('preview/:token')
  async previewInvite(@Param('token') token: string) {
    const data = await this.previewInviteUseCase.execute(token);
    return success(data, 'Convite válido');
  }

  @Get('tokens')
  async getFamilyInviteTokens() {
    const data = await this.getFamilyInviteTokensUseCase.execute();
    return success(data, 'Tokens de convite recuperados com sucesso');
  }

  @Delete('members/:memberId')
  async removeFamilyMember(@Param('memberId') memberId: string) {
    const data = await this.removeFamilyMemberUseCase.execute(memberId);
    return success(data, 'Membro removido com sucesso');
  }

  @Get('members')
  async getFamilyMembers() {
    const data = await this.getFamilyMembersUseCase.execute();
    return success(data, 'Membros da conta recuperados com sucesso');
  }
}
