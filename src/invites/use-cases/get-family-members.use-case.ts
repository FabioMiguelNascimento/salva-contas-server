import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserContext } from 'src/auth/user-context.service';
import { InvitesRepositoryInterface } from '../invites.interface';

@Injectable()
export class GetFamilyMembersUseCase {
  constructor(
    private readonly userContext: UserContext,
    @Inject(InvitesRepositoryInterface)
    private readonly invitesRepository: InvitesRepositoryInterface,
  ) {}

  async execute() {
    const actor = await this.invitesRepository.findUserById(this.userContext.actorUserId);

    if (!actor) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    const ownerId = actor.linkedToId ?? actor.id;
    const owner = await this.invitesRepository.findUserById(ownerId);
    const members = await this.invitesRepository.findLinkedUsers(ownerId);

    return {
      owner: owner
        ? { id: owner.id, name: owner.name, email: owner.email }
        : { id: ownerId, name: null, email: null },
      members,
      isOwner: actor.id === ownerId,
    };
  }
}
