export abstract class WorkspacesRepositoryInterface {
  abstract getWorkspacesByUserId(userId: string): Promise<any[]>;
  abstract createWorkspace(data: {
    name: string;
    description?: string;
  }): Promise<any>;
  abstract addMember(data: {
    workspaceId: string;
    userId: string;
    role: 'ADMIN' | 'MEMBER';
  }): Promise<any>;
  abstract removeMember(workspaceId: string, userId: string): Promise<void>;
  abstract getMembership(
    workspaceId: string,
    userId: string,
  ): Promise<any | null>;
  abstract touchMembership(workspaceId: string, userId: string): Promise<void>;
}
