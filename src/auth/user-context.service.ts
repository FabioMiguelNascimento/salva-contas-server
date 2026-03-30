import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class UserContext {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  get userId(): string {
    const targetUserId = this.request['targetUserId'];
    if (!targetUserId) {
      throw new Error('Usuário não autenticado');
    }
    return targetUserId;
  }

  get actorUserId(): string {
    const user = this.request['user'];
    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }
    return user.id;
  }

  get linkedToId(): string | null {
    const localUser = this.request['localUser'];
    return localUser?.linkedToId ?? null;
  }

  get user() {
    return this.request['user'];
  }

  get localUser() {
    return this.request['localUser'];
  }
}
