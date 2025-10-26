import { generateVisitorHash } from '../visitor-hash';

describe('generateVisitorHash', () => {
  it('should generate consistent hash for same inputs', () => {
    const ip = '192.168.1.1';
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
    const date = new Date('2025-10-15T10:30:00Z');

    const hash1 = generateVisitorHash(ip, userAgent, date);
    const hash2 = generateVisitorHash(ip, userAgent, date);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should generate different hashes for different dates', () => {
    const ip = '192.168.1.1';
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
    const date1 = new Date('2025-10-15T10:30:00Z');
    const date2 = new Date('2025-10-16T10:30:00Z');

    const hash1 = generateVisitorHash(ip, userAgent, date1);
    const hash2 = generateVisitorHash(ip, userAgent, date2);

    expect(hash1).not.toBe(hash2);
  });

  it('should throw error for empty IP address', () => {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
    const date = new Date('2025-10-15T10:30:00Z');

    expect(() => generateVisitorHash('', userAgent, date)).toThrow(
      'IP address is required and cannot be empty'
    );
  });

  it('should throw error for empty User-Agent', () => {
    const ip = '192.168.1.1';
    const date = new Date('2025-10-15T10:30:00Z');

    expect(() => generateVisitorHash(ip, '', date)).toThrow(
      'User-Agent is required and cannot be empty'
    );
  });
});
