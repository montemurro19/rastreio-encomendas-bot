import { Injectable } from '@nestjs/common';
import { TrackingProvider } from './tracking-provider.interface';
import {
  TrackingResult,
  TrackingEventResult,
} from '../../../shared/types/tracking.types';
import { PackageStatus } from '../../../shared/enums/package-status.enum';
import { normalizeTrackingCode } from '../../../shared/utils/tracking-code.util';

@Injectable()
export class MockTrackingProvider implements TrackingProvider {
  readonly name = 'mock';

  canHandle(trackingCode: string): boolean {
    const code = normalizeTrackingCode(trackingCode);
    return (
      code.startsWith('TEST') ||
      code.startsWith('MOCK') ||
      code.startsWith('DEMO')
    );
  }

  async track(trackingCode: string): Promise<TrackingResult> {
    const code = normalizeTrackingCode(trackingCode);

    // If code contains DELIVERED, simulate delivered status
    if (code.includes('DELIVERED') || code.includes('ENTREGUE')) {
      const events: TrackingEventResult[] = [
        {
          status: PackageStatus.DELIVERED,
          description: 'Objeto entregue ao destinatário',
          location: 'São Paulo - SP',
          eventDate: new Date('2026-09-28T16:42:00Z'),
        },
        {
          status: PackageStatus.OUT_FOR_DELIVERY,
          description: 'Objeto saiu para entrega ao destinatário',
          location: 'CDD São Paulo - SP',
          eventDate: new Date('2026-09-28T13:00:00Z'),
        },
        {
          status: PackageStatus.POSTED,
          description: 'Objeto postado',
          location: 'Agência Central - São Paulo - SP',
          eventDate: new Date('2026-09-27T10:00:00Z'),
        },
      ];

      return {
        trackingCode: code,
        status: PackageStatus.DELIVERED,
        carrier: this.name,
        events,
      };
    }

    // Default mock: In transit
    const events: TrackingEventResult[] = [
      {
        status: PackageStatus.IN_TRANSIT,
        description: 'Objeto em trânsito - por favor aguarde',
        location: 'Unidade de Tratamento - São Paulo/SP',
        eventDate: new Date('2026-09-28T13:21:00Z'),
      },
      {
        status: PackageStatus.POSTED,
        description: 'Objeto postado após o horário limite da agência',
        location: 'Agência dos Correios - São Paulo/SP',
        eventDate: new Date('2026-09-27T18:00:00Z'),
      },
    ];

    return {
      trackingCode: code,
      status: PackageStatus.IN_TRANSIT,
      carrier: this.name,
      events,
    };
  }
}
