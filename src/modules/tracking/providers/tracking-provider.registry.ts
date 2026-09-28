import { Injectable, Logger } from '@nestjs/common';
import { TrackingProvider } from './tracking-provider.interface';
import { CorreiosTrackingProvider } from './correios-tracking.provider';
import { MelhorEnvioTrackingProvider } from './melhor-envio-tracking.provider';
import { MockTrackingProvider } from './mock-tracking.provider';

@Injectable()
export class TrackingProviderRegistry {
  private readonly logger = new Logger(TrackingProviderRegistry.name);
  private readonly providers: TrackingProvider[];

  constructor(
    correiosProvider: CorreiosTrackingProvider,
    melhorEnvioProvider: MelhorEnvioTrackingProvider,
    mockProvider: MockTrackingProvider,
  ) {
    this.providers = [correiosProvider, melhorEnvioProvider, mockProvider];
  }

  getProvider(
    trackingCode: string,
    preferredCarrier?: string,
  ): TrackingProvider | null {
    if (preferredCarrier) {
      const match = this.providers.find(
        (p) => p.name.toLowerCase() === preferredCarrier.toLowerCase(),
      );
      if (match) return match;
    }

    for (const provider of this.providers) {
      if (provider.canHandle(trackingCode)) {
        return provider;
      }
    }

    return null;
  }

  getAllProviders(): TrackingProvider[] {
    return [...this.providers];
  }
}
