import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

process.env.IS_WORKER = 'true';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');
  logger.log('Initializing BullMQ Tracking Worker process...');

  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();

  logger.log('Tracking Worker is active and listening to BullMQ queues.');
}

bootstrap();
