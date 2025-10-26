/**
 * Tests for Analytics Backfill Script
 *
 * Focused tests for unique visitor recalculation logic using session-based heuristic
 * NOTE: Uses session_id as proxy for visitor identification (visitor_hash not stored in DB)
 * Does NOT test full migration execution (too slow for CI)
 */

import { calculateUniqueVisitors, processPageviewBatch } from '../backfill-analytics';

describe('Analytics Backfill - Unique Visitor Recalculation (Session-Based)', () => {
  it('should mark first session occurrence as unique within 24-hour window', () => {
    // Simulating pageviews from same session across multiple days
    const pageviews = [
      {
        id: 'pv1',
        session_id: 'session_a',
        added_iso: new Date('2025-01-01T10:00:00Z'),
        is_unique: false,
      },
      {
        id: 'pv2',
        session_id: 'session_a',
        added_iso: new Date('2025-01-01T12:00:00Z'), // Same day, 2 hours later
        is_unique: false,
      },
      {
        id: 'pv3',
        session_id: 'session_a',
        added_iso: new Date('2025-01-02T11:00:00Z'), // Next day, within 24h of pv2
        is_unique: false,
      },
      {
        id: 'pv4',
        session_id: 'session_a',
        added_iso: new Date('2025-01-03T13:00:00Z'), // More than 24h after pv3
        is_unique: false,
      },
    ];

    const updates = calculateUniqueVisitors(pageviews);

    // Should return 2 updates: pv1 (first) and pv4 (more than 24h after pv3)
    expect(updates).toHaveLength(2);

    // First occurrence should be marked unique
    const pv1Update = updates.find((u) => u.id === 'pv1');
    expect(pv1Update).toBeDefined();
    expect(pv1Update?.is_unique).toBe(true);

    // Second occurrence same day (2h later) should NOT be in updates (remains false)
    expect(updates.find((u) => u.id === 'pv2')).toBeUndefined();

    // Third occurrence within 24h should NOT be in updates (remains false)
    expect(updates.find((u) => u.id === 'pv3')).toBeUndefined();

    // Fourth occurrence more than 24h after last should be marked unique
    const pv4Update = updates.find((u) => u.id === 'pv4');
    expect(pv4Update).toBeDefined();
    expect(pv4Update?.is_unique).toBe(true);
  });

  it('should handle multiple sessions independently', () => {
    const pageviews = [
      {
        id: 'pv1',
        session_id: 'session_a',
        added_iso: new Date('2025-01-01T10:00:00Z'),
        is_unique: false,
      },
      {
        id: 'pv2',
        session_id: 'session_b',
        added_iso: new Date('2025-01-01T10:05:00Z'),
        is_unique: false,
      },
      {
        id: 'pv3',
        session_id: 'session_a',
        added_iso: new Date('2025-01-01T11:00:00Z'),
        is_unique: false,
      },
      {
        id: 'pv4',
        session_id: 'session_b',
        added_iso: new Date('2025-01-01T11:05:00Z'),
        is_unique: false,
      },
    ];

    const updates = calculateUniqueVisitors(pageviews);

    // Should have exactly 2 updates (first occurrence for each session)
    expect(updates).toHaveLength(2);

    // First occurrence for session_a should be marked unique
    const pv1Update = updates.find((u) => u.id === 'pv1');
    expect(pv1Update).toBeDefined();
    expect(pv1Update?.is_unique).toBe(true);

    // First occurrence for session_b should be marked unique
    const pv2Update = updates.find((u) => u.id === 'pv2');
    expect(pv2Update).toBeDefined();
    expect(pv2Update?.is_unique).toBe(true);

    // Subsequent occurrences should NOT be in updates (remain false)
    expect(updates.find((u) => u.id === 'pv3')).toBeUndefined(); // session_a second
    expect(updates.find((u) => u.id === 'pv4')).toBeUndefined(); // session_b second
  });

  it('should correctly identify updates needed from false to true', () => {
    const pageviews = [
      {
        id: 'pv1',
        session_id: 'session_a',
        added_iso: new Date('2025-01-01T10:00:00Z'),
        is_unique: false,
      },
      {
        id: 'pv2',
        session_id: 'session_a',
        added_iso: new Date('2025-01-01T12:00:00Z'),
        is_unique: false,
      },
    ];

    const updates = calculateUniqueVisitors(pageviews);

    // Should only return pageviews that need updating (false -> true)
    expect(updates).toHaveLength(1);
    expect(updates[0].id).toBe('pv1');
    expect(updates[0].is_unique).toBe(true);
  });
});

describe('Analytics Backfill - Batch Processing', () => {
  it('should handle batch of 1000 records correctly', () => {
    // Generate 1000 pageviews with 100 unique sessions (10 pageviews each)
    const pageviews = [];
    const baseDate = new Date('2025-01-01T00:00:00Z');

    for (let sessionIndex = 0; sessionIndex < 100; sessionIndex++) {
      for (let pvIndex = 0; pvIndex < 10; pvIndex++) {
        const timestamp = new Date(
          baseDate.getTime() + sessionIndex * 60000 + pvIndex * 60000
        ); // 1 minute apart
        pageviews.push({
          id: `pv_${sessionIndex}_${pvIndex}`,
          session_id: `session_${sessionIndex}`,
          added_iso: timestamp,
          is_unique: false,
        });
      }
    }

    const updates = calculateUniqueVisitors(pageviews);

    // Should have exactly 100 updates (first occurrence for each session)
    expect(updates).toHaveLength(100);

    // Verify each session's first pageview is marked unique
    for (let i = 0; i < 100; i++) {
      const firstPageviewId = `pv_${i}_0`;
      const update = updates.find((u) => u.id === firstPageviewId);
      expect(update).toBeDefined();
      expect(update?.is_unique).toBe(true);
    }

    // Total pageviews processed should be 1000
    expect(pageviews).toHaveLength(1000);
  });

  it('should prepare batch updates with correct structure', () => {
    const pageviews = [
      {
        id: 'pv1',
        session_id: 'session_a',
        added_iso: new Date('2025-01-01T10:00:00Z'),
        is_unique: false,
      },
    ];

    const batchUpdates = processPageviewBatch(pageviews);

    // Should return array of update objects
    expect(Array.isArray(batchUpdates)).toBe(true);
    expect(batchUpdates[0]).toHaveProperty('id');
    expect(batchUpdates[0]).toHaveProperty('is_unique');

    // First pageview should be marked unique
    expect(batchUpdates[0].id).toBe('pv1');
    expect(batchUpdates[0].is_unique).toBe(true);
  });
});
