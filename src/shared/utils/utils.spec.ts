import { generateEventHash } from './hash.util';
import {
  normalizeTrackingCode,
  isCorreiosTrackingCode,
  isValidTrackingCode,
} from './tracking-code.util';
import { PackageStatus } from '../enums/package-status.enum';

describe('Shared Utils', () => {
  describe('Tracking Code Normalization & Validation', () => {
    it('should normalize tracking code by removing whitespace and converting to uppercase', () => {
      expect(normalizeTrackingCode(' aa 123456789 br ')).toBe('AA123456789BR');
      expect(normalizeTrackingCode('nl 123 456 789 br')).toBe('NL123456789BR');
      expect(normalizeTrackingCode('')).toBe('');
    });

    it('should validate Correios tracking codes properly', () => {
      expect(isCorreiosTrackingCode('AA123456789BR')).toBe(true);
      expect(isCorreiosTrackingCode('nl987654321br')).toBe(true);
      expect(isCorreiosTrackingCode('INVALID123')).toBe(false);
      expect(isCorreiosTrackingCode('1234567890123')).toBe(false);
    });

    it('should validate generic tracking codes within character limits', () => {
      expect(isValidTrackingCode('AA123456789BR')).toBe(true);
      expect(isValidTrackingCode('ME-12345')).toBe(true);
      expect(isValidTrackingCode('ABC')).toBe(false); // too short (< 4)
      expect(isValidTrackingCode('A'.repeat(51))).toBe(false); // too long (> 50)
      expect(isValidTrackingCode('CODE with special !@#')).toBe(false);
    });
  });

  describe('Event Hash Generation (Deterministic SHA-256)', () => {
    it('should generate deterministic sha256 hash', () => {
      const date = new Date('2026-09-28T13:21:00.000Z');
      const hash1 = generateEventHash(
        'AA123456789BR',
        PackageStatus.IN_TRANSIT,
        'Objeto em trânsito',
        'São Paulo - SP',
        date,
      );

      const hash2 = generateEventHash(
        'AA123456789BR',
        PackageStatus.IN_TRANSIT,
        'Objeto em trânsito',
        'São Paulo - SP',
        date,
      );

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should generate different hashes for different events or dates', () => {
      const date1 = new Date('2026-09-28T13:21:00.000Z');
      const date2 = new Date('2026-09-28T14:21:00.000Z');

      const hash1 = generateEventHash(
        'AA123456789BR',
        PackageStatus.IN_TRANSIT,
        'Objeto em trânsito',
        'São Paulo - SP',
        date1,
      );

      const hash2 = generateEventHash(
        'AA123456789BR',
        PackageStatus.IN_TRANSIT,
        'Objeto em trânsito',
        'São Paulo - SP',
        date2,
      );

      expect(hash1).not.toBe(hash2);
    });
  });
});
