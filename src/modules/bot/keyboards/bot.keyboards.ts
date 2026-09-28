import { Markup } from 'telegraf';
import { Package } from '../../packages/entities/package.entity';
import { PackageStatusIcons } from '../../../shared/enums/package-status.enum';

export class BotKeyboards {
  static mainMenu(): any {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('➕ Adicionar encomenda', 'cmd_track'),
        Markup.button.callback('📦 Minhas encomendas', 'cmd_list'),
      ],
      [
        Markup.button.callback('🔄 Atualizar todas', 'cmd_update_all'),
        Markup.button.callback('⚙️ Notificações', 'cmd_settings'),
      ],
    ]);
  }

  static cancel(): any {
    return Markup.inlineKeyboard([
      [Markup.button.callback('❌ Cancelar', 'cancel_flow')],
    ]);
  }

  static packageActions(packageId: string, isTrackingEnabled: boolean): any {
    const pauseResumeButton = isTrackingEnabled
      ? Markup.button.callback('⏸️ Pausar', `toggle_tracking_${packageId}`)
      : Markup.button.callback('▶️ Retomar', `toggle_tracking_${packageId}`);

    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🔄 Atualizar', `update_${packageId}`),
        Markup.button.callback('📋 Histórico', `history_${packageId}`),
      ],
      [
        pauseResumeButton,
        Markup.button.callback('🗑️ Remover', `remove_confirm_${packageId}`),
      ],
      [Markup.button.callback('◀️ Voltar para a lista', 'back_to_list')],
    ]);
  }

  static removeConfirmation(packageId: string): any {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Remover', `remove_do_${packageId}`),
        Markup.button.callback('❌ Cancelar', `pkg_${packageId}`),
      ],
    ]);
  }

  static packagesList(packages: Package[]): any {
    const buttons = packages.map((pkg) => {
      const icon = PackageStatusIcons[pkg.status] || '📦';
      const label = `${icon} ${pkg.name}`;
      return [Markup.button.callback(label, `pkg_${pkg.id}`)];
    });

    buttons.push([
      Markup.button.callback('➕ Adicionar encomenda', 'cmd_track'),
      Markup.button.callback('🔄 Atualizar todas', 'cmd_update_all'),
    ]);

    return Markup.inlineKeyboard(buttons);
  }
}
