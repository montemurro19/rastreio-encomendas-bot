import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { PackagesModule } from '../packages/packages.module';
import { TrackingModule } from '../tracking/tracking.module';
import { ConversationService } from './conversations/conversation.service';
import { CommandsHandler } from './handlers/commands.handler';
import { ActionsHandler } from './handlers/actions.handler';
import { BotService } from './bot.service';

@Module({
  imports: [ConfigModule, UsersModule, PackagesModule, TrackingModule],
  providers: [ConversationService, CommandsHandler, ActionsHandler, BotService],
  exports: [BotService, ConversationService],
})
export class BotModule {}
