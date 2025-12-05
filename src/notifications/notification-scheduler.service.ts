import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GenerateNotificationsUseCase } from './use-cases/generate-notifications.use-case';

@Injectable()
export class NotificationSchedulerService {
  constructor(private readonly generateNotificationsUseCase: GenerateNotificationsUseCase) {}

  // Executar diariamente às 9:00
  @Cron('0 9 * * *')
  async handleDailyNotifications() {
    console.log('Executando geração diária de notificações...');
    try {
      await this.generateNotificationsUseCase.execute();
      console.log('Notificações geradas com sucesso');
    } catch (error) {
      console.error('Erro ao gerar notificações:', error);
    }
  }

  // Executar a cada hora para notificações urgentes
  @Cron('0 * * * *')
  async handleHourlyNotifications() {
    console.log('Verificando notificações urgentes...');
    try {
      // Aqui poderíamos implementar notificações mais urgentes
      // como contas vencendo hoje, etc.
      await this.generateNotificationsUseCase.execute();
    } catch (error) {
      console.error('Erro ao verificar notificações urgentes:', error);
    }
  }
}