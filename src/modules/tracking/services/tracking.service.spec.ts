import { TrackingService } from './tracking.service';
import { PackagesRepository } from '../../packages/repositories/packages.repository';
import { TrackingEventsRepository } from '../../packages/repositories/tracking-events.repository';
import { TrackingProviderRegistry } from '../providers/tracking-provider.registry';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { ConfigService } from '@nestjs/config';
import { PackageStatus } from '../../../shared/enums/package-status.enum';
import { Package } from '../../packages/entities/package.entity';
import { TrackingEvent } from '../../packages/entities/tracking-event.entity';

describe('TrackingService', () => {
  let service: TrackingService;
  let packagesRepoMock: Partial<PackagesRepository>;
  let eventsRepoMock: Partial<TrackingEventsRepository>;
  let providerRegistryMock: Partial<TrackingProviderRegistry>;
  let notificationsServiceMock: Partial<NotificationsService>;
  let configServiceMock: Partial<ConfigService>;

  const dummyUser = {
    id: 'user-1',
    telegramUserId: '123',
    telegramChatId: '456',
    notificationsEnabled: true,
  };

  let dummyPackage: Package;

  beforeEach(() => {
    dummyPackage = {
      id: 'pkg-1',
      userId: 'user-1',
      user: dummyUser as any,
      name: 'Teclado Mecânico',
      trackingCode: 'AA123456789BR',
      carrier: 'correios',
      status: PackageStatus.POSTED,
      notificationsEnabled: true,
      trackingEnabled: true,
      events: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    packagesRepoMock = {
      findById: jest
        .fn()
        .mockImplementation(() => Promise.resolve(dummyPackage)),
      save: jest.fn().mockImplementation((pkg) => Promise.resolve(pkg)),
    };

    eventsRepoMock = {
      saveEventIfNotExists: jest.fn().mockImplementation((data) =>
        Promise.resolve({
          event: { id: 'evt-1', ...data } as TrackingEvent,
          isNew: true,
        }),
      ),
    };

    providerRegistryMock = {
      getProvider: jest.fn().mockReturnValue({
        name: 'correios',
        canHandle: () => true,
        track: jest.fn().mockResolvedValue({
          trackingCode: 'AA123456789BR',
          status: PackageStatus.IN_TRANSIT,
          carrier: 'correios',
          events: [
            {
              status: PackageStatus.IN_TRANSIT,
              description: 'Objeto em trânsito',
              location: 'São Paulo - SP',
              eventDate: new Date(),
            },
          ],
        }),
      }),
    };

    notificationsServiceMock = {
      notifyEvent: jest.fn().mockResolvedValue(undefined),
    };

    configServiceMock = {
      get: jest.fn().mockImplementation((key, defaultVal) => defaultVal),
    };

    service = new TrackingService(
      packagesRepoMock as PackagesRepository,
      eventsRepoMock as TrackingEventsRepository,
      providerRegistryMock as TrackingProviderRegistry,
      notificationsServiceMock as NotificationsService,
      configServiceMock as ConfigService,
    );
  });

  describe('Initial Check (Section 20)', () => {
    it('should NOT trigger notifications on initial check', async () => {
      const result = await service.trackPackage('pkg-1', {
        isInitialCheck: true,
        forceCheck: true,
      });

      expect(result.newEvents).toHaveLength(1);
      expect(notificationsServiceMock.notifyEvent).not.toHaveBeenCalled();
    });
  });

  describe('Subsequent Check with New Events (Section 14 & 21)', () => {
    it('should trigger notification on subsequent check when new events appear', async () => {
      const result = await service.trackPackage('pkg-1', {
        isInitialCheck: false,
        forceCheck: true,
      });

      expect(result.newEvents).toHaveLength(1);
      expect(notificationsServiceMock.notifyEvent).toHaveBeenCalledTimes(1);
      expect(packagesRepoMock.save).toHaveBeenCalled();
    });
  });

  describe('Delivery Auto-Pause (Section 22)', () => {
    it('should set trackingEnabled = false when status is DELIVERED', async () => {
      (providerRegistryMock.getProvider as jest.Mock).mockReturnValue({
        name: 'correios',
        canHandle: () => true,
        track: jest.fn().mockResolvedValue({
          trackingCode: 'AA123456789BR',
          status: PackageStatus.DELIVERED,
          carrier: 'correios',
          events: [
            {
              status: PackageStatus.DELIVERED,
              description: 'Objeto entregue ao destinatário',
              location: 'São Paulo - SP',
              eventDate: new Date(),
            },
          ],
        }),
      });

      const result = await service.trackPackage('pkg-1', { forceCheck: true });

      expect(result.package.status).toBe(PackageStatus.DELIVERED);
      expect(result.package.trackingEnabled).toBe(false);
    });
  });

  describe('Check Frequency Rate Limit (Section 18)', () => {
    it('should skip querying carrier if checked recently and forceCheck is false', async () => {
      // Last checked 2 minutes ago (threshold is 15 minutes)
      dummyPackage.lastCheckedAt = new Date(Date.now() - 2 * 60 * 1000);

      const result = await service.trackPackage('pkg-1', { forceCheck: false });

      expect(result.skippedDueToInterval).toBe(true);
      expect(result.newEvents).toHaveLength(0);
      expect(notificationsServiceMock.notifyEvent).not.toHaveBeenCalled();
    });
  });
});
