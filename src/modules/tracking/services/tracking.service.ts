import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PackagesRepository } from '../../packages/repositories/packages.repository';
import { TrackingEventsRepository } from '../../packages/repositories/tracking-events.repository';
import { TrackingProviderRegistry } from '../providers/tracking-provider.registry';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { Package } from '../../packages/entities/package.entity';
import { TrackingEvent } from '../../packages/entities/tracking-event.entity';
import { PackageStatus } from '../../../shared/enums/package-status.enum';
import { generateEventHash } from '../../../shared/utils/hash.util';
import {
  PackageNotFoundError,
  TrackingProviderNotFoundError,
  CarrierUnavailableError,
} from '../../../shared/errors/custom.errors';

export interface TrackPackageOptions {
  isInitialCheck?: boolean;
  forceCheck?: boolean;
}

export interface TrackPackageResult {
  package: Package;
  newEvents: TrackingEvent[];
  skippedDueToInterval?: boolean;
}

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);
  private readonly intervalMinutes: number;

  constructor(
    @Inject(forwardRef(() => PackagesRepository))
    private readonly packagesRepository: PackagesRepository,
    @Inject(forwardRef(() => TrackingEventsRepository))
    private readonly trackingEventsRepository: TrackingEventsRepository,
    private readonly providerRegistry: TrackingProviderRegistry,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {
    this.intervalMinutes = this.configService.get<number>(
      'tracking.intervalMinutes',
      15,
    );
  }

  async trackPackage(
    packageId: string,
    options: TrackPackageOptions = {},
  ): Promise<TrackPackageResult> {
    const pkg = await this.packagesRepository.findById(packageId, {
      user: true,
    });
    if (!pkg) {
      throw new PackageNotFoundError(packageId);
    }

    // Limit query frequency if not forced or initial
    if (!options.forceCheck && !options.isInitialCheck && pkg.lastCheckedAt) {
      const msSinceLastCheck =
        Date.now() - new Date(pkg.lastCheckedAt).getTime();
      const minIntervalMs = this.intervalMinutes * 60 * 1000;
      if (msSinceLastCheck < minIntervalMs) {
        this.logger.debug(
          `Skipping check for package ${pkg.id} (${pkg.trackingCode}): checked ${Math.round(
            msSinceLastCheck / 1000,
          )}s ago (threshold ${this.intervalMinutes}m).`,
        );
        return {
          package: pkg,
          newEvents: [],
          skippedDueToInterval: true,
        };
      }
    }

    const provider = this.providerRegistry.getProvider(
      pkg.trackingCode,
      pkg.carrier,
    );

    if (!provider) {
      throw new TrackingProviderNotFoundError(pkg.trackingCode);
    }

    this.logger.log(
      `Tracking package ${pkg.id} (${pkg.trackingCode}) with provider ${provider.name}`,
    );

    let result;
    try {
      result = await provider.track(pkg.trackingCode);
    } catch (error: any) {
      this.logger.error(
        `Failed to track package ${pkg.id} via ${provider.name}: ${error.message}`,
      );
      throw error;
    }

    if (result.carrier && !pkg.carrier) {
      pkg.carrier = result.carrier;
    }

    const newEvents: TrackingEvent[] = [];

    // Process all events returned by provider
    for (const evt of result.events) {
      const hash = generateEventHash(
        pkg.trackingCode,
        evt.status,
        evt.description,
        evt.location,
        evt.eventDate,
      );

      const saveResult =
        await this.trackingEventsRepository.saveEventIfNotExists({
          packageId: pkg.id,
          status: evt.status,
          description: evt.description,
          location: evt.location,
          eventDate: evt.eventDate,
          eventHash: hash,
        });

      if (saveResult.isNew) {
        newEvents.push(saveResult.event);
      }
    }

    // Sort new events by date ascending (oldest first) for sequential processing
    newEvents.sort(
      (a, b) =>
        new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
    );

    // Update package status and last checked time
    pkg.lastCheckedAt = new Date();
    if (result.status && result.status !== PackageStatus.UNKNOWN) {
      pkg.status = result.status;
    }

    if (newEvents.length > 0) {
      // Newest event hash
      const latestNewEvent = newEvents[newEvents.length - 1];
      pkg.lastEventHash = latestNewEvent.eventHash;
    }

    // If delivered, automatically disable further tracking (Spec Section 22)
    if (pkg.status === PackageStatus.DELIVERED) {
      this.logger.log(`Package ${pkg.id} is DELIVERED. Disabling tracking.`);
      pkg.trackingEnabled = false;
    }

    const updatedPackage = await this.packagesRepository.save(pkg);

    // Notifications (Spec Section 20: initial check must NOT trigger notifications)
    if (
      !options.isInitialCheck &&
      newEvents.length > 0 &&
      updatedPackage.user
    ) {
      this.logger.log(
        `Dispatching ${newEvents.length} notification(s) for package ${updatedPackage.id}`,
      );
      for (const event of newEvents) {
        try {
          await this.notificationsService.notifyEvent(
            updatedPackage.user,
            updatedPackage,
            event,
          );
        } catch (notifErr: any) {
          this.logger.error(
            `Error notifying event ${event.id} for package ${updatedPackage.id}: ${notifErr.message}`,
          );
        }
      }
    }

    return {
      package: updatedPackage,
      newEvents,
      skippedDueToInterval: false,
    };
  }
}
