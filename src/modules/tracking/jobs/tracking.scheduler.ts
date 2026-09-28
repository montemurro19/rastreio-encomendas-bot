import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { TRACKING_QUEUE_NAME, JOB_SCAN_ACTIVE } from './tracking.processor';

@Injectable()
export class TrackingScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(TrackingScheduler.name);

  constructor(
    @InjectQueue(TRACKING_QUEUE_NAME) private readonly trackingQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const intervalMinutes = this.configService.get<number>(
      'tracking.intervalMinutes',
      15,
    );
    const intervalMs = intervalMinutes * 60 * 1000;

    this.logger.log(
      `Initializing tracking scheduler: scanning active packages every ${intervalMinutes} minutes (${intervalMs}ms)`,
    );

    try {
      // Upsert repeatable job scheduler (BullMQ 6)
      await (this.trackingQueue as any).upsertJobScheduler(
        'periodic-tracking-scan',
        { every: intervalMs },
        { name: JOB_SCAN_ACTIVE, data: {} },
      );

      this.logger.log('Tracking scheduler registered successfully.');
    } catch (error: any) {
      this.logger.error(
        `Failed to register repeatable tracking job: ${error.message}`,
      );
    }
  }

  /**
   * Allows manually triggering a full scan now.
   */
  async triggerScanNow(): Promise<void> {
    await this.trackingQueue.add(
      JOB_SCAN_ACTIVE,
      {},
      { removeOnComplete: true },
    );
  }
}
