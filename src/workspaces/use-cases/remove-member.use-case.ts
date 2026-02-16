import {
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { UserContext } from '../../auth/user-context.service';
import { WorkspacesRepositoryInterface } from '../workspaces.interface';

@Injectable()
export class RemoveMemberUseCase {
  constructor(
    @Inject(WorkspacesRepositoryInterface)
    private readonly workspacesRepository: WorkspacesRepositoryInterface,
    private readonly userContext: UserContext,
  ) {}

  async execute(workspaceId: string, userIdToRemove: string) {
    // Verifica se o usuário atual é ADMIN do workspace
    const membership = await this.workspacesRepository.getMembership(
      workspaceId,
      this.userContext.userId,
    );

    if (!membership) {
      throw new NotFoundException('Workspace não encontrado');
    }

    if (membership.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Apenas administradores podem remover membros',
      );
    }

    await this.workspacesRepository.removeMember(workspaceId, userIdToRemove);
  }
}
