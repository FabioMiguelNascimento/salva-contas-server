import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageServiceInterface, UploadFileData } from '../attachments.interface';

@Injectable()
export class LocalStorageService implements StorageServiceInterface {
  private readonly uploadPath = path.join(process.cwd(), 'uploads');

  constructor() {
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadPath);
    } catch {
      await fs.mkdir(this.uploadPath, { recursive: true });
    }
  }

  async uploadFile(file: UploadFileData, userId: string): Promise<{ fileName: string; url: string }> {
    await this.ensureUploadDirectory();

    const fileExtension = path.extname(file.originalName);
    const fileName = `${userId}_${randomUUID()}${fileExtension}`;
    const filePath = path.join(this.uploadPath, fileName);

    await fs.writeFile(filePath, file.buffer);

    return {
      fileName,
      url: `/uploads/${fileName}`,
    };
  }

  async deleteFile(fileName: string): Promise<void> {
    const filePath = path.join(this.uploadPath, fileName);
    
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete file ${fileName}:`, error);
    }
  }

  async getFileUrl(fileName: string): Promise<string> {
    return `/uploads/${fileName}`;
  }
}
