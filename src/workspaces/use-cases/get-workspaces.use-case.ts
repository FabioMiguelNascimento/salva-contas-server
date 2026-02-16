import { Inject, Injectable } from '@nestjs/common';
import { UserContext } from '../../auth/user-context.service';
import { WorkspacesRepositoryInterface } from '../workspaces.interface';

@Injectable()
export class GetWorkspacesUseCase {
  constructor(
    @Inject(WorkspacesRepositoryInterface)
    private readonly workspacesRepository: WorkspacesRepositoryInterface,
    private readonly userContext: UserContext,
  ) {}

  async execute() {
    return this.workspacesRepository.getWorkspacesByUserId(
      this.userContext.userId,
    );
  }
}
