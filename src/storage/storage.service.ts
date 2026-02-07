import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client;
  private bucketName = process.env.R2_BUCKET_NAME!;

  constructor() {
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const endpoint = process.env.R2_ENDPOINT;
    const region = process.env.AWS_REGION

    if (!accessKeyId || !secretAccessKey || !endpoint || !this.bucketName) {
      throw new Error('R2 configuration is missing. Please set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, and R2_BUCKET_NAME in your .env file');
    }

    this.client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle:true
    });
  }

  /**
   * Faz upload de um arquivo para o R2
   * @param file - Arquivo do Multer
   * @param folder - Pasta destino no bucket (ex: 'receipts')
   * @returns Key (caminho) do arquivo no bucket
   */
  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
      return fileName;
    } catch (error) {
      this.logger.error(`Erro no upload R2: ${error}`, error instanceof Error ? error.stack : '');
      throw new InternalServerErrorException('Falha ao salvar arquivo');
    }
  }

  /**
   * Gera uma URL pré-assinada para acesso temporário ao arquivo
   * @param fileKey - Caminho do arquivo no bucket
   * @param expiresIn - Tempo de validade em segundos (padrão: 1 hora)
   * @returns URL temporária ou null se erro
   */
  async getPresignedUrl(fileKey: string, expiresIn = 3600): Promise<string | null> {
    if (!fileKey) return null;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      this.logger.error(`Erro ao gerar URL assinada para ${fileKey}: ${error}`);
      return null;
    }
  }

  /**
   * Deleta um arquivo do R2
   * @param fileKey - Caminho do arquivo no bucket
   */
  async deleteFile(fileKey: string): Promise<void> {
    if (!fileKey) return;
    
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: fileKey,
        }),
      );
    } catch (error) {
      this.logger.warn(`Erro ao deletar arquivo ${fileKey}: ${error}`);
    }
  }
}
