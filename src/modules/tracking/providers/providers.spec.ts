import { CorreiosTrackingProvider } from './correios-tracking.provider';
import { MelhorEnvioTrackingProvider } from './melhor-envio-tracking.provider';
import { MockTrackingProvider } from './mock-tracking.provider';
import { TrackingProviderRegistry } from './tracking-provider.registry';
import { PackageStatus } from '../../../shared/enums/package-status.enum';

describe('Tracking Providers and Registry', () => {
  let correiosProvider: CorreiosTrackingProvider;
  let melhorEnvioProvider: MelhorEnvioTrackingProvider;
  let mockProvider: MockTrackingProvider;
  let registry: TrackingProviderRegistry;

  beforeEach(() => {
    correiosProvider = new CorreiosTrackingProvider();
    melhorEnvioProvider = new MelhorEnvioTrackingProvider();
    mockProvider = new MockTrackingProvider();
    registry = new TrackingProviderRegistry(
      correiosProvider,
      melhorEnvioProvider,
      mockProvider,
    );
  });

  describe('canHandle & Registry resolution', () => {
    it('should route standard Correios codes to CorreiosTrackingProvider', () => {
      expect(correiosProvider.canHandle('AA123456789BR')).toBe(true);
      const resolved = registry.getProvider('AA123456789BR');
      expect(resolved?.name).toBe('correios');
    });

    it('should route Melhor Envio codes to MelhorEnvioTrackingProvider', () => {
      expect(melhorEnvioProvider.canHandle('ME-123456')).toBe(true);
      const resolved = registry.getProvider('ME-123456');
      expect(resolved?.name).toBe('melhorenvio');
    });

    it('should route TEST/MOCK codes to MockTrackingProvider', () => {
      expect(mockProvider.canHandle('TEST123456')).toBe(true);
      const resolved = registry.getProvider('TEST123456');
      expect(resolved?.name).toBe('mock');
    });

    it('should honor preferredCarrier when provided', () => {
      const resolved = registry.getProvider('ANYCODE', 'melhorenvio');
      expect(resolved?.name).toBe('melhorenvio');
    });

    it('should return null for unrecognized code without matching provider', () => {
      const resolved = registry.getProvider('XYZ999');
      expect(resolved).toBeNull();
    });
  });

  describe('MockTrackingProvider tracking', () => {
    it('should return in_transit status for standard mock code', async () => {
      const result = await mockProvider.track('TEST123456');
      expect(result.trackingCode).toBe('TEST123456');
      expect(result.status).toBe(PackageStatus.IN_TRANSIT);
      expect(result.events.length).toBeGreaterThan(0);
    });

    it('should return delivered status when code contains DELIVERED', async () => {
      const result = await mockProvider.track('TEST-DELIVERED-123');
      expect(result.status).toBe(PackageStatus.DELIVERED);
      expect(result.events[0].status).toBe(PackageStatus.DELIVERED);
    });
  });
});
