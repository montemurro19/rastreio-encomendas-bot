import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { PackageStatus } from '../../../shared/enums/package-status.enum';
import { Package } from './package.entity';

@Entity('tracking_events')
@Unique('UQ_package_event_hash', ['packageId', 'eventHash'])
export class TrackingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'package_id', type: 'uuid' })
  packageId: string;

  @ManyToOne(() => Package, (pkg) => pkg.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  package: Package;

  @Column({
    type: 'enum',
    enum: PackageStatus,
  })
  status: PackageStatus;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  location?: string;

  @Index()
  @Column({ name: 'event_date', type: 'timestamp with time zone' })
  eventDate: Date;

  @Column({ name: 'event_hash' })
  eventHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
