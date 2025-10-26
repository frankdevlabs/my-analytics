# Tracker Build Process

## Overview

The privacy-first tracking script (`tracker.js`) requires minification to meet the <3KB bundle size constraint. This document outlines the build process, development vs production strategy, and verification steps.

## Build Scripts

### Available Commands

```bash
# Minify tracker.js to tracker.min.js
npm run build:tracker

# Full production build (includes tracker minification)
npm run build

# Development server (serves unminified tracker.js)
npm run dev
```

### Build Configuration

The minification script is located at `/scripts/minify-tracker.js` and uses Terser for JavaScript optimization.

**Minification Options:**
- Remove all comments except preamble
- Compress whitespace and dead code
- Mangle variable names
- Drop console statements in production
- 3-pass optimization for maximum compression

**Output:**
- Input: `/public/tracker.js` (unminified source)
- Output: `/public/tracker.min.js` (production-ready)

## Bundle Size Verification

The build script automatically verifies the bundle size constraint:

```bash
$ npm run build:tracker

✓ Minification complete!
  Original size:  3722 bytes (3.63 KB)
  Minified size:  1336 bytes (1.30 KB)
  Compression:    64.1%

✓ Bundle size check passed (< 3KB)
```

**Bundle Size Constraint:** Minified file MUST be < 3KB (3072 bytes)

If the bundle exceeds 3KB, the build will fail with exit code 1.

## Development vs Production Strategy

### Development Environment

**File Served:** `/tracker.js` (unminified)

**Benefits:**
- Readable code for debugging
- Full source comments
- Easier to test and modify
- No build step required during development

**Usage:**
```bash
npm run dev
# Access at http://localhost:3000/tracker.js
```

### Production Environment

**File Served:** `/tracker.min.js` (minified)

**Benefits:**
- Optimized bundle size (1.3KB)
- Faster download and parse time
- Reduced bandwidth usage

**Usage:**
```bash
npm run build
npm run start
# Access at https://analytics.franksblog.nl/tracker.min.js
```

## Serving Static Files

Next.js automatically serves files from the `/public` directory at the root URL path.

**Static File Access:**
- `/public/tracker.js` → `https://analytics.franksblog.nl/tracker.js`
- `/public/tracker.min.js` → `https://analytics.franksblog.nl/tracker.min.js`

**HTTP Headers:**
```
Content-Type: application/javascript; charset=UTF-8
Cache-Control: public, max-age=0
```

No additional Next.js configuration is required for static file serving.

## Integration Example

### Development Integration

```html
<script
  src="http://localhost:3000/tracker.js"
  data-hostname="localhost:3000"
  data-auto-collect="true"
  async
  defer
></script>
```

### Production Integration

```html
<script
  src="https://analytics.franksblog.nl/tracker.min.js"
  data-hostname="analytics.franksblog.nl"
  data-auto-collect="true"
  async
  defer
></script>
```

## Build Testing

Automated tests verify build process integrity:

```bash
npm test -- __tests__/build-process.test.ts
```

**Test Coverage:**
- Minified file exists
- Bundle size < 3KB
- Valid JavaScript syntax
- Compression ratio > 50%
- Version comment preserved

## Troubleshooting

### Build fails with "Bundle size exceeds 3KB"

**Solution:** Reduce tracker.js code size by:
1. Removing unnecessary features
2. Simplifying logic
3. Using shorter variable names in source
4. Removing debug logging

### Minified file not updating

**Solution:**
```bash
# Clear build cache and rebuild
rm -f public/tracker.min.js
npm run build:tracker
```

### Wrong file served in production

**Verify file paths:**
```bash
ls -lh public/tracker*
curl -I https://analytics.franksblog.nl/tracker.min.js
```

## Continuous Integration

The production build process automatically runs minification:

```json
{
  "scripts": {
    "build": "npm run build:tracker && next build"
  }
}
```

This ensures `tracker.min.js` is always up-to-date before deployment.

## Version Management

The tracker version is embedded in the preamble comment:

```javascript
/* Privacy-First Analytics Tracker v1.0.0 */
```

Update the version in both:
1. `/public/tracker.js` (source file header)
2. `/scripts/minify-tracker.js` (preamble configuration)
