import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PackagesRepository } from '../repositories/packages.repository';
import { TrackingEventsRepository } from '../repositories/tracking-events.repository';
import {
  TrackingService,
  TrackPackageResult,
} from '../../tracking/services/tracking.service';
import { TrackingProviderRegistry } from '../../tracking/providers/tracking-provider.registry';
import { CreatePackageDto } from '../dto/create-package.dto';
import { UpdatePackageDto } from '../dto/update-package.dto';
import { Package } from '../entities/package.entity';
import { TrackingEvent } from '../entities/tracking-event.entity';
import {
  normalizeTrackingCode,
  isValidTrackingCode,
} from '../../../shared/utils/tracking-code.util';
import { PackageStatus } from '../../../shared/enums/package-status.enum';
import {
  PackageNotFoundError,
  TrackingProviderNotFoundError,
  UnauthorizedPackageAccessError,
} from '../../../shared/errors/custom.errors';

@Injectable()
export class PackagesService {
  private readonly logger = new Logger(PackagesService.name);

  constructor(
    private readonly packagesRepository: PackagesRepository,
    private readonly trackingEventsRepository: TrackingEventsRepository,
    @Inject(forwardRef(() => TrackingService))
    private readonly trackingService: TrackingService,
    @Inject(forwardRef(() => TrackingProviderRegistry))
    private readonly providerRegistry: TrackingProviderRegistry,
  ) {}

  /**
   * Registers a new package, performs initial tracking check without notifying.
   */
  async createPackage(userId: string, dto: CreatePackageDto): Promise<Package> {
    const normalizedCode = normalizeTrackingCode(dto.trackingCode);
    const trimmedName = dto.name.trim();

    if (!isValidTrackingCode(normalizedCode)) {
      throw new BadRequestException('Código de rastreamento inválido');
    }

    const provider = this.providerRegistry.getProvider(
      normalizedCode,
      dto.carrier,
    );
    if (!provider) {
      throw new TrackingProviderNotFoundError(normalizedCode);
    }

    this.logger.log(
      `Creating package "${trimmedName}" (${normalizedCode}) for user ${userId}`,
    );

    const newPackage = await this.packagesRepository.create({
      userId,
      name: trimmedName,
      trackingCode: normalizedCode,
      carrier: dto.carrier || provider.name,
      status: PackageStatus.UNKNOWN,
      trackingEnabled: true,
      notificationsEnabled: true,
    });

    // Execute first check (Spec Section 20: does NOT generate notifications)
    try {
      const trackResult = await this.trackingService.trackPackage(
        newPackage.id,
        {
          isInitialCheck: true,
          forceCheck: true,
        },
      );
      return trackResult.package;
    } catch (trackError: any) {
      this.logger.warn(
        `Initial track failed for package ${newPackage.id}: ${trackError.message}. Package still created.`,
      );
      return newPackage;
    }
  }

  async getUserPackages(userId: string): Promise<Package[]> {
    return this.packagesRepository.findByUserId(userId);
  }

  async getPackageById(userId: string, packageId: string): Promise<Package> {
    const pkg = await this.packagesRepository.findById(packageId, {
      events: true,
      user: true,
    });
    if (!pkg) {
      throw new PackageNotFoundError(packageId);
    }

    if (pkg.userId !== userId) {
      throw new UnauthorizedPackageAccessError();
    }

    return pkg;
  }

  async getPackageEvents(
    userId: string,
    packageId: string,
  ): Promise<TrackingEvent[]> {
    // Validate ownership
    await this.getPackageById(userId, packageId);
    return this.trackingEventsRepository.findByPackageId(packageId);
  }

  async pauseTracking(userId: string, packageId: string): Promise<Package> {
    const pkg = await this.getPackageById(userId, packageId);
    pkg.trackingEnabled = false;
    return this.packagesRepository.save(pkg);
  }

  async resumeTracking(userId: string, packageId: string): Promise<Package> {
    const pkg = await this.getPackageById(userId, packageId);
    pkg.trackingEnabled = true;
    return this.packagesRepository.save(pkg);
  }

  async deletePackage(userId: string, packageId: string): Promise<boolean> {
    await this.getPackageById(userId, packageId);
    return this.packagesRepository.delete(packageId);
  }

  async updatePackage(
    userId: string,
    packageId: string,
    dto: UpdatePackageDto,
  ): Promise<Package> {
    const pkg = await this.getPackageById(userId, packageId);
    if (dto.name !== undefined) pkg.name = dto.name.trim();
    if (dto.notificationsEnabled !== undefined)
      pkg.notificationsEnabled = dto.notificationsEnabled;
    if (dto.trackingEnabled !== undefined)
      pkg.trackingEnabled = dto.trackingEnabled;
    return this.packagesRepository.save(pkg);
  }

  async manualUpdate(
    userId: string,
    packageId: string,
  ): Promise<TrackPackageResult> {
    // Validate ownership
    await this.getPackageById(userId, packageId);
    return this.trackingService.trackPackage(packageId, {
      forceCheck: true,
      isInitialCheck: false,
    });
  }

  async getActivePackagesForTracking(olderThan?: Date): Promise<Package[]> {
    return this.packagesRepository.findActiveForTracking(olderThan);
  }
}
