import { Injectable, Logger } from '@nestjs/common';
import { TrackingProvider } from './tracking-provider.interface';
import {
  TrackingResult,
  TrackingEventResult,
} from '../../../shared/types/tracking.types';
import { PackageStatus } from '../../../shared/enums/package-status.enum';
import { normalizeTrackingCode } from '../../../shared/utils/tracking-code.util';

@Injectable()
export class MelhorEnvioTrackingProvider implements TrackingProvider {
  readonly name = 'melhorenvio';
  private readonly logger = new Logger(MelhorEnvioTrackingProvider.name);

  canHandle(trackingCode: string): boolean {
    const code = normalizeTrackingCode(trackingCode);
    return code.startsWith('ME') || code.startsWith('MELHOR');
  }

  async track(trackingCode: string): Promise<TrackingResult> {
    const code = normalizeTrackingCode(trackingCode);
    this.logger.log(`Tracking package ${code} via Melhor Envio provider.`);

    return {
      trackingCode: code,
      status: PackageStatus.POSTED,
      carrier: this.name,
      events: [],
    };
  }
}
