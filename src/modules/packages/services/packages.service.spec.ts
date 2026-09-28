import { PackagesService } from './packages.service';
import { PackagesRepository } from '../repositories/packages.repository';
import { TrackingEventsRepository } from '../repositories/tracking-events.repository';
import { TrackingService } from '../../tracking/services/tracking.service';
import { TrackingProviderRegistry } from '../../tracking/providers/tracking-provider.registry';
import { PackageStatus } from '../../../shared/enums/package-status.enum';
import { Package } from '../entities/package.entity';
import { UnauthorizedPackageAccessError } from '../../../shared/errors/custom.errors';

describe('PackagesService', () => {
  let service: PackagesService;
  let packagesRepoMock: Partial<PackagesRepository>;
  let eventsRepoMock: Partial<TrackingEventsRepository>;
  let trackingServiceMock: Partial<TrackingService>;
  let providerRegistryMock: Partial<TrackingProviderRegistry>;

  const dummyPackage: Package = {
    id: 'pkg-1',
    userId: 'user-1',
    user: { id: 'user-1' } as any,
    name: 'Teclado Mecânico',
    trackingCode: 'AA123456789BR',
    status: PackageStatus.UNKNOWN,
    notificationsEnabled: true,
    trackingEnabled: true,
    events: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    packagesRepoMock = {
      create: jest
        .fn()
        .mockImplementation((data) =>
          Promise.resolve({ ...dummyPackage, ...data }),
        ),
      findById: jest.fn().mockResolvedValue(dummyPackage),
      findByUserId: jest.fn().mockResolvedValue([dummyPackage]),
      save: jest.fn().mockImplementation((pkg) => Promise.resolve(pkg)),
      delete: jest.fn().mockResolvedValue(true),
    };

    eventsRepoMock = {
      findByPackageId: jest.fn().mockResolvedValue([]),
    };

    trackingServiceMock = {
      trackPackage: jest.fn().mockResolvedValue({
        package: dummyPackage,
        newEvents: [],
        skippedDueToInterval: false,
      }),
    };

    providerRegistryMock = {
      getProvider: jest.fn().mockReturnValue({ name: 'correios' } as any),
    };

    service = new PackagesService(
      packagesRepoMock as PackagesRepository,
      eventsRepoMock as TrackingEventsRepository,
      trackingServiceMock as TrackingService,
      providerRegistryMock as TrackingProviderRegistry,
    );
  });

  describe('createPackage', () => {
    it('should normalize tracking code, create package and trigger initial track without notifying', async () => {
      const created = await service.createPackage('user-1', {
        name: ' Teclado Mecânico ',
        trackingCode: ' aa 123456789 br ',
      });

      expect(packagesRepoMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          name: 'Teclado Mecânico',
          trackingCode: 'AA123456789BR',
          trackingEnabled: true,
          notificationsEnabled: true,
        }),
      );

      // Section 20: First check must be called with isInitialCheck: true
      expect(trackingServiceMock.trackPackage).toHaveBeenCalledWith(
        dummyPackage.id,
        expect.objectContaining({ isInitialCheck: true, forceCheck: true }),
      );
      expect(created).toBeDefined();
    });
  });

  describe('Security & User Ownership (Section 36)', () => {
    it('should allow user to get their own package', async () => {
      const pkg = await service.getPackageById('user-1', 'pkg-1');
      expect(pkg).toBe(dummyPackage);
    });

    it('should throw UnauthorizedPackageAccessError if user tries to access another user package', async () => {
      await expect(
        service.getPackageById('other-user-999', 'pkg-1'),
      ).rejects.toThrow(UnauthorizedPackageAccessError);
    });
  });

  describe('Pause & Resume tracking (Section 27)', () => {
    it('should pause tracking setting trackingEnabled = false', async () => {
      const paused = await service.pauseTracking('user-1', 'pkg-1');
      expect(paused.trackingEnabled).toBe(false);
      expect(packagesRepoMock.save).toHaveBeenCalled();
    });

    it('should resume tracking setting trackingEnabled = true', async () => {
      dummyPackage.trackingEnabled = false;
      const resumed = await service.resumeTracking('user-1', 'pkg-1');
      expect(resumed.trackingEnabled).toBe(true);
      expect(packagesRepoMock.save).toHaveBeenCalled();
    });
  });
});
