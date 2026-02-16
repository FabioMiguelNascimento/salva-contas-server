import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CreateWorkspaceUseCase } from './use-cases/create-workspace.use-case';
import { GetWorkspacesUseCase } from './use-cases/get-workspaces.use-case';
import { InviteMemberUseCase } from './use-cases/invite-member.use-case';
import { RemoveMemberUseCase } from './use-cases/remove-member.use-case';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesRepositoryInterface } from './workspaces.interface';
import { WorkspacesRepository } from './workspaces.repository';
import { TouchWorkspaceAccessUseCase } from './use-cases/touch-workspace-access.use-case';

@Module({
  imports: [PrismaModule],
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
  ],
})
export class WorkspacesModule {}
