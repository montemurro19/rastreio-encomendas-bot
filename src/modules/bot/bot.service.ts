import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { CommandsHandler } from './handlers/commands.handler';
import { ActionsHandler } from './handlers/actions.handler';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private bot: Telegraf | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly commandsHandler: CommandsHandler,
    private readonly actionsHandler: ActionsHandler,
  ) {}

  async onModuleInit(): Promise<void> {
    if (
      process.env.IS_WORKER === 'true' ||
      process.env.DISABLE_TELEGRAM_BOT === 'true'
    ) {
      this.logger.log(
        'Running in worker mode. Telegram bot listener is disabled for this process.',
      );
      return;
    }

    const token = this.configService.get<string>('telegram.botToken');
    if (!token) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN is not defined in configuration. Telegram bot listener will not start.',
      );
      return;
    }

    this.bot = new Telegraf(token);

    this.registerMiddlewaresAndHandlers();

    // Launch bot
    try {
      this.bot
        .launch()
        .then(() => {
          this.logger.log('Telegram bot listener started successfully.');
        })
        .catch((err) => {
          this.logger.error(`Error launching Telegram bot: ${err.message}`);
        });
    } catch (err: any) {
      this.logger.error(`Failed to launch Telegram bot: ${err.message}`);
    }
  }

  private registerMiddlewaresAndHandlers(): void {
    if (!this.bot) return;

    // Error handling
    this.bot.catch((err: any, ctx) => {
      this.logger.error(
        `Telegram bot error for update ${ctx.update.update_id}: ${err.message}`,
      );
    });

    // Commands
    this.bot.command('start', (ctx) => this.commandsHandler.handleStart(ctx));
    this.bot.command('rastrear', (ctx) =>
      this.commandsHandler.handleRastrear(ctx),
    );
    this.bot.command('encomendas', (ctx) =>
      this.commandsHandler.handleList(ctx),
    );
    this.bot.command('ajuda', (ctx) => this.commandsHandler.handleHelp(ctx));
    this.bot.command('help', (ctx) => this.commandsHandler.handleHelp(ctx));
    this.bot.command('cancelar', (ctx) =>
      this.commandsHandler.handleCancel(ctx),
    );
    this.bot.command('configuracoes', (ctx) =>
      this.commandsHandler.handleSettings(ctx),
    );

    // Handle parameterized commands like /detalhes, /pausar, /retomar, /remover, /atualizar
    this.bot.command('atualizar', async (ctx) => {
      await this.commandsHandler.handleList(ctx);
    });

    // Callback queries (Buttons)
    this.bot.on('callback_query', (ctx) =>
      this.actionsHandler.handleAction(ctx),
    );

    // Text messages (Conversation state machine)
    this.bot.on('text', (ctx) => this.commandsHandler.handleTextMessage(ctx));
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot) {
      this.logger.log('Stopping Telegram bot...');
      this.bot.stop('App destroyed');
    }
  }

  getTelegrafInstance(): Telegraf | null {
    return this.bot;
  }
}
