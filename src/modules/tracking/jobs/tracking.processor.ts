import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { TrackingService } from '../services/tracking.service';
import { PackagesRepository } from '../../packages/repositories/packages.repository';
import { ConfigService } from '@nestjs/config';

export const TRACKING_QUEUE_NAME = 'tracking-queue';
export const JOB_PROCESS_PACKAGE = 'process-package';
export const JOB_SCAN_ACTIVE = 'scan-active-packages';

@Processor(TRACKING_QUEUE_NAME)
export class TrackingProcessor extends WorkerHost {
  private readonly logger = new Logger(TrackingProcessor.name);
  private readonly jobAttempts: number;
  private readonly intervalMinutes: number;

  constructor(
    private readonly trackingService: TrackingService,
    @Inject(forwardRef(() => PackagesRepository))
    private readonly packagesRepository: PackagesRepository,
    private readonly configService: ConfigService,
    @InjectQueue(TRACKING_QUEUE_NAME) private readonly trackingQueue: Queue,
  ) {
    super();
    this.jobAttempts = this.configService.get<number>(
      'tracking.jobAttempts',
      3,
    );
    this.intervalMinutes = this.configService.get<number>(
      'tracking.intervalMinutes',
      15,
    );
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing job ${job.id} (${job.name}) - attempt ${job.attemptsMade + 1}`,
    );

    switch (job.name) {
      case JOB_SCAN_ACTIVE:
        return this.handleScanActivePackages();
      case JOB_PROCESS_PACKAGE:
        return this.handleProcessPackage(job);
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        return null;
    }
  }

  private async handleScanActivePackages(): Promise<{ enqueuedCount: number }> {
    this.logger.log('Scanning active packages for tracking check...');

    // Packages that have not been checked in the last intervalMinutes
    const threshold = new Date(Date.now() - this.intervalMinutes * 60 * 1000);
    const activePackages =
      await this.packagesRepository.findActiveForTracking(threshold);

    this.logger.log(
      `Found ${activePackages.length} active packages due for check.`,
    );

    let enqueuedCount = 0;
    for (const pkg of activePackages) {
      await this.trackingQueue.add(
        JOB_PROCESS_PACKAGE,
        { packageId: pkg.id },
        {
          attempts: this.jobAttempts,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      enqueuedCount++;
    }

    return { enqueuedCount };
  }

  private async handleProcessPackage(
    job: Job<{ packageId: string }>,
  ): Promise<any> {
    const { packageId } = job.data;
    if (!packageId) {
      throw new Error('Missing packageId in job data');
    }

    try {
      const result = await this.trackingService.trackPackage(packageId, {
        isInitialCheck: false,
        forceCheck: false,
      });

      this.logger.log(
        `Job ${job.id} finished for package ${packageId}. New events: ${result.newEvents.length}. Skipped: ${result.skippedDueToInterval}`,
      );

      return {
        packageId,
        newEventsCount: result.newEvents.length,
        status: result.package.status,
      };
    } catch (error: any) {
      this.logger.error(
        `Error processing tracking job for package ${packageId} (attempt ${job.attemptsMade + 1}/${this.jobAttempts}): ${error.message}`,
      );
      throw error; // Throw so BullMQ retries according to attempts configuration
    }
  }
}
