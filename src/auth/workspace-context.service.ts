import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class WorkspaceContext {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  get workspaceId(): string {
    const workspaceId = this.request['workspaceId'];
    if (!workspaceId) {
      throw new Error('WorkspaceContext: workspaceId não encontrado no request. Header x-workspace-id é obrigatório.');
    }
    return workspaceId;
  }

  get userId(): string {
    const user = this.request['user'];
    if (!user?.id) {
      throw new Error('WorkspaceContext: usuário não autenticado');
    }
    return user.id;
  }
}
