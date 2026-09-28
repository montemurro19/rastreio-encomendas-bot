/**
 * Normalizes a tracking code:
 * - Trims leading and trailing spaces
 * - Removes internal whitespace
 * - Converts to uppercase
 */
export function normalizeTrackingCode(code: string): string {
  if (!code) return '';
  return code.replace(/\s+/g, '').toUpperCase();
}

/**
 * Checks if a code matches the Brazilian Correios pattern:
 * 2 uppercase letters + 9 digits + 2 uppercase letters (e.g. AA123456789BR)
 */
export function isCorreiosTrackingCode(code: string): boolean {
  const normalized = normalizeTrackingCode(code);
  return /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/.test(normalized);
}

/**
 * Basic format validation:
 * Ensure it has between 4 and 50 characters, only alphanumeric characters and hyphens.
 */
export function isValidTrackingCode(code: string): boolean {
  const normalized = normalizeTrackingCode(code);
  if (normalized.length < 4 || normalized.length > 50) {
    return false;
  }
  return /^[A-Z0-9-]+$/.test(normalized);
}
