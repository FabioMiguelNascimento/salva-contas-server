import { Inject, Injectable } from '@nestjs/common';
import { UserContext } from '../../auth/user-context.service';
import { WorkspacesRepositoryInterface } from '../workspaces.interface';

@Injectable()
export class TouchWorkspaceAccessUseCase {
  constructor(
    @Inject(WorkspacesRepositoryInterface)
    private readonly workspacesRepository: WorkspacesRepositoryInterface,
    private readonly userContext: UserContext,
  ) {}

  async execute(workspaceId: string) {
    await this.workspacesRepository.touchMembership(workspaceId, this.userContext.userId);
  }
}
