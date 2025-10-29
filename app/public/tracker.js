/**
 * Privacy-First Analytics Tracker
 * Version: 2.1.0
 * License: MIT
 *
 * Based on Simple Analytics (https://github.com/simpleanalytics/scripts)
 * Copyright (c) Simple Analytics
 * MIT License - See https://github.com/simpleanalytics/scripts/blob/main/LICENSE
 *
 * Enhanced tracking script that respects user privacy
 * - No cookies, localStorage, or fingerprinting
 * - Respects Do Not Track browser setting
 * - Collects 36 fields for comprehensive analytics
 * - Supports SPA navigation tracking
 * - Tracks scroll milestones and engagement metrics
 * - Uses CUID2 format for page_id generation
 * - Three-tier transport fallback (sendBeacon → fetch → image beacon)
 */

(function() {
  'use strict';

  // Helper functions

  /**
   * Generate CUID2-compatible ID for browser
   * Format: c[a-z0-9]{24} (25 chars total)
   */
  var generateCuid = function() {
    var t = Date.now().toString(36);
    var r = '';
    var c = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var l = 24 - t.length;
    try {
      var b = new Uint8Array(l);
      crypto.getRandomValues(b);
      for (var i = 0; i < l; i++) r += c[b[i] % 36];
    } catch (e) {
      for (var i = 0; i < l; i++) r += c[Math.floor(Math.random() * 36)];
    }
    return 'c' + t + r;
  };

  /**
   * Generate UUID for session_id (unchanged)
   */
  var generateUUID = function() {
    try {
      return crypto.randomUUID();
    } catch (e) {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0;
        var v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  };

  var getSessionId = function() {
    try {
      var sessionId = sessionStorage.getItem('analytics_session_id');
      if (!sessionId) {
        sessionId = generateUUID();
        sessionStorage.setItem('analytics_session_id', sessionId);
      }
      return sessionId;
    } catch (e) {
      return generateUUID();
    }
  };

  var getDeviceType = function() {
    var width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width >= 768 && width <= 1024) return 'tablet';
    return 'desktop';
  };

  var parseUTMParams = function() {
    try {
      var params = new URLSearchParams(window.location.search);
      return {
        utm_source: params.get('utm_source') || undefined,
        utm_medium: params.get('utm_medium') || undefined,
        utm_campaign: params.get('utm_campaign') || undefined,
        utm_content: params.get('utm_content') || undefined,
        utm_term: params.get('utm_term') || undefined
      };
    } catch (e) {
      return {};
    }
  };

  var getTimezone = function() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      return undefined;
    }
  };

  /**
   * Detect the origin from which this script was loaded
   * This allows the tracker to work across different domains
   * by sending data back to the origin that serves the script
   * Recognizes: tracker.js, tracker.min.js, fb-a7k2.js
   */
  var getScriptOrigin = function() {
    try {
      // Try to find the current script element
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src;
        if (src && (src.indexOf('tracker.js') !== -1 || src.indexOf('tracker.min.js') !== -1 || src.indexOf('fb-a7k2.js') !== -1)) {
          // Extract origin from the script URL
          var url = new URL(src);
          return url.origin;
        }
      }
    } catch (e) {
      // Fallback if detection fails
    }
    // Default to current page origin as fallback
    return window.location.origin;
  };

  /**
   * Base64 encode helper for image beacon
   * Handles potential UTF-8 issues gracefully
   */
  var encodePayload = function(data) {
    try {
      return encodeURIComponent(btoa(JSON.stringify(data)));
    } catch (e) {
      // Fallback for UTF-8 characters
      try {
        return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(data)))));
      } catch (e2) {
        return '';
      }
    }
  };

  /**
   * Three-tier transport fallback system
   * Primary: sendBeacon (designed for analytics, handles page unload)
   * Secondary: fetch with keepalive (wide browser support)
   * Tertiary: Image beacon (universal compatibility, GET request)
   */
  var sendData = function(endpoint, data) {
    try {
      // Primary: sendBeacon (most reliable for page unload)
      if (typeof navigator.sendBeacon === 'function') {
        var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        var sent = navigator.sendBeacon(endpoint, blob);
        if (sent) return;
      }
    } catch (e) {}

    try {
      // Secondary: fetch with keepalive (good browser support)
      if (typeof fetch === 'function') {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          keepalive: true
        }).catch(function() {});
        return;
      }
    } catch (e) {}

    try {
      // Tertiary: Image beacon (universal fallback, ~2000 char URL limit)
      var encoded = encodePayload(data);
      if (encoded) {
        var img = new Image();
        img.src = endpoint + '?data=' + encoded;
      }
    } catch (e) {}
  };

  // Configuration
  var collectDNT = false;
  var apiOrigin = getScriptOrigin();

  // Exit if Do Not Track is enabled
  if (!collectDNT && navigator.doNotTrack === '1') {
    console.log('Analytics tracking disabled due to DNT header');
    return;
  }

  // State variables
  var currentPageId = generateCuid();
  var sessionId = getSessionId();
  var pageStartTime = Date.now();
  var visibilityChanges = 0;
  var previousPath = window.location.pathname;
  var reachedScrollMilestones = new Set();
  var isFirstPageview = true;

  // Track visibility changes
  document.addEventListener('visibilitychange', function() {
    visibilityChanges++;
  });

  /**
   * Calculate scroll percentage
   */
  var calculateScrollPercentage = function() {
    try {
      var docElement = document.documentElement || {};
      var body = document.body || {};
      var scrollTop = docElement.scrollTop || body.scrollTop || 0;
      var clientHeight = docElement.clientHeight || window.innerHeight || 0;
      var scrollHeight = Math.max(
        body.scrollHeight || 0,
        body.offsetHeight || 0,
        docElement.clientHeight || 0,
        docElement.scrollHeight || 0,
        docElement.offsetHeight || 0
      );
      if (scrollHeight <= clientHeight) return 100;
      return Math.min(100, Math.round(((scrollTop + clientHeight) / scrollHeight) * 100));
    } catch (e) {
      return 0;
    }
  };

  /**
   * Collect all 36 fields for pageview tracking
   */
  var collectPageviewData = function() {
    var utmParams = parseUTMParams();
    return {
      page_id: currentPageId,
      session_id: sessionId,
      added_iso: new Date().toISOString(),
      hostname: window.location.hostname,
      path: window.location.pathname,
      hash: window.location.hash || undefined,
      query_string: window.location.search.substring(1) || undefined,
      document_title: document.title || undefined,
      document_referrer: document.referrer || undefined,
      device_type: getDeviceType(),
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      screen_width: window.screen ? window.screen.width : undefined,
      screen_height: window.screen ? window.screen.height : undefined,
      language: navigator.language || undefined,
      timezone: getTimezone(),
      user_agent: navigator.userAgent,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      utm_content: utmParams.utm_content,
      utm_term: utmParams.utm_term,
      duration_seconds: 0,
      visibility_changes: visibilityChanges,
      scrolled_percentage: undefined,
      time_on_page_seconds: undefined,
      is_internal_referrer: !isFirstPageview
    };
  };

  /**
   * Send pageview data to tracking endpoint
   */
  var sendPageview = function(data) {
    var endpoint = apiOrigin + '/api/metrics';
    sendData(endpoint, data);
  };

  /**
   * Send append data
   */
  var sendAppend = function(duration, scrolled) {
    var endpoint = apiOrigin + '/api/metrics/append';
    var data = {
      page_id: currentPageId,
      duration_seconds: duration,
      scrolled_percentage: scrolled
    };
    sendData(endpoint, data);
  };

  /**
   * Track custom event
   */
  var trackEvent = function(eventName, metadata) {
    var endpoint = apiOrigin + '/api/metrics/event';
    var data = {
      event_name: eventName,
      event_metadata: metadata || {},
      page_id: currentPageId,
      session_id: sessionId,
      path: window.location.pathname,
      timestamp: new Date().toISOString()
    };
    sendData(endpoint, data);
  };

  window.trackEvent = trackEvent;

  /**
   * Check and fire scroll milestones
   */
  var checkScrollMilestones = function() {
    var scrollPercentage = calculateScrollPercentage();
    var milestones = [25, 50, 75, 100];
    milestones.forEach(function(milestone) {
      if (scrollPercentage >= milestone && !reachedScrollMilestones.has(milestone)) {
        reachedScrollMilestones.add(milestone);
        trackEvent('scroll_' + milestone, { percentage: milestone });
        var duration = Math.floor((Date.now() - pageStartTime) / 1000);
        sendAppend(duration, Math.floor(scrollPercentage));
      }
    });
  };

  /**
   * Debounce function
   */
  var debounce = function(func, wait) {
    var timeout;
    return function() {
      var context = this;
      var args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function() {
        func.apply(context, args);
      }, wait);
    };
  };

  /**
   * Handle SPA navigation
   */
  var handleSPANavigation = function() {
    var currentPath = window.location.pathname;
    if (currentPath === previousPath) return;
    var duration = Math.floor((Date.now() - pageStartTime) / 1000);
    var scrolled = calculateScrollPercentage();
    sendAppend(duration, scrolled);
    currentPageId = generateCuid();
    pageStartTime = Date.now();
    visibilityChanges = 0;
    reachedScrollMilestones.clear();
    isFirstPageview = false;
    previousPath = currentPath;
    var pageviewData = collectPageviewData();
    sendPageview(pageviewData);
  };

  /**
   * Initialize tracking
   */
  var init = function() {
    var initialPageview = collectPageviewData();
    sendPageview(initialPageview);
    isFirstPageview = false;
    var debouncedScrollCheck = debounce(checkScrollMilestones, 250);
    window.addEventListener('scroll', debouncedScrollCheck);
    var originalPushState = history.pushState;
    history.pushState = function() {
      originalPushState.apply(this, arguments);
      handleSPANavigation();
    };
    var originalReplaceState = history.replaceState;
    history.replaceState = function() {
      originalReplaceState.apply(this, arguments);
      handleSPANavigation();
    };
    window.addEventListener('popstate', handleSPANavigation);
    window.addEventListener('beforeunload', function() {
      var duration = Math.floor((Date.now() - pageStartTime) / 1000);
      var scrolled = calculateScrollPercentage();
      sendAppend(duration, scrolled);
    });
    window.addEventListener('pagehide', function() {
      var duration = Math.floor((Date.now() - pageStartTime) / 1000);
      var scrolled = calculateScrollPercentage();
      sendAppend(duration, scrolled);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
