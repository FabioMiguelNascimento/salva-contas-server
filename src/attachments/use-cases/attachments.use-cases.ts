import { Inject, Injectable } from '@nestjs/common';
import { Attachment } from 'generated/prisma/client';
import { UserContext } from 'src/auth/user-context.service';
import { GetAttachmentsInput, UpdateAttachmentInput, UploadAttachmentInput } from 'src/schemas/attachments.schema';
import { AttachmentsRepositoryInterface, StorageServiceInterface, UploadFileData } from '../attachments.interface';

@Injectable()
export class UploadAttachmentUseCase {
  constructor(
    @Inject(AttachmentsRepositoryInterface)
    private readonly repository: AttachmentsRepositoryInterface,
    @Inject(StorageServiceInterface)
    private readonly storageService: StorageServiceInterface,
    private readonly userContext: UserContext,
  ) {}

  async execute(
    file: UploadFileData,
    data: UploadAttachmentInput,
  ): Promise<Attachment> {
    // Determinar tipo do arquivo
    const type = this.determineFileType(file.mimeType);

    // Upload do arquivo
    const { fileName, url } = await this.storageService.uploadFile(file, this.userContext.userId);

    // Criar registro no banco
    return this.repository.createAttachment({
      ...data,
      fileName,
      originalName: file.originalName,
      fileSize: file.size,
      mimeType: file.mimeType,
      storageUrl: url,
      type,
    });
  }

  private determineFileType(mimeType: string): 'pdf' | 'image' | 'document' {
    if (mimeType === 'application/pdf') {
      return 'pdf';
    }
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    return 'document';
  }
}

@Injectable()
export class GetAttachmentsUseCase {
  constructor(
    @Inject(AttachmentsRepositoryInterface)
    private readonly repository: AttachmentsRepositoryInterface,
  ) {}

  async execute(filters: GetAttachmentsInput): Promise<Attachment[]> {
    return this.repository.getAttachments(filters);
  }
}

@Injectable()
export class DeleteAttachmentUseCase {
  constructor(
    @Inject(AttachmentsRepositoryInterface)
    private readonly repository: AttachmentsRepositoryInterface,
    @Inject(StorageServiceInterface)
    private readonly storageService: StorageServiceInterface,
  ) {}

  async execute(id: string): Promise<void> {
    const attachment = await this.repository.getAttachmentById(id);
    
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Deletar arquivo do storage
    await this.storageService.deleteFile(attachment.fileName);

    // Deletar registro do banco
    await this.repository.deleteAttachment(id);
  }
}

@Injectable()
export class UpdateAttachmentUseCase {
  constructor(
    @Inject(AttachmentsRepositoryInterface)
    private readonly repository: AttachmentsRepositoryInterface,
  ) {}

  async execute(id: string, data: UpdateAttachmentInput): Promise<Attachment> {
    return this.repository.updateAttachment(id, data);
  }
}
