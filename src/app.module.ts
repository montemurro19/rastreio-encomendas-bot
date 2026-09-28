import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { telegramConfig } from './config/telegram.config';
import { trackingConfig } from './config/tracking.config';

import { User } from './modules/users/entities/user.entity';
import { Package } from './modules/packages/entities/package.entity';
import { TrackingEvent } from './modules/packages/entities/tracking-event.entity';

import { UsersModule } from './modules/users/users.module';
import { PackagesModule } from './modules/packages/packages.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { BotModule } from './modules/bot/bot.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, telegramConfig, trackingConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>('database.url');
        const sync = configService.get<boolean>('database.synchronize', true);
        const logging = configService.get<boolean>('database.logging', false);

        if (dbUrl) {
          return {
            type: 'postgres',
            url: dbUrl,
            entities: [User, Package, TrackingEvent],
            synchronize: sync,
            logging,
          };
        }

        return {
          type: 'postgres',
          host: configService.get<string>('database.host', 'localhost'),
          port: configService.get<number>('database.port', 5432),
          username: configService.get<string>('database.username', 'postgres'),
          password: configService.get<string>('database.password', 'postgres'),
          database: configService.get<string>(
            'database.database',
            'rastreio_bot',
          ),
          entities: [User, Package, TrackingEvent],
          synchronize: sync,
          logging,
        };
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>(
          'tracking.redisUrl',
          'redis://localhost:6379',
        );
        try {
          const parsed = new URL(redisUrl);
          return {
            connection: {
              host: parsed.hostname || 'localhost',
              port: parseInt(parsed.port || '6379', 10),
              username: parsed.username || undefined,
              password: parsed.password || undefined,
              maxRetriesPerRequest: null,
            },
          };
        } catch {
          return {
            connection: {
              host: 'localhost',
              port: 6379,
              maxRetriesPerRequest: null,
            },
          };
        }
      },
    }),
    UsersModule,
    PackagesModule,
    TrackingModule,
    NotificationsModule,
    BotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
