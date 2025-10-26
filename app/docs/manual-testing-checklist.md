# Manual Testing Checklist

This checklist provides step-by-step instructions for manually testing the privacy-first tracking script across different browsers and scenarios.

## Pre-Testing Setup

Before starting manual tests, ensure:

- [ ] Analytics application is deployed and accessible at `https://analytics.franksblog.nl`
- [ ] PostgreSQL database is running and accessible
- [ ] Redis instance is running and accessible
- [ ] Test Gatsby site is deployed with tracking script integrated
- [ ] Database test data is cleared (or you know the baseline count)

## Browser Compatibility Testing

Test the tracking script in the last 2 versions of each supported browser.

### Chrome (Last 2 Versions)

**Current versions to test:** Chrome 129, Chrome 128

#### Basic Functionality

- [ ] Navigate to test site in Chrome
- [ ] Open DevTools → Network tab → Filter by Fetch/XHR
- [ ] Reload page
- [ ] Verify POST request to `/api/track` with status 204
- [ ] Verify request payload contains:
  - `path` (e.g., `/blog/post`)
  - `device_type` (e.g., `desktop`)
  - `user_agent` (Chrome user agent string)
  - `duration_seconds: 0`
  - `added_iso` (ISO timestamp)

#### Duration Tracking

- [ ] Stay on page for 30+ seconds
- [ ] Navigate to different page or close tab
- [ ] Check Network tab for second POST request with `duration_seconds` > 0

#### Device Detection

- [ ] Open DevTools → Device toolbar (Cmd+Shift+M)
- [ ] Set viewport to iPhone 12 (390px width)
- [ ] Reload page
- [ ] Verify `device_type: "mobile"` in POST payload
- [ ] Set viewport to iPad (768px width)
- [ ] Reload page
- [ ] Verify `device_type: "tablet"` in POST payload
- [ ] Set viewport to Desktop (1920px width)
- [ ] Reload page
- [ ] Verify `device_type: "desktop"` in POST payload

#### Do Not Track

- [ ] Enable Do Not Track: Settings → Privacy and security → Send a "Do not track" request
- [ ] Reload test site
- [ ] Verify NO POST requests to `/api/track` appear in Network tab
- [ ] Disable Do Not Track
- [ ] Reload test site
- [ ] Verify POST request appears again

#### UTM Parameters

- [ ] Navigate to test site with UTM parameter: `?utm_source=twitter`
- [ ] Check Network tab POST payload
- [ ] Verify `utm_source: "twitter"` in payload

---

### Firefox (Last 2 Versions)

**Current versions to test:** Firefox 120, Firefox 119

#### Basic Functionality

- [ ] Navigate to test site in Firefox
- [ ] Open DevTools → Network tab → Filter by XHR
- [ ] Reload page
- [ ] Verify POST request to `/api/track` with status 204
- [ ] Verify request payload matches Chrome test results

#### Duration Tracking

- [ ] Stay on page for 30+ seconds
- [ ] Close tab or navigate away
- [ ] Verify second POST request sent with actual duration

#### Device Detection

- [ ] Open DevTools → Responsive Design Mode (Cmd+Option+M)
- [ ] Test mobile (375px), tablet (768px), desktop (1920px)
- [ ] Verify correct `device_type` for each viewport size

#### Do Not Track

- [ ] Enable Do Not Track: Settings → Privacy & Security → Send websites a "Do Not Track" signal
- [ ] Reload test site
- [ ] Verify NO tracking requests sent
- [ ] Disable DNT and verify tracking resumes

#### Beacon API

- [ ] Open Network tab
- [ ] Navigate to test site
- [ ] Check if requests show type "beacon" or "fetch"
- [ ] Firefox should prefer Beacon API for unload events

---

### Safari (Last 2 Versions)

**Current versions to test:** Safari 17, Safari 16

#### Basic Functionality

- [ ] Navigate to test site in Safari
- [ ] Open Web Inspector → Network tab
- [ ] Reload page
- [ ] Verify POST request to `/api/track` with status 204
- [ ] Verify request payload is correct

#### Duration Tracking

- [ ] Stay on page for 30+ seconds
- [ ] Navigate away or close tab
- [ ] Check if beforeunload fires (Safari may block it in some cases)
- [ ] Verify at least initial pageview (duration: 0) was sent

#### Device Detection (macOS)

- [ ] Resize browser window to different widths
- [ ] Reload page after each resize
- [ ] Verify `device_type` changes based on viewport:
  - 700px → mobile
  - 800px → tablet
  - 1400px → desktop

#### Device Detection (iOS)

- [ ] Test on iPhone (mobile device detection)
- [ ] Test on iPad (tablet device detection)
- [ ] Verify `device_type` matches device

#### Do Not Track

- [ ] Safari doesn't have built-in DNT setting
- [ ] Verify tracking works normally in Safari
- [ ] (Optional) Use browser extension to set DNT and test

#### Intelligent Tracking Prevention (ITP)

- [ ] Verify tracking works despite ITP (we don't use cookies so ITP shouldn't affect us)
- [ ] Confirm no console errors related to blocked requests

---

### Edge (Last 2 Versions)

**Current versions to test:** Edge 119, Edge 118

#### Basic Functionality

- [ ] Navigate to test site in Edge
- [ ] Open DevTools → Network tab → Filter by Fetch/XHR
- [ ] Reload page
- [ ] Verify POST request to `/api/track` with status 204
- [ ] Verify payload matches expected structure

#### Duration Tracking

- [ ] Stay on page for 30+ seconds
- [ ] Navigate away or close tab
- [ ] Verify second POST request with actual duration

#### Device Detection

- [ ] Open DevTools → Device Emulation (Cmd+Shift+M)
- [ ] Test mobile, tablet, desktop viewports
- [ ] Verify `device_type` detection

#### Do Not Track

- [ ] Enable DNT: Settings → Privacy → Send "Do Not Track" requests
- [ ] Reload test site
- [ ] Verify tracking is blocked
- [ ] Disable DNT and verify tracking resumes

---

## Feature-Specific Testing

### Bundle Size Verification

- [ ] Download `tracker.min.js` from production
- [ ] Check file size in Finder/Explorer
- [ ] Verify size < 3KB (3072 bytes)
- [ ] Alternative: Check Network tab → Size column for tracker.js request

### CORS Testing

#### Authorized Origin (https://franksblog.nl)

- [ ] Navigate to franksblog.nl
- [ ] Verify tracking requests succeed (204 status)
- [ ] No CORS errors in console

#### Unauthorized Origin

- [ ] Open test HTML file locally (`file://` protocol)
- [ ] Load tracking script
- [ ] Attempt to send tracking request
- [ ] Verify CORS error in console: "has been blocked by CORS policy"
- [ ] (Or test from a different domain if available)

### Script Loading Performance

- [ ] Open DevTools → Network tab
- [ ] Hard reload page (Cmd+Shift+R)
- [ ] Check tracker.js request:
  - [ ] Size < 3KB
  - [ ] Load time < 100ms (over fast connection)
  - [ ] Script is loaded with async/defer (doesn't block rendering)

### Silent Failure Testing

#### API Endpoint Down

- [ ] Stop the analytics API server (or simulate network error)
- [ ] Navigate to test site
- [ ] Verify:
  - [ ] Page loads normally
  - [ ] No JavaScript errors in console
  - [ ] No user-visible errors
  - [ ] Page functionality is not affected

#### Invalid Configuration

- [ ] Edit `gatsby-ssr.js` and set invalid `data-hostname`:
  ```javascript
  data-hostname="invalid-hostname-that-does-not-exist.com"
  ```
- [ ] Deploy and navigate to test site
- [ ] Verify:
  - [ ] Page loads normally
  - [ ] POST request fails (CORS or network error)
  - [ ] No console errors (failures are silent)
  - [ ] Page functionality is not affected

### Data Integrity Testing

Run these tests and verify data in the database:

#### Referrer Tracking

- [ ] Navigate to test site from Twitter: `https://twitter.com` → `https://franksblog.nl/blog/post`
- [ ] Check database:
  ```sql
  SELECT document_referrer FROM pageview ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Verify `document_referrer` is `https://twitter.com`

#### Direct Navigation (No Referrer)

- [ ] Navigate directly to test site (type URL in address bar)
- [ ] Check database
- [ ] Verify `document_referrer` is `NULL` or empty

#### UTM Source Tracking

- [ ] Navigate to test site with UTM: `https://franksblog.nl/blog/post?utm_source=newsletter`
- [ ] Check database:
  ```sql
  SELECT utm_source FROM pageview ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Verify `utm_source` is `newsletter`

#### Path with Query Parameters

- [ ] Navigate to: `https://franksblog.nl/blog/post?ref=twitter&foo=bar`
- [ ] Check database:
  ```sql
  SELECT path FROM pageview ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Verify `path` includes query params: `/blog/post?ref=twitter&foo=bar`

#### Timestamp Accuracy

- [ ] Navigate to test site
- [ ] Note current time
- [ ] Check database:
  ```sql
  SELECT added_iso FROM pageview ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Verify `added_iso` matches current time (within seconds)
- [ ] Verify timestamp includes timezone (ISO 8601 format)

### Unique Visitor Tracking

#### First Visit

- [ ] Clear browser cache and cookies
- [ ] Navigate to test site from a new IP (or wait until tomorrow for daily hash rotation)
- [ ] Check database:
  ```sql
  SELECT is_unique FROM pageview ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Verify `is_unique` is `true`

#### Return Visit (Same Day)

- [ ] Without clearing cache, reload the page (same browser, same IP, same day)
- [ ] Check database:
  ```sql
  SELECT is_unique FROM pageview ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Verify `is_unique` is `false`

### Redis Graceful Degradation

- [ ] Stop Redis server
- [ ] Navigate to test site
- [ ] Verify:
  - [ ] POST request succeeds (204 status)
  - [ ] Pageview is recorded in database
  - [ ] `is_unique` is set to `false` (graceful degradation)
- [ ] Check server logs for Redis error (logged but not exposed to client)
- [ ] Restart Redis

### GeoIP Country Detection

- [ ] Navigate to test site from different IP addresses (use VPN if needed)
- [ ] Check database:
  ```sql
  SELECT country_code FROM pageview ORDER BY created_at DESC LIMIT 5;
  ```
- [ ] Verify country codes match actual IP locations (US, NL, GB, etc.)
- [ ] Verify invalid/local IPs show `NULL` for country_code

---

## Database Verification Queries

Use these SQL queries to verify tracking data integrity:

### View Recent Pageviews

```sql
SELECT
  path,
  document_referrer,
  device_type,
  utm_source,
  duration_seconds,
  is_unique,
  country_code,
  added_iso,
  created_at
FROM pageview
ORDER BY created_at DESC
LIMIT 20;
```

### Count Pageviews by Device Type

```sql
SELECT
  device_type,
  COUNT(*) as pageview_count
FROM pageview
GROUP BY device_type
ORDER BY pageview_count DESC;
```

### Count Unique Visitors

```sql
SELECT
  COUNT(*) FILTER (WHERE is_unique = true) as unique_visitors,
  COUNT(*) as total_pageviews
FROM pageview
WHERE added_iso >= NOW() - INTERVAL '24 hours';
```

### Verify UTM Tracking

```sql
SELECT
  utm_source,
  COUNT(*) as pageview_count
FROM pageview
WHERE utm_source IS NOT NULL
GROUP BY utm_source
ORDER BY pageview_count DESC;
```

### Check Duration Tracking

```sql
SELECT
  path,
  duration_seconds,
  added_iso
FROM pageview
WHERE duration_seconds > 0
ORDER BY created_at DESC
LIMIT 10;
```

---

## Test Result Template

Use this template to document your test results:

```
Date: ___________
Tester: ___________
Environment: [Production/Staging]

### Chrome Testing
- Version: _______
- Basic Functionality: [✓/✗]
- Duration Tracking: [✓/✗]
- Device Detection: [✓/✗]
- Do Not Track: [✓/✗]
- UTM Parameters: [✓/✗]
- Issues: ___________

### Firefox Testing
- Version: _______
- Basic Functionality: [✓/✗]
- Duration Tracking: [✓/✗]
- Device Detection: [✓/✗]
- Do Not Track: [✓/✗]
- Beacon API: [✓/✗]
- Issues: ___________

### Safari Testing
- Version: _______
- Basic Functionality: [✓/✗]
- Duration Tracking: [✓/✗]
- Device Detection (macOS): [✓/✗]
- Device Detection (iOS): [✓/✗]
- ITP Compatibility: [✓/✗]
- Issues: ___________

### Edge Testing
- Version: _______
- Basic Functionality: [✓/✗]
- Duration Tracking: [✓/✗]
- Device Detection: [✓/✗]
- Do Not Track: [✓/✗]
- Issues: ___________

### Feature Testing
- Bundle Size < 3KB: [✓/✗] (Actual: _____ bytes)
- CORS Authorized: [✓/✗]
- CORS Unauthorized: [✓/✗]
- Script Performance: [✓/✗]
- Silent Failure: [✓/✗]
- Data Integrity: [✓/✗]
- Unique Visitors: [✓/✗]
- Redis Degradation: [✓/✗]
- GeoIP Detection: [✓/✗]

### Overall Assessment
- All Tests Passed: [Yes/No]
- Critical Issues: ___________
- Minor Issues: ___________
- Recommendations: ___________
```

---

## Troubleshooting During Testing

### Issue: Tracking requests fail with 400 Bad Request

**Possible Causes:**
- Missing required fields in payload
- Invalid device_type value
- Invalid ISO timestamp
- Path doesn't start with `/`

**Debug Steps:**
1. Check Network tab → Response preview for error details
2. Verify payload structure matches API requirements
3. Check server logs for validation errors

### Issue: Tracking requests fail with 500 Internal Server Error

**Possible Causes:**
- Database connection error
- Redis connection error (without graceful fallback)
- Server-side code error

**Debug Steps:**
1. Check server logs for stack trace
2. Verify PostgreSQL is running and accessible
3. Verify Redis is running and accessible
4. Check database connection string

### Issue: No tracking requests sent at all

**Possible Causes:**
- Do Not Track enabled
- Script failed to load
- JavaScript error preventing execution
- Invalid configuration

**Debug Steps:**
1. Check Console tab for JavaScript errors
2. Verify `navigator.doNotTrack` value in console
3. Check Network tab for tracker.js load success
4. Verify `data-hostname` configuration is correct

### Issue: Duration tracking doesn't work

**Possible Causes:**
- `beforeunload` event blocked by browser
- Page closed too quickly
- JavaScript error in duration calculation

**Debug Steps:**
1. Wait longer on page (30+ seconds) before navigating away
2. Use normal navigation (click link) instead of closing tab
3. Check Console for JavaScript errors
4. Verify initial pageview (duration: 0) was sent successfully

---

## Sign-Off

Once all tests pass, document the testing completion:

**Tested By:** ___________
**Date:** ___________
**Environment:** ___________
**All Tests Passed:** [Yes/No]
**Ready for Production:** [Yes/No]

**Signatures:**
- Tester: ___________
- Reviewer: ___________
- Product Owner: ___________
