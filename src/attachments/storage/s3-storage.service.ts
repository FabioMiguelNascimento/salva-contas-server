import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { StorageServiceInterface, UploadFileData } from '../attachments.interface';

@Injectable()
export class S3StorageService implements StorageServiceInterface {
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;
  private logger = new Logger(S3StorageService.name);
  private publicUrlBase?: string;

  constructor() {
    this.region = process.env.AWS_REGION || 'auto';

    // Enforce Cloudflare R2 only
    this.bucketName = process.env.R2_BUCKET_NAME || 'SALVA_CONTAS';
    this.publicUrlBase = process.env.R2_PUBLIC_URL;

    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      this.logger.warn('One or more R2 environment variables are missing (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY). Service may not work properly.');
    }

    this.s3Client = new S3Client({
      region: this.region,
      endpoint: endpoint?.replace(/\/$/, ''),
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
      forcePathStyle: false,
    });
  }

  async uploadFile(file: UploadFileData, userId: string): Promise<{ fileName: string; url: string }> {
    const fileExtension = path.extname(file.originalName);
    const fileName = `${userId}_${randomUUID()}${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimeType,
    });

    await this.s3Client.send(command);

    const url = this.getFileUrlSync(fileName);

    return { fileName, url };
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
      });
      await this.s3Client.send(command);
    } catch (error) {
      this.logger.error(`Failed to delete file ${fileName} from S3/R2`, error as any);
    }
  }

  async getFileUrl(fileName: string): Promise<string> {
    return this.getFileUrlSync(fileName);
  }

  private getFileUrlSync(fileName: string): string {
    if (this.publicUrlBase) {
      return `${this.publicUrlBase.replace(/\/$/, '')}/${fileName}`;
    }

    // AWS S3 URL fallback
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
  }
}
