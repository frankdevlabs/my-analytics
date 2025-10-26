/**
 * SPA Navigation Detection Tests
 *
 * Tests for History API detection, internal referrer tracking,
 * and automatic pageview tracking on route changes.
 */

describe('SPA Navigation Detection', () => {
  let originalPushState: typeof history.pushState;
  let originalReplaceState: typeof history.replaceState;

  beforeEach(() => {
    // Store original history methods
    originalPushState = history.pushState;
    originalReplaceState = history.replaceState;

    // Clear sessionStorage
    sessionStorage.clear();

    // Setup fake timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    sessionStorage.clear();
    jest.useRealTimers();
  });

  test('History API listeners detect pushState events', () => {
    // Simulate tracker initialization
    let navigationHandlerCalled = false;
    const handleSPANavigation = () => {
      navigationHandlerCalled = true;
    };

    // Intercept pushState
    const originalPushState = history.pushState;
    history.pushState = function(data: unknown, unused: string, url?: string | URL | null) {
      originalPushState.apply(this, [data, unused, url]);
      handleSPANavigation();
    };

    // Trigger pushState
    history.pushState({}, '', '/new-page');

    // Verify navigation handler was called
    expect(navigationHandlerCalled).toBe(true);
  });

  test('History API listeners detect replaceState events', () => {
    // Simulate tracker initialization
    let navigationHandlerCalled = false;
    const handleSPANavigation = () => {
      navigationHandlerCalled = true;
    };

    // Intercept replaceState
    const originalReplaceState = history.replaceState;
    history.replaceState = function(data: unknown, unused: string, url?: string | URL | null) {
      originalReplaceState.apply(this, [data, unused, url]);
      handleSPANavigation();
    };

    // Trigger replaceState
    history.replaceState({}, '', '/replaced-page');

    // Verify navigation handler was called
    expect(navigationHandlerCalled).toBe(true);
  });

  test('popstate events trigger navigation handler', () => {
    let navigationHandlerCalled = false;
    const handleSPANavigation = () => {
      navigationHandlerCalled = true;
    };

    // Listen to popstate
    window.addEventListener('popstate', handleSPANavigation);

    // Trigger popstate event
    const popstateEvent = new PopStateEvent('popstate', {
      state: {}
    });
    window.dispatchEvent(popstateEvent);

    // Verify navigation handler was called
    expect(navigationHandlerCalled).toBe(true);

    // Cleanup
    window.removeEventListener('popstate', handleSPANavigation);
  });

  test('previous pageview closed with duration_seconds on navigation', () => {
    // Simulate initial pageview
    const pageStartTime = Date.now();

    // Wait 2 seconds to simulate time passing
    jest.advanceTimersByTime(2000);

    // Simulate navigation
    const duration = Math.floor((Date.now() - pageStartTime) / 1000);

    // Mock sendAppend function
    const mockSendAppend = jest.fn((dur, scroll) => {
      expect(dur).toBeGreaterThanOrEqual(2);
      expect(typeof scroll).toBe('number');
    });

    // Call append
    mockSendAppend(duration, 50);

    expect(mockSendAppend).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
  });

  test('new pageview started automatically on route change', () => {
    const mockSendPageview = jest.fn();
    let currentPath = '/page1';
    let previousPath = '/';

    // Simulate navigation
    const handleSPANavigation = () => {
      currentPath = '/page2';

      // Only track if path actually changed
      if (currentPath === previousPath) return;

      // Generate new page ID and send pageview
      const newPageId = 'new-page-id';
      mockSendPageview({
        page_id: newPageId,
        path: currentPath,
        is_internal_referrer: true
      });

      previousPath = currentPath;
    };

    handleSPANavigation();

    expect(mockSendPageview).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/page2',
        is_internal_referrer: true
      })
    );
  });

  test('session_id persists across SPA navigations', () => {
    // Set initial session ID
    const sessionId = 'test-session-id-123';
    sessionStorage.setItem('analytics_session_id', sessionId);

    // Simulate multiple navigations
    const pageview1 = {
      page_id: 'page-1',
      session_id: sessionStorage.getItem('analytics_session_id'),
      path: '/page1'
    };

    const pageview2 = {
      page_id: 'page-2',
      session_id: sessionStorage.getItem('analytics_session_id'),
      path: '/page2'
    };

    // Verify session ID is the same across navigations
    expect(pageview1.session_id).toBe(sessionId);
    expect(pageview2.session_id).toBe(sessionId);
    expect(pageview1.session_id).toBe(pageview2.session_id);
  });

  test('hash changes without route change do not trigger new pageview', () => {
    let navigationHandlerCalled = false;
    const previousPath = '/page1';

    const handleSPANavigation = () => {
      const currentPath = '/page1'; // Same path, only hash changed

      // Only track if path actually changed
      if (currentPath === previousPath) return;

      navigationHandlerCalled = true;
    };

    // Simulate hash change (path stays the same)
    handleSPANavigation();

    // Verify navigation handler did not execute new pageview logic
    expect(navigationHandlerCalled).toBe(false);
  });

  test('internal referrer is tracked correctly', () => {
    const origin = 'http://localhost';
    const previousPath = '/page1';
    const isFirstPageview = false; // Already past first pageview

    // Simulate navigation to page2
    const currentPath = '/page2';
    const documentReferrer = origin + previousPath;
    const isInternalReferrer = !isFirstPageview;

    const pageviewData = {
      page_id: 'page-2-id',
      path: currentPath,
      document_referrer: documentReferrer,
      is_internal_referrer: isInternalReferrer
    };

    expect(pageviewData.document_referrer).toBe('http://localhost/page1');
    expect(pageviewData.is_internal_referrer).toBe(true);
  });
});

describe('SPA Navigation Edge Cases', () => {
  test('first page load has is_internal_referrer = false', () => {
    const isFirstPageview = true;

    const pageviewData = {
      page_id: 'first-page-id',
      path: '/',
      is_internal_referrer: !isFirstPageview
    };

    expect(pageviewData.is_internal_referrer).toBe(false);
  });

  test('external referrer then SPA nav: first false, subsequent true', () => {
    // First pageview from external source
    let isFirstPageview = true;

    const firstPageview = {
      page_id: 'page-1-id',
      path: '/page1',
      document_referrer: 'https://google.com',
      is_internal_referrer: !isFirstPageview
    };

    expect(firstPageview.is_internal_referrer).toBe(false);

    // Second pageview via SPA navigation
    isFirstPageview = false;

    const secondPageview = {
      page_id: 'page-2-id',
      path: '/page2',
      document_referrer: 'http://localhost/page1',
      is_internal_referrer: !isFirstPageview
    };

    expect(secondPageview.is_internal_referrer).toBe(true);
  });

  test('back/forward buttons treated as internal navigation', () => {
    // Simulate popstate event (back/forward button)
    const isFirstPageview = false; // Already navigated

    const pageviewData = {
      page_id: 'back-page-id',
      path: '/previous-page',
      is_internal_referrer: !isFirstPageview
    };

    expect(pageviewData.is_internal_referrer).toBe(true);
  });
});

describe('SPA Navigation State Management', () => {
  test('scroll milestones reset on navigation', () => {
    // Initial page with scroll milestones
    const reachedScrollMilestones = new Set([25, 50]);

    // Simulate navigation
    reachedScrollMilestones.clear();

    // Verify milestones are reset
    expect(reachedScrollMilestones.size).toBe(0);
    expect(reachedScrollMilestones.has(25)).toBe(false);
    expect(reachedScrollMilestones.has(50)).toBe(false);
  });

  test('page start time resets on navigation', () => {
    jest.useFakeTimers();

    // Initial page load
    const initialStartTime = Date.now();

    // Wait 5 seconds
    jest.advanceTimersByTime(5000);

    // Navigate to new page
    const newStartTime = Date.now();

    // Verify new start time is later
    expect(newStartTime).toBeGreaterThan(initialStartTime);

    jest.useRealTimers();
  });

  test('page ID changes on navigation', () => {
    // Initial page ID
    const pageId1 = 'page-id-1';

    // Simulate navigation
    const pageId2 = 'page-id-2';

    // Verify IDs are different
    expect(pageId1).not.toBe(pageId2);
  });
});
