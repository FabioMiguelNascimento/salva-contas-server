import { Attachment } from "generated/prisma/client";
import { GetAttachmentsInput, UpdateAttachmentInput, UploadAttachmentInput } from "src/schemas/attachments.schema";

export interface UploadFileData {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export abstract class AttachmentsRepositoryInterface {
  abstract createAttachment(
    data: UploadAttachmentInput & {
      fileName: string;
      originalName: string;
      fileSize: number;
      mimeType: string;
      storageUrl: string;
      type: 'pdf' | 'image' | 'document';
    }
  ): Promise<Attachment>;
  
  abstract getAttachments(filters: GetAttachmentsInput): Promise<Attachment[]>;
  abstract getAttachmentById(id: string): Promise<Attachment | null>;
  abstract updateAttachment(id: string, data: UpdateAttachmentInput): Promise<Attachment>;
  abstract deleteAttachment(id: string): Promise<void>;
}

export abstract class StorageServiceInterface {
  abstract uploadFile(file: UploadFileData, userId: string): Promise<{ fileName: string; url: string }>;
  abstract deleteFile(fileName: string): Promise<void>;
  abstract getFileUrl(fileName: string): Promise<string>;
}
