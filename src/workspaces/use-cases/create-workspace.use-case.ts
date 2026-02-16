import { Inject, Injectable } from '@nestjs/common';
import { WorkspacesRepositoryInterface } from '../workspaces.interface';

@Injectable()
export class CreateWorkspaceUseCase {
  constructor(
    @Inject(WorkspacesRepositoryInterface)
    private readonly workspacesRepository: WorkspacesRepositoryInterface,
  ) {}

  async execute(data: { name: string; description?: string }) {
    return this.workspacesRepository.createWorkspace(data);
  }
}
