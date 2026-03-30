import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { UserContext } from 'src/auth/user-context.service';
import { InvitesRepositoryInterface } from '../invites.interface';

@Injectable()
export class RemoveFamilyMemberUseCase {
  constructor(
    private readonly userContext: UserContext,
    @Inject(InvitesRepositoryInterface)
    private readonly invitesRepository: InvitesRepositoryInterface,
  ) {}

  async execute(memberId: string) {
    const actor = await this.invitesRepository.findUserById(this.userContext.actorUserId);

    if (!actor) {
      throw new BadRequestException('Usuário não encontrado.');
    }

    const ownerId = actor.linkedToId ?? actor.id;

    const member = await this.invitesRepository.findUserById(memberId);
    if (!member) {
      throw new BadRequestException('Membro não encontrado.');
    }

    if (member.linkedToId !== ownerId) {
      throw new BadRequestException('Membro não pertence à família do usuário.');
    }

    await this.invitesRepository.unlinkFamilyMember(memberId);
    return { success: true };
  }
}
