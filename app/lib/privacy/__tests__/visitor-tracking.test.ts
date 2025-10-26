import { checkAndRecordVisitor } from '../visitor-tracking';
import { getRedisClient } from '../../redis';

jest.mock('../../redis');

const mockRedisClient = {
  get: jest.fn(),
  setEx: jest.fn(),
};

describe('checkAndRecordVisitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockResolvedValue(mockRedisClient);
  });

  afterEach(async () => {
    jest.resetAllMocks();
  });

  it('should return true for new visitor and store hash with 24-hour TTL', async () => {
    const hash = 'abc123def456';
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.setEx.mockResolvedValue('OK');

    const result = await checkAndRecordVisitor(hash);

    expect(result).toBe(true);
    expect(mockRedisClient.get).toHaveBeenCalledWith(`visitor:hash:${hash}`);
    expect(mockRedisClient.setEx).toHaveBeenCalledWith(
      `visitor:hash:${hash}`,
      86400,
      '1'
    );
  });

  it('should return false for existing visitor', async () => {
    const hash = 'abc123def456';
    mockRedisClient.get.mockResolvedValue('1');

    const result = await checkAndRecordVisitor(hash);

    expect(result).toBe(false);
    expect(mockRedisClient.get).toHaveBeenCalledWith(`visitor:hash:${hash}`);
    expect(mockRedisClient.setEx).not.toHaveBeenCalled();
  });

  // UPDATED TEST: Redis graceful degradation should return true (assume unique visitor)
  it('should return true when Redis is unavailable (graceful degradation)', async () => {
    const hash = 'abc123def456';
    (getRedisClient as jest.Mock).mockRejectedValue(
      new Error('Redis connection failed')
    );

    const result = await checkAndRecordVisitor(hash);

    // Should return true to prefer overcounting over undercounting to zero
    expect(result).toBe(true);
  });

  // NEW TEST: Test Redis error on get operation
  it('should return true when Redis get operation fails', async () => {
    const hash = 'abc123def456';
    mockRedisClient.get.mockRejectedValue(new Error('Redis get failed'));

    const result = await checkAndRecordVisitor(hash);

    expect(result).toBe(true);
  });

  it('should use correct key naming pattern', async () => {
    const hash = '1234567890abcdef';
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.setEx.mockResolvedValue('OK');

    await checkAndRecordVisitor(hash);

    expect(mockRedisClient.get).toHaveBeenCalledWith('visitor:hash:1234567890abcdef');
    expect(mockRedisClient.setEx).toHaveBeenCalledWith(
      'visitor:hash:1234567890abcdef',
      86400,
      '1'
    );
  });
});
