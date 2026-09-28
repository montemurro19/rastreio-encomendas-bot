import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Package } from './entities/package.entity';
import { TrackingEvent } from './entities/tracking-event.entity';
import { PackagesRepository } from './repositories/packages.repository';
import { TrackingEventsRepository } from './repositories/tracking-events.repository';
import { PackagesService } from './services/packages.service';
import { PackagesController } from './controllers/packages.controller';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Package, TrackingEvent]),
    forwardRef(() => TrackingModule),
  ],
  controllers: [PackagesController],
  providers: [PackagesRepository, TrackingEventsRepository, PackagesService],
  exports: [PackagesService, PackagesRepository, TrackingEventsRepository],
})
export class PackagesModule {}
