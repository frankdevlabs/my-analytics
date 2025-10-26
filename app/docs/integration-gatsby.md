# Gatsby Integration Guide

This guide explains how to integrate the privacy-first tracking script into your Gatsby site.

## Overview

The analytics tracker is a lightweight JavaScript snippet (< 3KB) that tracks pageviews without cookies, localStorage, or fingerprinting. It respects the Do Not Track browser setting and provides privacy-first analytics.

## Installation Steps

### Step 1: Add Script to gatsby-ssr.js

Create or edit the `gatsby-ssr.js` file in your Gatsby project root:

```javascript
/**
 * Implement Gatsby Server-Side Rendering APIs
 * https://www.gatsbyjs.com/docs/reference/config-files/gatsby-ssr/
 */

import React from 'react';

export const onRenderBody = ({ setPostBodyComponents }) => {
  setPostBodyComponents([
    <script
      key="analytics-tracker"
      src="https://analytics.franksblog.nl/tracker.js"
      data-hostname="analytics.franksblog.nl"
      data-auto-collect="true"
      async
      defer
    />
  ]);
};
```

### Step 2: Configuration Options

The tracking script accepts two data attributes for configuration:

#### data-hostname (Required)

Specifies the analytics backend hostname where tracking data will be sent.

```html
data-hostname="analytics.franksblog.nl"
```

**Important:** Do NOT include `https://` or trailing slashes. Just the hostname.

#### data-auto-collect (Optional)

Controls whether pageview tracking starts automatically. Defaults to `true`.

```html
data-auto-collect="true"   <!-- Enable automatic tracking (default) -->
data-auto-collect="false"  <!-- Disable automatic tracking -->
```

### Step 3: Verify Installation

After deploying your Gatsby site, verify the tracking script is working:

#### Browser DevTools Verification

1. Open your Gatsby site in a browser
2. Open Developer Tools (F12 or Cmd+Option+I)
3. Go to the **Network** tab
4. Filter by **Fetch/XHR** requests
5. Reload the page
6. Look for a POST request to `https://analytics.franksblog.nl/api/track`
7. Verify the request shows:
   - **Status:** 204 No Content
   - **Type:** beacon or fetch
   - **Payload:** Contains path, device_type, user_agent, etc.

#### Database Verification

Query your PostgreSQL database to confirm pageviews are being recorded:

```sql
SELECT
  path,
  document_referrer,
  device_type,
  utm_source,
  duration_seconds,
  is_unique,
  country_code,
  added_iso
FROM pageview
ORDER BY created_at DESC
LIMIT 10;
```

You should see recent pageviews from your Gatsby site.

## How It Works

### Automatic Pageview Tracking

When a visitor lands on any page of your Gatsby site:

1. **Initial Pageview:** The script immediately sends a pageview event with `duration_seconds: 0`
2. **Duration Tracking:** When the visitor leaves the page (beforeunload event), the script sends an updated pageview with the actual time spent on the page

### Data Collected

The script collects the following privacy-first data:

| Field | Description | Example |
|-------|-------------|---------|
| `path` | Page URL path with query parameters | `/blog/my-post?ref=twitter` |
| `referrer` | HTTP referrer (where visitor came from) | `https://twitter.com` |
| `device_type` | Device category based on viewport width | `desktop`, `mobile`, or `tablet` |
| `utm_source` | UTM source parameter from URL | `twitter` |
| `duration_seconds` | Time spent on page in seconds | `45` |
| `user_agent` | Browser user agent string | `Mozilla/5.0 (Windows NT 10.0...)` |
| `added_iso` | Timestamp in ISO 8601 format | `2025-10-23T14:30:00.123Z` |

**Server-side enrichment:**
- `country_code` - Determined from IP address using MaxMind GeoIP
- `is_unique` - Whether this is a unique visitor (based on IP + User Agent + Date hash)

### Device Type Detection

The script automatically detects device type based on viewport width:

- **Mobile:** `< 768px`
- **Tablet:** `768px - 1024px`
- **Desktop:** `> 1024px`

This detection happens client-side using `window.innerWidth`.

### Privacy Features

The tracking script is designed with privacy as the top priority:

- **No Cookies:** Zero cookies created or read
- **No localStorage:** No persistent storage on the client
- **No Fingerprinting:** No canvas, WebGL, or font fingerprinting
- **Do Not Track:** Respects browser DNT setting (script exits immediately if DNT = 1)
- **IP Privacy:** IP address never sent to client, only used server-side for GeoIP and visitor hashing
- **Daily Hash Rotation:** Visitor hashes reset daily, preventing long-term tracking

## Advanced Configuration

### Disable Automatic Collection

If you want to manually control when tracking occurs:

```javascript
export const onRenderBody = ({ setPostBodyComponents }) => {
  setPostBodyComponents([
    <script
      key="analytics-tracker"
      src="https://analytics.franksblog.nl/tracker.js"
      data-hostname="analytics.franksblog.nl"
      data-auto-collect="false"  // Disable auto-tracking
      async
      defer
    />
  ]);
};
```

**Note:** With `data-auto-collect="false"`, the script will load but not track pageviews. This is useful if you want to implement custom tracking logic.

### Track UTM Parameters

The script automatically extracts `utm_source` from URL query parameters. To track traffic from different sources, use UTM parameters in your links:

```html
<!-- Twitter campaign -->
https://franksblog.nl/blog/my-post?utm_source=twitter

<!-- Newsletter campaign -->
https://franksblog.nl/blog/my-post?utm_source=newsletter

<!-- Google Ads campaign -->
https://franksblog.nl/blog/my-post?utm_source=google_ads
```

The `utm_source` value will be automatically captured and stored with each pageview.

### Multiple Environments

You can use environment variables in `gatsby-ssr.js` to configure different analytics endpoints for development, staging, and production:

```javascript
export const onRenderBody = ({ setPostBodyComponents }) => {
  const analyticsHostname = process.env.GATSBY_ANALYTICS_HOSTNAME || 'analytics.franksblog.nl';

  setPostBodyComponents([
    <script
      key="analytics-tracker"
      src={`https://${analyticsHostname}/tracker.js`}
      data-hostname={analyticsHostname}
      data-auto-collect="true"
      async
      defer
    />
  ]);
};
```

Then set the environment variable:

```bash
# Production
GATSBY_ANALYTICS_HOSTNAME=analytics.franksblog.nl

# Staging
GATSBY_ANALYTICS_HOSTNAME=analytics-staging.franksblog.nl

# Development (optional - omit to disable tracking)
# GATSBY_ANALYTICS_HOSTNAME=localhost:3000
```

## Troubleshooting

### No Tracking Data Appearing

**Problem:** The tracking script loads but no data appears in the database.

**Solutions:**

1. **Check CORS Configuration:** Ensure the API endpoint allows requests from your Gatsby site's domain
2. **Verify Network Requests:** Open browser DevTools → Network tab and confirm the POST request to `/api/track` returns 204
3. **Check Do Not Track:** Ensure DNT is not enabled in your browser (check `navigator.doNotTrack` in console)
4. **Verify Configuration:** Ensure `data-hostname` is set correctly without `https://` or trailing slashes

### CORS Errors in Console

**Problem:** Browser console shows CORS errors when loading the tracking script or sending data.

**Solution:**

The API endpoint is configured to allow CORS from `https://franksblog.nl`. If you're using a different domain, you'll need to update the CORS configuration in `/app/src/app/api/track/route.ts`:

```typescript
headers: {
  'Access-Control-Allow-Origin': 'https://your-domain.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
```

### Script Not Loading

**Problem:** The tracking script is not loaded on the page.

**Solutions:**

1. **Verify File Location:** Ensure `tracker.js` exists in `/app/public/` directory
2. **Check Build Output:** Run `gatsby build` and verify the script tag appears in the generated HTML
3. **Inspect HTML Source:** View page source and confirm the script tag is present in the `<body>`
4. **Clear Cache:** Clear your browser cache and hard reload (Cmd+Shift+R or Ctrl+Shift+R)

### Duplicate Pageviews

**Problem:** Each page load creates two or more pageview entries in the database.

**Explanation:**

This is expected behavior, not a bug. The tracking script intentionally sends **two** pageviews per page visit:

1. **Initial pageview:** Sent immediately on page load with `duration_seconds: 0`
2. **Final pageview:** Sent on `beforeunload` event with actual time spent on page

This approach ensures pageviews are captured even if the visitor leaves before the beforeunload event fires.

### Do Not Track Not Working

**Problem:** Pageviews are still being tracked even with DNT enabled.

**Solution:**

The script checks `navigator.doNotTrack === '1'`. Different browsers may represent DNT differently:

- Chrome/Firefox: `"1"` when enabled
- Safari: May use `"yes"` or `"1"`
- Edge: `"1"` when enabled

Verify DNT is properly set by running this in your browser console:

```javascript
console.log(navigator.doNotTrack);
```

If it shows `"1"`, the script should not execute. If it shows something else, the script may still run.

## Performance Impact

The tracking script is designed to have minimal performance impact:

- **Bundle Size:** < 3KB minified
- **Load Time:** Non-blocking (async/defer attributes)
- **Execution Time:** < 50ms to initialize and send initial pageview
- **Network Impact:** Single POST request per page load (uses Beacon API for optimal performance)

The script uses:
1. **Beacon API** (preferred) for page unload events - guaranteed delivery without blocking page navigation
2. **Fetch with keepalive** (fallback) if Beacon is unavailable

## Browser Compatibility

The tracking script supports:

- **Chrome:** Last 2 versions
- **Firefox:** Last 2 versions
- **Safari:** Last 2 versions
- **Edge:** Last 2 versions

**Not supported:**
- Internet Explorer 11 or older

The script uses modern JavaScript features (URLSearchParams, Beacon API, fetch) that are not available in IE11.

## Security Considerations

### Content Security Policy (CSP)

If your Gatsby site uses a Content Security Policy, add the analytics domain to your allowed sources:

```html
<meta http-equiv="Content-Security-Policy"
      content="
        script-src 'self' https://analytics.franksblog.nl;
        connect-src 'self' https://analytics.franksblog.nl;
      ">
```

Or in Gatsby's gatsby-config.js with a CSP plugin:

```javascript
{
  resolve: 'gatsby-plugin-csp',
  options: {
    directives: {
      'script-src': "'self' https://analytics.franksblog.nl",
      'connect-src': "'self' https://analytics.franksblog.nl"
    }
  }
}
```

### Subresource Integrity (SRI)

For enhanced security, you can add SRI hash to the script tag to verify the file hasn't been tampered with:

```bash
# Generate SRI hash
cat public/tracker.min.js | openssl dgst -sha384 -binary | openssl base64 -A
```

Then add to your script tag:

```javascript
<script
  key="analytics-tracker"
  src="https://analytics.franksblog.nl/tracker.js"
  integrity="sha384-<HASH_HERE>"
  crossOrigin="anonymous"
  data-hostname="analytics.franksblog.nl"
  data-auto-collect="true"
  async
  defer
/>
```

**Note:** You'll need to regenerate the SRI hash whenever the tracking script is updated.

## Testing Your Integration

### Local Testing

To test the integration locally before deploying:

1. Start your Gatsby development server:
   ```bash
   gatsby develop
   ```

2. Open DevTools and watch Network tab for requests to `/api/track`

3. Note: CORS may block local requests. For local testing, you can temporarily update CORS in the API route or test after deploying to production.

### Staging Environment

Always test in a staging environment that matches production:

1. Deploy to staging
2. Verify tracking works in all browsers
3. Check database for test pageviews
4. Confirm DNT setting blocks tracking
5. Test mobile/tablet/desktop device detection

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the Network tab in browser DevTools for error responses
3. Check server logs for API endpoint errors
4. Verify database connectivity and Redis availability

## Changelog

### Version 1.0.0 (2025-10-23)

- Initial release
- Privacy-first pageview tracking
- Do Not Track support
- Device type detection
- UTM source extraction
- Duration tracking
- GeoIP country detection
- Unique visitor tracking
