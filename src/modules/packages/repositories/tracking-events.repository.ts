import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackingEvent } from '../entities/tracking-event.entity';

@Injectable()
export class TrackingEventsRepository {
  private readonly logger = new Logger(TrackingEventsRepository.name);

  constructor(
    @InjectRepository(TrackingEvent)
    private readonly repo: Repository<TrackingEvent>,
  ) {}

  async findByPackageId(packageId: string): Promise<TrackingEvent[]> {
    return this.repo.find({
      where: { packageId },
      order: { eventDate: 'DESC' },
    });
  }

  async findByPackageIdAndHash(
    packageId: string,
    eventHash: string,
  ): Promise<TrackingEvent | null> {
    return this.repo.findOne({
      where: { packageId, eventHash },
    });
  }

  /**
   * Saves a tracking event idempotently.
   * If an event with the same (package_id, event_hash) already exists,
   * returns null or the existing event, avoiding duplication.
   */
  async saveEventIfNotExists(
    eventData: Partial<TrackingEvent>,
  ): Promise<{ event: TrackingEvent; isNew: boolean }> {
    if (!eventData.packageId || !eventData.eventHash) {
      throw new Error(
        'packageId and eventHash are required to save a tracking event',
      );
    }

    const existing = await this.findByPackageIdAndHash(
      eventData.packageId,
      eventData.eventHash,
    );

    if (existing) {
      return { event: existing, isNew: false };
    }

    try {
      const newEntity = this.repo.create(eventData);
      const saved = await this.repo.save(newEntity);
      return { event: saved, isNew: true };
    } catch (error: any) {
      // 23505 is PostgreSQL unique_violation code
      if (
        error?.code === '23505' ||
        error?.message?.includes('UQ_package_event_hash')
      ) {
        this.logger.debug(
          `Unique constraint hit for package ${eventData.packageId} and hash ${eventData.eventHash}. Returning existing.`,
        );
        const existingAfterRace = await this.findByPackageIdAndHash(
          eventData.packageId,
          eventData.eventHash,
        );
        return { event: existingAfterRace!, isNew: false };
      }
      throw error;
    }
  }
}
