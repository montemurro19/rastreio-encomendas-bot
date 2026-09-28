import { Injectable, Logger } from '@nestjs/common';
import { TelegramNotificationProvider } from '../telegram/telegram-notification.provider';
import { Package } from '../../packages/entities/package.entity';
import { TrackingEvent } from '../../packages/entities/tracking-event.entity';
import { User } from '../../users/entities/user.entity';
import { PackageStatus } from '../../../shared/enums/package-status.enum';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly telegramProvider: TelegramNotificationProvider,
  ) {}

  /**
   * Formats a date into "DD/MM/YYYY às HH:mm"
   */
  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  }

  /**
   * Dispatches movement notification according to Section 21 and Section 22.
   */
  async notifyEvent(
    user: User,
    pkg: Package,
    event: TrackingEvent,
  ): Promise<void> {
    if (!user.notificationsEnabled || !pkg.notificationsEnabled) {
      this.logger.debug(
        `Skipping notification for package ${pkg.id}: user or package notifications disabled.`,
      );
      return;
    }

    if (!user.telegramChatId) {
      this.logger.warn(`User ${user.id} has no telegramChatId configured.`);
      return;
    }

    const formattedDate = this.formatDate(event.eventDate);

    let message: string;
    if (event.status === PackageStatus.DELIVERED) {
      // Section 22 format
      message =
        `🎉 <b>Encomenda entregue!</b>\n\n` +
        `📦 <b>${pkg.name}</b>\n` +
        `🔎 <code>${pkg.trackingCode}</code>\n\n` +
        (event.location ? `📍 ${event.location}\n` : '') +
        `🕐 ${formattedDate}`;
    } else {
      // Section 21 format
      message =
        `🔔 <b>Nova movimentação</b>\n\n` +
        `📦 <b>${pkg.name}</b>\n` +
        `🔎 <code>${pkg.trackingCode}</code>\n\n` +
        `🚚 ${event.description}\n\n` +
        (event.location ? `📍 ${event.location}\n` : '') +
        `🕐 ${formattedDate}`;
    }

    await this.telegramProvider.send(user.telegramChatId, message);
  }

  async sendDirectMessage(chatId: string, message: string): Promise<void> {
    await this.telegramProvider.send(chatId, message);
  }
}
