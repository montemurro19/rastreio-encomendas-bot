import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramNotificationProvider } from './telegram/telegram-notification.provider';
import { NotificationsService } from './services/notifications.service';

@Module({
  imports: [ConfigModule],
  providers: [TelegramNotificationProvider, NotificationsService],
  exports: [NotificationsService, TelegramNotificationProvider],
})
export class NotificationsModule {}
