import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { InvitesController } from './invites.controller';
import { InvitesRepositoryInterface } from './invites.interface';
import { InvitesRepository } from './invites.repository';
import { AcceptInviteUseCase } from './use-cases/accept-invite.use-case';
import { GenerateInviteUseCase } from './use-cases/generate-invite.use-case';
import { GetFamilyInviteTokensUseCase } from './use-cases/get-family-invite-tokens.use-case';
import { GetFamilyMembersUseCase } from './use-cases/get-family-members.use-case';
import { PreviewInviteUseCase } from './use-cases/preview-invite.use-case';
import { RemoveFamilyMemberUseCase } from './use-cases/remove-family-member.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [InvitesController],
  providers: [
    {
      provide: InvitesRepositoryInterface,
      useClass: InvitesRepository,
    },
    GenerateInviteUseCase,
    AcceptInviteUseCase,
    PreviewInviteUseCase,
    GetFamilyInviteTokensUseCase,
    GetFamilyMembersUseCase,
    RemoveFamilyMemberUseCase,
  ],
  exports: [
    GetFamilyMembersUseCase,
    GetFamilyInviteTokensUseCase,
    RemoveFamilyMemberUseCase,
  ],
})
export class InvitesModule {}
