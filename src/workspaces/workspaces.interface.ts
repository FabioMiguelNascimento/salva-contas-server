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
    name?: string | null;
    email?: string | null;
  }): Promise<any>;
  abstract removeMember(workspaceId: string, userId: string): Promise<void>;
  abstract getMembership(
    workspaceId: string,
    userId: string,
  ): Promise<any | null>;
  abstract touchMembership(workspaceId: string, userId: string): Promise<void>;
  abstract getMembers(workspaceId: string): Promise<any[]>;
}
