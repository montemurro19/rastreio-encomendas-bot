import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from '../notifications/notifications.module';
import { PackagesModule } from '../packages/packages.module';
import { CorreiosTrackingProvider } from './providers/correios-tracking.provider';
import { MelhorEnvioTrackingProvider } from './providers/melhor-envio-tracking.provider';
import { MockTrackingProvider } from './providers/mock-tracking.provider';
import { TrackingProviderRegistry } from './providers/tracking-provider.registry';
import { TrackingService } from './services/tracking.service';
import {
  TrackingProcessor,
  TRACKING_QUEUE_NAME,
} from './jobs/tracking.processor';
import { TrackingScheduler } from './jobs/tracking.scheduler';

@Module({
  imports: [
    ConfigModule,
    NotificationsModule,
    forwardRef(() => PackagesModule),
    BullModule.registerQueue({
      name: TRACKING_QUEUE_NAME,
    }),
  ],
  providers: [
    CorreiosTrackingProvider,
    MelhorEnvioTrackingProvider,
    MockTrackingProvider,
    TrackingProviderRegistry,
    TrackingService,
    TrackingProcessor,
    TrackingScheduler,
  ],
  exports: [TrackingService, TrackingProviderRegistry, TrackingScheduler],
})
export class TrackingModule {}
