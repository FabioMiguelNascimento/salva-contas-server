import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import {
    GetAttachmentsSchema,
    UpdateAttachmentSchema,
    UploadAttachmentSchema,
} from 'src/schemas/attachments.schema';
import { success } from 'src/utils/api-response-helper';
import {
    DeleteAttachmentUseCase,
    GetAttachmentsUseCase,
    UpdateAttachmentUseCase,
    UploadAttachmentUseCase,
} from './use-cases/attachments.use-cases';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

@Controller('attachments')
export class AttachmentsController {
  constructor(
    private readonly uploadAttachmentUseCase: UploadAttachmentUseCase,
    private readonly getAttachmentsUseCase: GetAttachmentsUseCase,
    private readonly deleteAttachmentUseCase: DeleteAttachmentUseCase,
    private readonly updateAttachmentUseCase: UpdateAttachmentUseCase,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodValidationPipe(UploadAttachmentSchema)) body: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF and images are allowed',
      );
    }

    const attachment = await this.uploadAttachmentUseCase.execute(
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      body,
    );

    return success(attachment, 'File uploaded successfully');
  }

  @Get()
  async getAttachments(
    @Query(new ZodValidationPipe(GetAttachmentsSchema)) query: any,
  ) {
    const attachments = await this.getAttachmentsUseCase.execute(query);

    return success(attachments, 'Attachments retrieved successfully');
  }

  @Patch(':id')
  async updateAttachment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAttachmentSchema)) body: any,
  ) {
    try {
      const attachment = await this.updateAttachmentUseCase.execute(id, body);

      return success(attachment, 'Attachment updated successfully');
    } catch (error) {
      throw new NotFoundException('Attachment not found');
    }
  }

  @Delete(':id')
  async deleteAttachment(@Param('id') id: string) {
    try {
      await this.deleteAttachmentUseCase.execute(id);

      return success(null, 'Attachment deleted successfully');
    } catch (error) {
      throw new NotFoundException('Attachment not found');
    }
  }
}
