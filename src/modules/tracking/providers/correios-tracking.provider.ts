import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { TrackingProvider } from './tracking-provider.interface';
import {
  TrackingResult,
  TrackingEventResult,
} from '../../../shared/types/tracking.types';
import { PackageStatus } from '../../../shared/enums/package-status.enum';
import {
  isCorreiosTrackingCode,
  normalizeTrackingCode,
} from '../../../shared/utils/tracking-code.util';
import { CarrierUnavailableError } from '../../../shared/errors/custom.errors';

@Injectable()
export class CorreiosTrackingProvider implements TrackingProvider {
  readonly name = 'correios';
  private readonly logger = new Logger(CorreiosTrackingProvider.name);

  canHandle(trackingCode: string): boolean {
    return isCorreiosTrackingCode(trackingCode);
  }

  async track(trackingCode: string): Promise<TrackingResult> {
    const code = normalizeTrackingCode(trackingCode);

    try {
      // Query BrasilAPI for Correios tracking
      const response = await axios.get(
        `https://brasilapi.com.br/api/rastro/v1/${encodeURIComponent(code)}`,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'TelegramPackageTracker/1.0',
          },
        },
      );

      const data = response.data;
      const rawEvents: any[] = Array.isArray(data?.eventos) ? data.eventos : [];

      const events: TrackingEventResult[] = rawEvents.map((evt) => {
        const desc = evt.descricao || 'Movimentação registrada';
        const status = this.mapStatus(desc, evt.tipo, evt.status);

        let location = '';
        if (evt.origem && evt.destino) {
          location = `${evt.origem} ➡️ ${evt.destino}`;
        } else if (evt.origem) {
          location = evt.origem;
        } else if (evt.unidade?.endereco) {
          const u = evt.unidade.endereco;
          location = [u.cidade, u.uf].filter(Boolean).join(' - ');
        }

        const date = evt.data ? new Date(evt.data) : new Date();

        return {
          status,
          description: desc,
          location: location || undefined,
          eventDate: isNaN(date.getTime()) ? new Date() : date,
          rawData: evt,
        };
      });

      // Sort events newest first
      events.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());

      const currentStatus =
        events.length > 0 ? events[0].status : PackageStatus.POSTED;

      return {
        trackingCode: code,
        status: currentStatus,
        carrier: this.name,
        events,
      };
    } catch (error: any) {
      if (error?.response?.status === 404) {
        this.logger.warn(`Package ${code} not found on Correios yet.`);
        return {
          trackingCode: code,
          status: PackageStatus.UNKNOWN,
          carrier: this.name,
          events: [
            {
              status: PackageStatus.UNKNOWN,
              description: 'Objeto ainda não consta na base dos Correios',
              eventDate: new Date(),
            },
          ],
        };
      }

      this.logger.error(
        `Error querying Correios for ${code}: ${error?.message}`,
      );
      throw new CarrierUnavailableError('Correios', error?.message);
    }
  }

  private mapStatus(
    description: string,
    tipo?: string,
    statusCod?: string,
  ): PackageStatus {
    const desc = (description || '').toLowerCase();
    const type = (tipo || '').toUpperCase();

    if (desc.includes('entregue') || type === 'BDE' || type === 'BDI') {
      return PackageStatus.DELIVERED;
    }
    if (desc.includes('saiu para entrega') || type === 'OEC') {
      return PackageStatus.OUT_FOR_DELIVERY;
    }
    if (
      desc.includes('devolvido') ||
      desc.includes('devolução') ||
      type === 'BDR'
    ) {
      return PackageStatus.RETURNED;
    }
    if (
      desc.includes('atraso') ||
      desc.includes('tentativa de entrega não realizada')
    ) {
      return PackageStatus.DELAYED;
    }
    if (desc.includes('cancelad')) {
      return PackageStatus.CANCELLED;
    }
    if (
      desc.includes('tributação') ||
      desc.includes('aguardando pagamento') ||
      desc.includes('apreendido')
    ) {
      return PackageStatus.EXCEPTION;
    }
    if (desc.includes('postado') || type === 'PO') {
      return PackageStatus.POSTED;
    }
    if (
      desc.includes('trânsito') ||
      desc.includes('encaminhado') ||
      type === 'RO' ||
      type === 'DO'
    ) {
      return PackageStatus.IN_TRANSIT;
    }

    return PackageStatus.IN_TRANSIT;
  }
}
