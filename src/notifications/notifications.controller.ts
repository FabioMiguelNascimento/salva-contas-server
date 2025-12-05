import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateNotificationInput, CreateNotificationSchema, GetNotificationsInput, GetNotificationsSchema } from '../schemas/notifications.schema';
import { success } from '../utils/api-response-helper';
import { CreateNotificationUseCase } from './use-cases/create-notification.use-case';
import { DeleteNotificationUseCase } from './use-cases/delete-notification.use-case';
import { GenerateNotificationsUseCase } from './use-cases/generate-notifications.use-case';
import { GetNotificationsUseCase } from './use-cases/get-notifications.use-case';
import { GetUnreadCountUseCase } from './use-cases/get-unread-count.use-case';
import { MarkAllAsReadUseCase } from './use-cases/mark-all-as-read.use-case';
import { MarkAsReadUseCase } from './use-cases/mark-as-read.use-case';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly createNotificationUseCase: CreateNotificationUseCase,
    private readonly getNotificationsUseCase: GetNotificationsUseCase,
    private readonly markAsReadUseCase: MarkAsReadUseCase,
    private readonly markAllAsReadUseCase: MarkAllAsReadUseCase,
    private readonly deleteNotificationUseCase: DeleteNotificationUseCase,
    private readonly getUnreadCountUseCase: GetUnreadCountUseCase,
    private readonly generateNotificationsUseCase: GenerateNotificationsUseCase,
  ) {}

  @Post()
  async createNotification(
    @Body(new ZodValidationPipe(CreateNotificationSchema)) data: CreateNotificationInput,
  ) {
    const notification = await this.createNotificationUseCase.execute(data);
    return success(notification, 'Notificação criada com sucesso');
  }

  @Get()
  async getNotifications(
    @Query(new ZodValidationPipe(GetNotificationsSchema)) filters: GetNotificationsInput,
  ) {
    const notifications = await this.getNotificationsUseCase.execute(filters);
    return success(notifications, 'Notificações recuperadas com sucesso');
  }

  @Get('unread-count')
  async getUnreadCount() {
    const result = await this.getUnreadCountUseCase.execute();
    return success(result, 'Contagem de notificações não lidas recuperada com sucesso');
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    const notification = await this.markAsReadUseCase.execute(id);
    return success(notification, 'Notificação marcada como lida');
  }

  @Put('mark-all-read')
  async markAllAsRead() {
    const result = await this.markAllAsReadUseCase.execute();
    return success(result, 'Todas as notificações foram marcadas como lidas');
  }

  @Delete(':id')
  async deleteNotification(@Param('id') id: string) {
    await this.deleteNotificationUseCase.execute(id);
    return success(null, 'Notificação deletada com sucesso');
  }

  @Post('generate')
  async generateNotifications() {
    await this.generateNotificationsUseCase.execute();
    return success(null, 'Notificações geradas com sucesso');
  }
}