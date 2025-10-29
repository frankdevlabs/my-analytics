/**
 * Tests for Active Visitors API Call Updates (Task Group 4)
 *
 * Verifies that getActiveVisitors() accepts zero arguments
 */

import { GET as getActiveVisitors } from '../../src/app/api/active-visitors/route';

describe('Active Visitors API Signature', () => {
  describe('getActiveVisitors function signature', () => {
    test('function accepts zero arguments', async () => {
      // This test verifies that getActiveVisitors can be called with no arguments
      const response = await getActiveVisitors();

      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });

    test('function returns expected visitor count structure', async () => {
      const response = await getActiveVisitors();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('count');
      expect(typeof data.count === 'number' || data.count === null).toBe(true);
    });

    test('function returns valid response without request parameter', async () => {
      const response = await getActiveVisitors();

      expect(response).toBeInstanceOf(Response);
      expect(response.headers).toBeDefined();
    });
  });
});
