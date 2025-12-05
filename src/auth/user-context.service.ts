import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class UserContext {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  get userId(): string {
    const user = this.request['user'];
    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }
    return user.id;
  }

  get user() {
    return this.request['user'];
  }
}
