import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { UsersService } from '../../users/services/users.service';
import { PackagesService } from '../../packages/services/packages.service';
import { ConversationService } from '../conversations/conversation.service';
import { ConversationStep } from '../conversations/conversation.types';
import { BotKeyboards } from '../keyboards/bot.keyboards';
import {
  PackageStatusLabels,
  PackageStatusIcons,
} from '../../../shared/enums/package-status.enum';
import {
  isValidTrackingCode,
  normalizeTrackingCode,
} from '../../../shared/utils/tracking-code.util';
import { TrackingProviderRegistry } from '../../tracking/providers/tracking-provider.registry';

@Injectable()
export class CommandsHandler {
  private readonly logger = new Logger(CommandsHandler.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly packagesService: PackagesService,
    private readonly conversationService: ConversationService,
    private readonly providerRegistry: TrackingProviderRegistry,
  ) {}

  async getAuthenticatedUser(ctx: Context) {
    if (!ctx.from || !ctx.chat) {
      throw new Error('Telegram context missing from/chat');
    }

    return this.usersService.findOrCreate({
      telegramUserId: ctx.from.id.toString(),
      telegramChatId: ctx.chat.id.toString(),
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
    });
  }

  async handleStart(ctx: Context): Promise<void> {
    const user = await this.getAuthenticatedUser(ctx);
    this.conversationService.clearState(ctx.chat!.id.toString());

    const welcome =
      `👋 Olá, <b>${user.firstName || 'usuário'}</b>!\n\n` +
      `Eu sou o seu <b>Rastreador de Encomendas</b>. Comigo você pode acompanhar todas as suas encomendas e ser notificado no Telegram a cada movimentação.\n\n` +
      `Selecione uma opção abaixo ou envie <code>/rastrear</code> para cadastrar uma encomenda:`;

    await ctx.reply(welcome, {
      parse_mode: 'HTML',
      ...BotKeyboards.mainMenu(),
    });
  }

  async handleHelp(ctx: Context): Promise<void> {
    const help =
      `📖 <b>Comandos disponíveis:</b>\n\n` +
      `➕ <code>/rastrear</code> - Cadastrar nova encomenda\n` +
      `📦 <code>/encomendas</code> - Listar suas encomendas\n` +
      `🔄 <code>/atualizar</code> - Atualizar status manualmente\n` +
      `⚙️ <code>/configuracoes</code> - Configurações de notificações\n` +
      `❌ <code>/cancelar</code> - Cancelar operação atual\n` +
      `ℹ️ <code>/ajuda</code> - Exibir esta mensagem de ajuda`;

    await ctx.reply(help, { parse_mode: 'HTML' });
  }

  async handleRastrear(ctx: Context): Promise<void> {
    const chatId = ctx.chat!.id.toString();
    this.conversationService.clearState(chatId);
    this.conversationService.setStep(
      chatId,
      ConversationStep.WAITING_PACKAGE_NAME,
    );

    const message =
      `📦 <b>Vamos cadastrar sua encomenda.</b>\n\n` +
      `Qual é o nome da encomenda?\n\n` +
      `<i>Exemplo:</i>\n` +
      `Teclado mecânico`;

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...BotKeyboards.cancel(),
    });
  }

  async handleList(ctx: Context): Promise<void> {
    const user = await this.getAuthenticatedUser(ctx);
    const packages = await this.packagesService.getUserPackages(user.id);

    if (packages.length === 0) {
      await ctx.reply(
        `📦 Você ainda não possui encomendas cadastradas.\n\nClique no botão abaixo para adicionar sua primeira encomenda!`,
        {
          ...BotKeyboards.mainMenu(),
        },
      );
      return;
    }

    let message = `📦 <b>Suas encomendas</b>\n\n`;
    packages.forEach((pkg, index) => {
      const icon = PackageStatusIcons[pkg.status] || '📦';
      const label = PackageStatusLabels[pkg.status] || pkg.status;
      const trackingState = pkg.trackingEnabled ? '' : ' <i>(Pausado)</i>';
      message += `<b>${index + 1}.</b> ${icon} <b>${pkg.name}</b>${trackingState}\n`;
      message += `   🔎 <code>${pkg.trackingCode}</code>\n`;
      message += `   🚚 ${label}\n\n`;
    });

    message += `Toque em uma encomenda abaixo para ver detalhes e histórico:`;

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...BotKeyboards.packagesList(packages),
    });
  }

  async handleShowPackageDetails(
    ctx: Context,
    packageId: string,
  ): Promise<void> {
    const user = await this.getAuthenticatedUser(ctx);

    try {
      const pkg = await this.packagesService.getPackageById(user.id, packageId);
      const events = await this.packagesService.getPackageEvents(
        user.id,
        packageId,
      );

      const statusIcon = PackageStatusIcons[pkg.status] || '📦';
      const statusLabel = PackageStatusLabels[pkg.status] || pkg.status;
      const carrier = pkg.carrier ? pkg.carrier.toUpperCase() : 'CORREIOS';
      const trackingStatus = pkg.trackingEnabled ? '🟢 Ativo' : '⏸️ Pausado';
      const notifStatus = pkg.notificationsEnabled
        ? '🔔 Ativadas'
        : '🔕 Desativadas';

      let message =
        `📦 <b>${pkg.name}</b>\n` +
        `🔎 Código: <code>${pkg.trackingCode}</code>\n` +
        `🚚 Transportadora: <b>${carrier}</b>\n` +
        `📊 Status: ${statusIcon} <b>${statusLabel}</b>\n` +
        `⚡ Rastreamento: ${trackingStatus}\n` +
        `🔔 Notificações: ${notifStatus}\n\n`;

      if (events.length === 0) {
        message += `📋 <i>Nenhuma movimentação registrada até o momento.</i>`;
      } else {
        message += `📋 <b>Histórico de movimentações:</b>\n\n`;
        events.forEach((evt) => {
          const evtDate = new Date(evt.eventDate);
          const day = String(evtDate.getDate()).padStart(2, '0');
          const month = String(evtDate.getMonth() + 1).padStart(2, '0');
          const year = evtDate.getFullYear();
          const hours = String(evtDate.getHours()).padStart(2, '0');
          const minutes = String(evtDate.getMinutes()).padStart(2, '0');
          const dateStr = `${day}/${month}/${year} às ${hours}:${minutes}`;

          const evtIcon = PackageStatusIcons[evt.status] || '🚚';
          message += `🕐 <b>${dateStr}</b>\n`;
          message += `${evtIcon} ${evt.description}\n`;
          if (evt.location) {
            message += `📍 <i>${evt.location}</i>\n`;
          }
          message += `\n`;
        });
      }

      await ctx.reply(message, {
        parse_mode: 'HTML',
        ...BotKeyboards.packageActions(pkg.id, pkg.trackingEnabled),
      });
    } catch (err: any) {
      this.logger.error(`Error showing package details: ${err.message}`);
      await ctx.reply(
        '❌ Encomenda não encontrada ou você não tem acesso a ela.',
      );
    }
  }

  async handleCancel(ctx: Context): Promise<void> {
    const chatId = ctx.chat!.id.toString();
    this.conversationService.clearState(chatId);
    await ctx.reply('❌ Operação cancelada.', {
      ...BotKeyboards.mainMenu(),
    });
  }

  async handleSettings(ctx: Context): Promise<void> {
    const user = await this.getAuthenticatedUser(ctx);
    const notifStatus = user.notificationsEnabled
      ? '🔔 Ativadas'
      : '🔕 Desativadas';

    const message =
      `⚙️ <b>Configurações</b>\n\n` +
      `Notificações gerais: <b>${notifStatus}</b>\n\n` +
      `Clique no botão abaixo se desejar alterar o recebimento de notificações:`;

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...BotKeyboards.mainMenu(),
    });
  }

  async handleTextMessage(ctx: Context): Promise<void> {
    const text = (ctx.message as any)?.text?.trim();
    if (!text || text.startsWith('/')) {
      return; // Skip commands handled elsewhere
    }

    const chatId = ctx.chat!.id.toString();
    const state = this.conversationService.getState(chatId);

    if (state.step === ConversationStep.WAITING_PACKAGE_NAME) {
      if (text.length < 2 || text.length > 100) {
        await ctx.reply(
          '⚠️ O nome da encomenda deve ter entre 2 e 100 caracteres. Por favor, tente novamente:',
          { ...BotKeyboards.cancel() },
        );
        return;
      }

      this.conversationService.setData(chatId, 'packageName', text);
      this.conversationService.setStep(
        chatId,
        ConversationStep.WAITING_TRACKING_CODE,
      );

      await ctx.reply('🔎 Agora informe o código de rastreamento.', {
        ...BotKeyboards.cancel(),
      });
      return;
    }

    if (state.step === ConversationStep.WAITING_TRACKING_CODE) {
      const normalized = normalizeTrackingCode(text);

      if (!isValidTrackingCode(normalized)) {
        await ctx.reply(
          '❌ Não consegui identificar esse código de rastreamento.\n\nVerifique o código e tente novamente:',
          { ...BotKeyboards.cancel() },
        );
        return;
      }

      const provider = this.providerRegistry.getProvider(normalized);
      if (!provider) {
        await ctx.reply(
          '⚠️ Não consegui identificar automaticamente a transportadora para este código.\n\nVerifique o código e tente novamente:',
          { ...BotKeyboards.cancel() },
        );
        return;
      }

      const packageName = state.data.packageName || 'Minha Encomenda';
      this.conversationService.setStep(chatId, ConversationStep.VALIDATING);

      await ctx.reply('⏳ Cadastrando e consultando encomenda...');

      const user = await this.getAuthenticatedUser(ctx);

      try {
        const pkg = await this.packagesService.createPackage(user.id, {
          name: packageName,
          trackingCode: normalized,
          carrier: provider.name,
        });

        this.conversationService.clearState(chatId);

        const statusLabel =
          PackageStatusLabels[pkg.status] || 'Aguardando atualização';
        const responseMessage =
          `✅ <b>Encomenda cadastrada!</b>\n\n` +
          `📦 <b>${pkg.name}</b>\n` +
          `🔎 <code>${pkg.trackingCode}</code>\n\n` +
          `🚚 Status: <b>${statusLabel}</b>\n\n` +
          `🔔 As próximas movimentações serão enviadas automaticamente.`;

        await ctx.reply(responseMessage, {
          parse_mode: 'HTML',
          ...BotKeyboards.packageActions(pkg.id, pkg.trackingEnabled),
        });
      } catch (err: any) {
        this.logger.error(`Error registering package: ${err.message}`);
        this.conversationService.clearState(chatId);
        await ctx.reply(
          `❌ Ocorreu um erro ao cadastrar a encomenda: ${err.message}`,
          { ...BotKeyboards.mainMenu() },
        );
      }
    }
  }
}
