import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'telegraf';
import { UsersService } from '../../users/services/users.service';
import { PackagesService } from '../../packages/services/packages.service';
import { CommandsHandler } from './commands.handler';
import { BotKeyboards } from '../keyboards/bot.keyboards';
import { PackageStatusIcons } from '../../../shared/enums/package-status.enum';

@Injectable()
export class ActionsHandler {
  private readonly logger = new Logger(ActionsHandler.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly packagesService: PackagesService,
    private readonly commandsHandler: CommandsHandler,
  ) {}

  async handleAction(ctx: Context): Promise<void> {
    const callbackData = (ctx.callbackQuery as any)?.data;
    if (!callbackData) return;

    try {
      await ctx.answerCbQuery();
    } catch {
      // Ignored if expired cb query
    }

    const user = await this.commandsHandler.getAuthenticatedUser(ctx);

    if (callbackData === 'cmd_track') {
      await this.commandsHandler.handleRastrear(ctx);
      return;
    }

    if (callbackData === 'cmd_list' || callbackData === 'back_to_list') {
      await this.commandsHandler.handleList(ctx);
      return;
    }

    if (callbackData === 'cancel_flow') {
      await this.commandsHandler.handleCancel(ctx);
      return;
    }

    if (callbackData === 'cmd_settings') {
      const updatedUser = await this.usersService.toggleNotifications(user.id);
      const statusMsg = updatedUser.notificationsEnabled
        ? '🔔 Notificações ativadas com sucesso!'
        : '🔕 Notificações desativadas com sucesso!';
      await ctx.reply(statusMsg, { ...BotKeyboards.mainMenu() });
      return;
    }

    if (callbackData === 'cmd_update_all') {
      await ctx.reply('🔄 Atualizando todas as suas encomendas...');
      const packages = await this.packagesService.getUserPackages(user.id);
      if (packages.length === 0) {
        await ctx.reply('Nenhuma encomenda encontrada.', {
          ...BotKeyboards.mainMenu(),
        });
        return;
      }

      let totalNewEvents = 0;
      for (const pkg of packages) {
        try {
          const res = await this.packagesService.manualUpdate(user.id, pkg.id);
          totalNewEvents += res.newEvents.length;
        } catch (err: any) {
          this.logger.warn(`Could not update pkg ${pkg.id}: ${err.message}`);
        }
      }

      await ctx.reply(
        `✅ Atualização concluída! ${totalNewEvents} nova(s) movimentação(ões) encontrada(s).`,
        { ...BotKeyboards.mainMenu() },
      );
      return;
    }

    if (callbackData.startsWith('pkg_')) {
      const packageId = callbackData.replace('pkg_', '');
      await this.commandsHandler.handleShowPackageDetails(ctx, packageId);
      return;
    }

    if (callbackData.startsWith('history_')) {
      const packageId = callbackData.replace('history_', '');
      await this.commandsHandler.handleShowPackageDetails(ctx, packageId);
      return;
    }

    if (callbackData.startsWith('update_')) {
      const packageId = callbackData.replace('update_', '');
      try {
        await ctx.reply('🔄 Consultando transportadora...');
        const result = await this.packagesService.manualUpdate(
          user.id,
          packageId,
        );
        const pkg = result.package;

        if (result.newEvents.length === 0) {
          // Spec Section 29
          const events = await this.packagesService.getPackageEvents(
            user.id,
            packageId,
          );
          let lastEvtStr = 'Nenhuma movimentação registrada.';
          if (events.length > 0) {
            const last = events[0];
            const evtDate = new Date(last.eventDate);
            const dateStr = `${String(evtDate.getDate()).padStart(2, '0')}/${String(
              evtDate.getMonth() + 1,
            ).padStart(2, '0')}/${evtDate.getFullYear()} às ${String(
              evtDate.getHours(),
            ).padStart(
              2,
              '0',
            )}:${String(evtDate.getMinutes()).padStart(2, '0')}`;
            const icon = PackageStatusIcons[last.status] || '🚚';
            lastEvtStr = `${icon} ${last.description}\n${dateStr}`;
          }

          const message =
            `📦 <b>${pkg.name}</b>\n\n` +
            `Nenhuma nova movimentação encontrada.\n\n` +
            `Última movimentação:\n` +
            `${lastEvtStr}`;

          await ctx.reply(message, {
            parse_mode: 'HTML',
            ...BotKeyboards.packageActions(pkg.id, pkg.trackingEnabled),
          });
        } else {
          await ctx.reply(
            `🔔 <b>${result.newEvents.length} nova(s) movimentação(ões) encontrada(s)!</b>`,
            { parse_mode: 'HTML' },
          );
          await this.commandsHandler.handleShowPackageDetails(ctx, packageId);
        }
      } catch (err: any) {
        this.logger.error(`Error updating package manually: ${err.message}`);
        await ctx.reply(`❌ Erro ao atualizar encomenda: ${err.message}`);
      }
      return;
    }

    if (callbackData.startsWith('toggle_tracking_')) {
      const packageId = callbackData.replace('toggle_tracking_', '');
      try {
        const pkg = await this.packagesService.getPackageById(
          user.id,
          packageId,
        );
        if (pkg.trackingEnabled) {
          await this.packagesService.pauseTracking(user.id, packageId);
          // Spec Section 27
          const message =
            `⏸️ <b>Rastreamento pausado.</b>\n\n` +
            `📦 <b>${pkg.name}</b>\n\n` +
            `Você não receberá novas notificações até retomar o rastreamento.`;
          await ctx.reply(message, {
            parse_mode: 'HTML',
            ...BotKeyboards.packageActions(pkg.id, false),
          });
        } else {
          await this.packagesService.resumeTracking(user.id, packageId);
          const message =
            `▶️ <b>Rastreamento retomado!</b>\n\n` +
            `📦 <b>${pkg.name}</b>\n\n` +
            `As notificações automáticas voltaram a ser ativadas.`;
          await ctx.reply(message, {
            parse_mode: 'HTML',
            ...BotKeyboards.packageActions(pkg.id, true),
          });
        }
      } catch (err: any) {
        await ctx.reply(`❌ Erro: ${err.message}`);
      }
      return;
    }

    if (callbackData.startsWith('remove_confirm_')) {
      const packageId = callbackData.replace('remove_confirm_', '');
      try {
        const pkg = await this.packagesService.getPackageById(
          user.id,
          packageId,
        );
        // Spec Section 28
        const message =
          `⚠️ <b>Deseja remover esta encomenda?</b>\n\n` +
          `📦 <b>${pkg.name}</b>\n` +
          `🔎 <code>${pkg.trackingCode}</code>`;

        await ctx.reply(message, {
          parse_mode: 'HTML',
          ...BotKeyboards.removeConfirmation(pkg.id),
        });
      } catch (err: any) {
        await ctx.reply(`❌ Erro: ${err.message}`);
      }
      return;
    }

    if (callbackData.startsWith('remove_do_')) {
      const packageId = callbackData.replace('remove_do_', '');
      try {
        await this.packagesService.deletePackage(user.id, packageId);
        await ctx.reply('🗑️ Encomenda removida com sucesso!', {
          ...BotKeyboards.mainMenu(),
        });
      } catch (err: any) {
        await ctx.reply(`❌ Erro ao remover encomenda: ${err.message}`);
      }
      return;
    }
  }
}
