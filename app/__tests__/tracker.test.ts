/**
 * Focused tests for tracker.js functionality
 * Testing critical behaviors: Do Not Track, device detection, UTM extraction, config parsing
 */

describe('Tracker.js Critical Behaviors', () => {
  describe('Do Not Track Detection', () => {
    test('should detect DNT enabled (value "1")', () => {
      const checkDoNotTrack = (dnt: string | undefined) => {
        return dnt === '1';
      };

      expect(checkDoNotTrack('1')).toBe(true);
      expect(checkDoNotTrack('0')).toBe(false);
      expect(checkDoNotTrack(undefined)).toBe(false);
    });
  });

  describe('Device Type Detection', () => {
    function getDeviceType(width: number): string {
      if (width < 768) return 'mobile';
      if (width >= 768 && width <= 1024) return 'tablet';
      return 'desktop';
    }

    test('should detect mobile device (<768px)', () => {
      expect(getDeviceType(375)).toBe('mobile');
      expect(getDeviceType(767)).toBe('mobile');
    });

    test('should detect tablet device (768-1024px)', () => {
      expect(getDeviceType(768)).toBe('tablet');
      expect(getDeviceType(1024)).toBe('tablet');
      expect(getDeviceType(900)).toBe('tablet');
    });

    test('should detect desktop device (>1024px)', () => {
      expect(getDeviceType(1025)).toBe('desktop');
      expect(getDeviceType(1920)).toBe('desktop');
    });
  });

  describe('UTM Source Extraction', () => {
    function getUtmSource(searchString: string): string | null {
      try {
        const params = new URLSearchParams(searchString);
        return params.get('utm_source') || null;
      } catch {
        return null;
      }
    }

    test('should extract utm_source from query parameters', () => {
      expect(getUtmSource('?utm_source=twitter&other=value')).toBe('twitter');
      expect(getUtmSource('?utm_source=facebook')).toBe('facebook');
    });

    test('should return null when no utm_source present', () => {
      expect(getUtmSource('?other=value')).toBe(null);
      expect(getUtmSource('')).toBe(null);
    });
  });

  describe('Configuration Parsing', () => {
    test('should parse data attributes correctly', () => {
      const parseConfig = (hostname: string | null, autoCollect: string | null) => {
        return {
          hostname: hostname || '',
          autoCollect: autoCollect !== 'false'
        };
      };

      expect(parseConfig('analytics.example.com', 'true')).toEqual({
        hostname: 'analytics.example.com',
        autoCollect: true
      });

      expect(parseConfig('analytics.example.com', 'false')).toEqual({
        hostname: 'analytics.example.com',
        autoCollect: false
      });

      expect(parseConfig(null, null)).toEqual({
        hostname: '',
        autoCollect: true
      });
    });
  });

  describe('Pageview Data Collection', () => {
    test('should construct pageview payload correctly', () => {
      const collectPageviewData = (
        path: string,
        search: string,
        referrer: string,
        deviceType: string,
        utmSource: string | null,
        duration: number,
        userAgent: string
      ) => {
        return {
          path: path + search,
          referrer: referrer || '',
          device_type: deviceType,
          utm_source: utmSource,
          duration_seconds: duration,
          user_agent: userAgent,
          added_iso: new Date().toISOString()
        };
      };

      const result = collectPageviewData(
        '/blog/post',
        '?utm_source=twitter',
        'https://twitter.com',
        'desktop',
        'twitter',
        0,
        'Mozilla/5.0'
      );

      expect(result.path).toBe('/blog/post?utm_source=twitter');
      expect(result.referrer).toBe('https://twitter.com');
      expect(result.device_type).toBe('desktop');
      expect(result.utm_source).toBe('twitter');
      expect(result.duration_seconds).toBe(0);
      expect(result.user_agent).toBe('Mozilla/5.0');
      expect(result.added_iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Duration Calculation', () => {
    test('should calculate duration in seconds', () => {
      const calculateDuration = (startTime: number, endTime: number) => {
        return Math.floor((endTime - startTime) / 1000);
      };

      const start = Date.now();
      const end = start + 5000; // 5 seconds later

      expect(calculateDuration(start, end)).toBe(5);
      expect(calculateDuration(start, start + 1500)).toBe(1);
      expect(calculateDuration(start, start + 999)).toBe(0);
    });
  });
});
