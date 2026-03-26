import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class OwnerOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const localUser = request['localUser'];

    if (!localUser) {
      return false;
    }

    // Se linkedToId não for null, é um convidado
    if (localUser.linkedToId !== null) {
      throw new ForbiddenException(
        'Apenas o proprietário da conta pode realizar esta ação.',
      );
    }

    return true;
  }
}
