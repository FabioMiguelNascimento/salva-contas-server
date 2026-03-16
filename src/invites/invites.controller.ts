import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { AcceptInviteInput, AcceptInviteSchema } from 'src/schemas/invites.schema';
import { success } from 'src/utils/api-response-helper';
import { AcceptInviteUseCase } from './use-cases/accept-invite.use-case';
import { GenerateInviteUseCase } from './use-cases/generate-invite.use-case';
import { GetFamilyMembersUseCase } from './use-cases/get-family-members.use-case';
import { PreviewInviteUseCase } from './use-cases/preview-invite.use-case';

@Controller('invites')
export class InvitesController {
  constructor(
    private readonly generateInviteUseCase: GenerateInviteUseCase,
    private readonly acceptInviteUseCase: AcceptInviteUseCase,
    private readonly previewInviteUseCase: PreviewInviteUseCase,
    private readonly getFamilyMembersUseCase: GetFamilyMembersUseCase,
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

  @Get('members')
  async getFamilyMembers() {
    const data = await this.getFamilyMembersUseCase.execute();
    return success(data, 'Membros da conta recuperados com sucesso');
  }
}
