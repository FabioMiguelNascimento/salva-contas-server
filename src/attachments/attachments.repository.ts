import { Injectable, Scope } from '@nestjs/common';
import { Attachment } from 'generated/prisma/client';
import { UserContext } from 'src/auth/user-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetAttachmentsInput, UpdateAttachmentInput, UploadAttachmentInput } from 'src/schemas/attachments.schema';
import { AttachmentsRepositoryInterface } from './attachments.interface';

@Injectable({ scope: Scope.REQUEST })
export default class AttachmentsRepository extends AttachmentsRepositoryInterface {
  constructor(
    private prisma: PrismaService,
    private userContext: UserContext,
  ) {
    super();
  }

  private get userId(): string {
    return this.userContext.userId;
  }

  async createAttachment(
    data: UploadAttachmentInput & {
      fileName: string;
      originalName: string;
      fileSize: number;
      mimeType: string;
      storageUrl: string;
      type: 'pdf' | 'image' | 'document';
    },
  ): Promise<Attachment> {
    
    return this.prisma.attachment.create({
      data: {
        userId: this.userId,
        fileName: data.fileName,
        originalName: data.originalName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        type: data.type,
        storageUrl: data.storageUrl,
        description: data.description,
        transactionId: data.transactionId,
        subscriptionId: data.subscriptionId,
      },
    });
  }

  async getAttachments(filters: GetAttachmentsInput): Promise<Attachment[]> {
    return this.prisma.attachment.findMany({
      where: {
        userId: this.userId,
        transactionId: filters.transactionId,
        subscriptionId: filters.subscriptionId,
        type: filters.type,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAttachmentById(id: string): Promise<Attachment | null> {
    return this.prisma.attachment.findFirst({
      where: {
        id,
        userId: this.userId,
      },
    });
  }

  async updateAttachment(id: string, data: UpdateAttachmentInput): Promise<Attachment> {
    return this.prisma.attachment.update({
      where: {
        id,
        userId: this.userId,
      },
      data,
    });
  }

  async deleteAttachment(id: string): Promise<void> {
    await this.prisma.attachment.delete({
      where: {
        id,
        userId: this.userId,
      },
    });
  }
}
