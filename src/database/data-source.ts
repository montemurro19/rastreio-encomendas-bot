import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { User } from '../modules/users/entities/user.entity';
import { Package } from '../modules/packages/entities/package.entity';
import { TrackingEvent } from '../modules/packages/entities/tracking-event.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,

  entities: [User, Package, TrackingEvent],

  migrations: ['dist/database/migrations/*.js'],

  synchronize: false,
});
