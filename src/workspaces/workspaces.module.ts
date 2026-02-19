import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CreateWorkspaceUseCase } from './use-cases/create-workspace.use-case';
import { GetWorkspaceMembersUseCase } from './use-cases/get-members.use-case';
import { GetWorkspacesUseCase } from './use-cases/get-workspaces.use-case';
import { InviteMemberUseCase } from './use-cases/invite-member.use-case';
import { RemoveMemberUseCase } from './use-cases/remove-member.use-case';
import { TouchWorkspaceAccessUseCase } from './use-cases/touch-workspace-access.use-case';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesRepositoryInterface } from './workspaces.interface';
import { WorkspacesRepository } from './workspaces.repository';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WorkspacesController],
  providers: [
    {
      provide: WorkspacesRepositoryInterface,
      useClass: WorkspacesRepository,
    },
    GetWorkspacesUseCase,
    CreateWorkspaceUseCase,
    InviteMemberUseCase,
    RemoveMemberUseCase,
    TouchWorkspaceAccessUseCase,
    GetWorkspaceMembersUseCase,
  ],
})
export class WorkspacesModule {}
