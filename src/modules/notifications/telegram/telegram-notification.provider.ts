import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { NotificationProvider } from '../services/notification-provider.interface';

@Injectable()
export class TelegramNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(TelegramNotificationProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async send(chatId: string, message: string): Promise<void> {
    const token = this.configService.get<string>('telegram.botToken');
    if (!token) {
      this.logger.warn(
        `TELEGRAM_BOT_TOKEN is not configured. Message to ${chatId} not sent.`,
      );
      return;
    }

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      });
      this.logger.log(
        `Telegram notification sent successfully to chat ${chatId}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send Telegram message to chat ${chatId}: ${error?.response?.data?.description || error?.message}`,
      );
      throw error;
    }
  }
}
