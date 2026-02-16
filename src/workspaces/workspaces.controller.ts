import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
    CreateWorkspaceInput,
    CreateWorkspaceSchema,
    InviteMemberInput,
    InviteMemberSchema,
} from '../schemas/workspaces.schema';
import { success } from '../utils/api-response-helper';
import { CreateWorkspaceUseCase } from './use-cases/create-workspace.use-case';
import { GetWorkspacesUseCase } from './use-cases/get-workspaces.use-case';
import { InviteMemberUseCase } from './use-cases/invite-member.use-case';
import { RemoveMemberUseCase } from './use-cases/remove-member.use-case';
import { TouchWorkspaceAccessUseCase } from './use-cases/touch-workspace-access.use-case';

@Controller('workspaces')
@UseGuards(SupabaseAuthGuard)
export class WorkspacesController {
  constructor(
    private readonly getWorkspacesUseCase: GetWorkspacesUseCase,
    private readonly createWorkspaceUseCase: CreateWorkspaceUseCase,
    private readonly inviteMemberUseCase: InviteMemberUseCase,
    private readonly removeMemberUseCase: RemoveMemberUseCase,
    private readonly touchWorkspaceAccessUseCase: TouchWorkspaceAccessUseCase,
  ) {}

  @Get()
  async getWorkspaces() {
    const workspaces = await this.getWorkspacesUseCase.execute();
    return success(workspaces, 'Workspaces recuperados com sucesso');
  }

  @Post()
  async createWorkspace(
    @Body(new ZodValidationPipe(CreateWorkspaceSchema))
    data: CreateWorkspaceInput,
  ) {
    const workspace = await this.createWorkspaceUseCase.execute(data);
    return success(workspace, 'Workspace criado com sucesso');
  }

  @Post(':id/members')
  async inviteMember(
    @Param('id') workspaceId: string,
    @Body(new ZodValidationPipe(InviteMemberSchema)) data: InviteMemberInput,
  ) {
    await this.inviteMemberUseCase.execute({
      workspaceId,
      ...data,
    });
    return success(null, 'Membro convidado com sucesso');
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    await this.removeMemberUseCase.execute(workspaceId, userId);
    return success(null, 'Membro removido com sucesso');
  }

  @Post(':id/access')
  async touchAccess(@Param('id') workspaceId: string) {
    await this.touchWorkspaceAccessUseCase.execute(workspaceId);
    return success(null, 'Acesso registrado');
  }
}
