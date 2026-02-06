import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsRepositoryInterface, StorageServiceInterface } from './attachments.interface';
import AttachmentsRepository from './attachments.repository';
import { S3StorageService } from './storage/s3-storage.service';
import {
    DeleteAttachmentUseCase,
    GetAttachmentsUseCase,
    UpdateAttachmentUseCase,
    UploadAttachmentUseCase,
} from './use-cases/attachments.use-cases';

@Module({
  imports: [PrismaModule],
  controllers: [AttachmentsController],
  providers: [
    UploadAttachmentUseCase,
    GetAttachmentsUseCase,
    DeleteAttachmentUseCase,
    UpdateAttachmentUseCase,
    {
      provide: AttachmentsRepositoryInterface,
      useClass: AttachmentsRepository,
    },
    {
      provide: StorageServiceInterface,
      useClass: S3StorageService,
    },
  ],
  exports: [
    AttachmentsRepositoryInterface,
    StorageServiceInterface,
  ],
})
export class AttachmentsModule {}
