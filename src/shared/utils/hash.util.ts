import { createHash } from 'crypto';

/**
 * Generates a deterministic SHA-256 hash for a tracking event.
 * Used to avoid duplicate events and notifications.
 */
export function generateEventHash(
  trackingCode: string,
  status: string,
  description: string,
  location?: string,
  eventDate?: Date | string | number,
): string {
  const normalizedCode = (trackingCode || '').trim().toUpperCase();
  const normalizedStatus = (status || '').trim();
  const normalizedDescription = (description || '').trim();
  const normalizedLocation = (location || '').trim();

  let normalizedDateStr = '';
  if (eventDate instanceof Date) {
    normalizedDateStr = eventDate.toISOString();
  } else if (eventDate) {
    const d = new Date(eventDate);
    normalizedDateStr = isNaN(d.getTime())
      ? String(eventDate)
      : d.toISOString();
  }

  const raw = `${normalizedCode}${normalizedStatus}${normalizedDescription}${normalizedLocation}${normalizedDateStr}`;
  return createHash('sha256').update(raw).digest('hex');
}
