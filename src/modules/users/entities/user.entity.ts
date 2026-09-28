import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Package } from '../../packages/entities/package.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'telegram_user_id', unique: true })
  telegramUserId: string;

  @Index({ unique: true })
  @Column({ name: 'telegram_chat_id', unique: true })
  telegramChatId: string;

  @Column({ nullable: true })
  username?: string;

  @Column({ name: 'first_name', nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', nullable: true })
  lastName?: string;

  @Column({ name: 'notifications_enabled', default: true })
  notificationsEnabled: boolean;

  @OneToMany(() => Package, (pkg) => pkg.user)
  packages: Package[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
