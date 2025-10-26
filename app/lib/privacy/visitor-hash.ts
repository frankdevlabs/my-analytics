import crypto from 'crypto';

/**
 * Format date to YYYY-MM-DD string
 */
function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate SHA-256 hash for visitor identification
 * Combines IP address, User-Agent, and date for daily rotating privacy-first tracking
 *
 * @param ip - Visitor IP address
 * @param userAgent - Browser User-Agent string
 * @param date - Date for hash generation (enables daily rotation)
 * @returns Hex-encoded SHA-256 hash (64 characters)
 */
export function generateVisitorHash(
  ip: string,
  userAgent: string,
  date: Date
): string {
  if (!ip || ip.trim() === '') {
    throw new Error('IP address is required and cannot be empty');
  }

  if (!userAgent || userAgent.trim() === '') {
    throw new Error('User-Agent is required and cannot be empty');
  }

  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Valid date is required');
  }

  const dateString = formatDateYYYYMMDD(date);
  const combinedString = `${ip}${userAgent}${dateString}`;

  const hash = crypto
    .createHash('sha256')
    .update(combinedString)
    .digest('hex');

  return hash;
}
