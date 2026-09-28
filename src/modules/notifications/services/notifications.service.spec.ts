import { NotificationsService } from './notifications.service';
import { TelegramNotificationProvider } from '../telegram/telegram-notification.provider';
import { PackageStatus } from '../../../shared/enums/package-status.enum';
import { User } from '../../users/entities/user.entity';
import { Package } from '../../packages/entities/package.entity';
import { TrackingEvent } from '../../packages/entities/tracking-event.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let telegramProviderMock: Partial<TelegramNotificationProvider>;

  beforeEach(() => {
    telegramProviderMock = {
      send: jest.fn().mockResolvedValue(undefined),
    };

    service = new NotificationsService(
      telegramProviderMock as TelegramNotificationProvider,
    );
  });

  const dummyUser: User = {
    id: 'user-uuid-1',
    telegramUserId: '111',
    telegramChatId: '222',
    notificationsEnabled: true,
    packages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const dummyPackage: Package = {
    id: 'pkg-uuid-1',
    userId: 'user-uuid-1',
    user: dummyUser,
    name: 'Teclado Mecânico',
    trackingCode: 'AA123456789BR',
    status: PackageStatus.IN_TRANSIT,
    notificationsEnabled: true,
    trackingEnabled: true,
    events: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should send formatted movement notification for standard in_transit event', async () => {
    const event: TrackingEvent = {
      id: 'event-uuid-1',
      packageId: dummyPackage.id,
      package: dummyPackage,
      status: PackageStatus.IN_TRANSIT,
      description: 'Objeto em trânsito',
      location: 'São Paulo - SP',
      eventDate: new Date('2026-09-28T13:21:00.000Z'),
      eventHash: 'hash123',
      createdAt: new Date(),
    };

    await service.notifyEvent(dummyUser, dummyPackage, event);

    expect(telegramProviderMock.send).toHaveBeenCalledTimes(1);
    const [chatId, message] = (telegramProviderMock.send as jest.Mock).mock
      .calls[0];
    expect(chatId).toBe('222');
    expect(message).toContain('Nova movimentação');
    expect(message).toContain('Teclado Mecânico');
    expect(message).toContain('AA123456789BR');
    expect(message).toContain('Objeto em trânsito');
    expect(message).toContain('São Paulo - SP');
  });

  it('should send formatted delivery notification for DELIVERED event', async () => {
    const event: TrackingEvent = {
      id: 'event-uuid-2',
      packageId: dummyPackage.id,
      package: dummyPackage,
      status: PackageStatus.DELIVERED,
      description: 'Objeto entregue ao destinatário',
      location: 'São Bernardo do Campo - SP',
      eventDate: new Date('2026-09-28T16:42:00.000Z'),
      eventHash: 'hash456',
      createdAt: new Date(),
    };

    await service.notifyEvent(dummyUser, dummyPackage, event);

    expect(telegramProviderMock.send).toHaveBeenCalledTimes(1);
    const [chatId, message] = (telegramProviderMock.send as jest.Mock).mock
      .calls[0];
    expect(chatId).toBe('222');
    expect(message).toContain('Encomenda entregue!');
    expect(message).toContain('Teclado Mecânico');
    expect(message).toContain('AA123456789BR');
    expect(message).toContain('São Bernardo do Campo - SP');
  });

  it('should skip notification if user notifications are disabled', async () => {
    const event: TrackingEvent = {
      id: 'event-uuid-3',
      packageId: dummyPackage.id,
      package: dummyPackage,
      status: PackageStatus.IN_TRANSIT,
      description: 'Objeto em trânsito',
      eventDate: new Date(),
      eventHash: 'hash789',
      createdAt: new Date(),
    };

    const userDisabled = { ...dummyUser, notificationsEnabled: false };
    await service.notifyEvent(userDisabled, dummyPackage, event);

    expect(telegramProviderMock.send).not.toHaveBeenCalled();
  });

  it('should skip notification if package notifications are disabled', async () => {
    const event: TrackingEvent = {
      id: 'event-uuid-4',
      packageId: dummyPackage.id,
      package: dummyPackage,
      status: PackageStatus.IN_TRANSIT,
      description: 'Objeto em trânsito',
      eventDate: new Date(),
      eventHash: 'hash789',
      createdAt: new Date(),
    };

    const packageDisabled = { ...dummyPackage, notificationsEnabled: false };
    await service.notifyEvent(dummyUser, packageDisabled, event);

    expect(telegramProviderMock.send).not.toHaveBeenCalled();
  });
});
