import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { PackageStatus } from '../../../shared/enums/package-status.enum';
import { User } from '../../users/entities/user.entity';
import { TrackingEvent } from './tracking-event.entity';

@Entity('packages')
export class Package {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.packages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 100 })
  name: string;

  @Index()
  @Column({ name: 'tracking_code' })
  trackingCode: string;

  @Column({ nullable: true })
  carrier?: string;

  @Column({
    type: 'enum',
    enum: PackageStatus,
    default: PackageStatus.UNKNOWN,
  })
  status: PackageStatus;

  @Column({ name: 'notifications_enabled', default: true })
  notificationsEnabled: boolean;

  @Index()
  @Column({ name: 'tracking_enabled', default: true })
  trackingEnabled: boolean;

  @Column({ name: 'last_event_hash', nullable: true })
  lastEventHash?: string;

  @Index()
  @Column({
    name: 'last_checked_at',
    type: 'timestamp with time zone',
    nullable: true,
  })
  lastCheckedAt?: Date;

  @OneToMany(() => TrackingEvent, (event) => event.package, { cascade: true })
  events: TrackingEvent[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
