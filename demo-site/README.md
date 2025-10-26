# My Analytics Demo Site

A Gatsby-powered demonstration website showcasing My Analytics tracking capabilities including pageview tracking, custom events, UTM parameters, and multi-page session tracking.

## Overview

This demo site demonstrates the full capabilities of the My Analytics platform through a clean, minimal website with trackable interactions. It serves as both a testing ground for the analytics system and a reference implementation for developers integrating My Analytics into their own projects.

### Purpose

- **Demonstrate tracking capabilities**: Pageviews, custom events, UTM parameters, session tracking
- **Provide integration example**: Shows how to integrate My Analytics tracking script into a Gatsby site
- **Enable testing**: Offers interactive elements to test various tracking scenarios
- **Serve as documentation**: Working code example for developers

### Technologies

- **Framework**: Gatsby 5.x (React-based static site generator)
- **Runtime**: Node.js 20+
- **UI Library**: React 18
- **Styling**: Vanilla CSS (mobile-first, responsive)
- **Package Manager**: npm

## Prerequisites

Before running the demo site, ensure you have the following installed and configured:

### Required Software

- **Node.js 20+** (LTS recommended) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)

### Required Services

**IMPORTANT**: The main My Analytics app MUST be running on `localhost:3000` for tracking to work.

The demo site depends on:
- **Tracking script**: Loaded from `http://localhost:3000/tracker.min.js`
- **API endpoint**: Sends data to `http://localhost:3000/api/track`
- **Analytics dashboard**: View tracked events at `http://localhost:3000/dashboard`

See the main project README for instructions on setting up and running the My Analytics app.

## Quick Start (5-Minute Setup)

Follow these steps to get the demo site running in under 5 minutes:

### Step 1: Start the Main Analytics App

First, ensure the main My Analytics app is running:

```bash
# From the project root directory
cd app

# Start the development server
npm run dev
```

Verify the app is running by visiting `http://localhost:3000` in your browser.

### Step 2: Install Demo Site Dependencies

Open a new terminal window and navigate to the demo site:

```bash
# From the project root directory
cd demo-site

# Install dependencies
npm install
```

This should complete in 1-2 minutes.

### Step 3: Start the Demo Site

```bash
# Start the Gatsby development server
npm run develop
```

The demo site will be available at `http://localhost:8000`

### Step 4: Verify Setup

1. Open `http://localhost:8000` in your browser
2. Navigate between pages
3. Click trackable buttons on the Demo page
4. Submit the contact form
5. Check `http://localhost:3000/dashboard` to see tracked events

**Setup complete!** You should now see pageviews and events appearing in your analytics dashboard.

## Development Workflow

### Starting the Development Environment

You need TWO terminal windows running simultaneously:

**Terminal 1 - Main Analytics App**:
```bash
cd app
npm run dev
# Runs on http://localhost:3000
```

**Terminal 2 - Demo Site**:
```bash
cd demo-site
npm run develop
# Runs on http://localhost:8000
```

### Available Scripts

```bash
# Start development server (http://localhost:8000)
npm run develop

# Alternative command for development
npm start

# Build for production
npm run build

# Serve production build locally (http://localhost:9000)
npm run serve

# Clean Gatsby cache and build artifacts
npm run clean

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Development Tips

- **Hot Reloading**: The Gatsby development server supports hot module replacement - changes to components and styles are reflected immediately
- **Clean Cache**: If you encounter build issues, run `npm run clean` to clear Gatsby's cache
- **Port Conflicts**: If port 8000 is in use, Gatsby will automatically try port 8001, 8002, etc.

## Project Structure

```
demo-site/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── Layout.js        # Main layout wrapper
│   │   ├── Header.js        # Navigation header
│   │   └── Footer.js        # Site footer
│   ├── pages/               # File-based routing pages
│   │   ├── index.js         # Homepage (/)
│   │   ├── about.js         # About page (/about)
│   │   ├── demo.js          # Interactive demo (/demo)
│   │   ├── contact.js       # Contact form (/contact)
│   │   ├── thank-you.js     # Confirmation page (/thank-you)
│   │   └── 404.js           # Not found page
│   └── styles/
│       └── global.css       # Global styles and CSS variables
├── static/
│   └── favicon.ico          # Site favicon
├── gatsby-config.js         # Gatsby configuration
├── gatsby-browser.js        # Browser APIs (tracking script loading)
├── package.json             # Dependencies and scripts
└── README.md                # This file
```

## Tracking Configuration

### Tracking Script Integration

The demo site integrates the My Analytics tracking script via `gatsby-browser.js`:

**Script Source**: `http://localhost:3000/tracker.min.js`
**API Endpoint**: `http://localhost:3000/api/track`

The tracking script is loaded asynchronously on initial page load and provides:
- Automatic pageview tracking
- Custom event tracking API
- UTM parameter extraction
- Session management

### Features Being Demonstrated

#### 1. Pageview Tracking

**What it tracks**: Every page load and navigation event

**How it works**:
- Initial page load is automatically tracked
- Gatsby route changes (SPA navigation) are detected and tracked
- Each pageview includes: URL, referrer, user agent, viewport size, etc.

**How to test**:
1. Visit `http://localhost:8000`
2. Navigate between pages using the header navigation
3. Check the analytics dashboard to see pageviews logged

#### 2. Custom Event Tracking

**What it tracks**: User interactions with buttons and forms

**Trackable Elements**:
- **Demo Page Buttons**:
  - "Try Analytics Now" button (`event: button_click`, `button_id: demo-cta`)
  - "Download Report" button (`event: button_click`, `button_id: download-report`)
- **Contact Form**:
  - Form submission (`event: form_submit`, `form_type: contact`)

**How to test**:
1. Go to `http://localhost:8000/demo`
2. Click the "Try Analytics Now" button
3. Click the "Download Report" button
4. Fill out and submit the contact form at `http://localhost:8000/contact`
5. Check the analytics dashboard to see custom events logged

#### 3. UTM Parameter Tracking

**What it tracks**: Campaign parameters from URL query strings

**Supported Parameters**:
- `utm_source` - Traffic source (e.g., google, facebook, newsletter)
- `utm_medium` - Marketing medium (e.g., cpc, email, social)
- `utm_campaign` - Campaign name (e.g., spring_sale, product_launch)
- `utm_term` - Paid search terms (optional)
- `utm_content` - Ad content variant (optional)

**How to test**:
1. Visit the demo site with UTM parameters:
   ```
   http://localhost:8000/?utm_source=demo&utm_medium=test&utm_campaign=gatsby
   ```
2. Navigate to other pages - UTM parameters persist for the session
3. Check the analytics dashboard to see UTM data associated with pageviews

**Example UTM URLs**:
```
http://localhost:8000/?utm_source=github&utm_medium=readme&utm_campaign=documentation
http://localhost:8000/demo?utm_source=twitter&utm_medium=social&utm_campaign=launch
http://localhost:8000/?utm_source=email&utm_medium=newsletter&utm_campaign=weekly
```

#### 4. Multi-Page Session Tracking

**What it tracks**: User sessions across multiple page visits

**How it works**:
- Each visitor gets a unique session ID stored in sessionStorage
- Session ID persists across page navigation within the same browser session
- Session ends when browser tab/window is closed

**How to test**:
1. Open browser developer tools (F12)
2. Go to Application/Storage tab > Session Storage
3. Look for `my-analytics-session` key
4. Navigate between pages and verify the session ID remains constant
5. Check the analytics dashboard to see events grouped by session

## Verification & Testing

### Verifying Pageview Tracking

1. **Start both servers** (main app on port 3000, demo site on port 8000)
2. **Open the analytics dashboard** at `http://localhost:3000/dashboard`
3. **Visit the demo site** at `http://localhost:8000`
4. **Navigate between pages** using the header links
5. **Check the dashboard** - you should see pageviews for:
   - `/` (Homepage)
   - `/about` (About page)
   - `/demo` (Demo page)
   - `/contact` (Contact page)
   - `/thank-you` (Thank you page)

### Testing Custom Events

1. **Go to the demo page** at `http://localhost:8000/demo`
2. **Click the buttons**:
   - "Try Analytics Now" button
   - "Download Report" button
3. **Submit the contact form** at `http://localhost:8000/contact`
4. **Check the analytics dashboard** - you should see events with:
   - Event name: `button_click` or `form_submit`
   - Metadata showing button ID or form type

### Testing UTM Parameters

1. **Visit with UTM parameters**:
   ```
   http://localhost:8000/?utm_source=demo&utm_medium=test&utm_campaign=gatsby
   ```
2. **Navigate to other pages** (UTM data should persist)
3. **Check the analytics dashboard** - pageviews should include:
   - utm_source: "demo"
   - utm_medium: "test"
   - utm_campaign: "gatsby"

### Testing Session Tracking

1. **Open browser DevTools** (F12 or right-click > Inspect)
2. **Go to Application tab** > Session Storage > `http://localhost:8000`
3. **Look for `my-analytics-session`** key with a UUID value
4. **Navigate between pages** - verify the session ID stays the same
5. **Check the analytics dashboard** - all events should share the same session_id
6. **Close the tab and open a new one** - a new session ID should be generated

### Debugging Tracking Issues

#### Tracking Script Not Loading

**Problem**: Events not appearing in dashboard

**Solution**:
1. Open browser DevTools > Network tab
2. Refresh the page
3. Look for request to `tracker.min.js`
4. If missing or 404:
   - Verify main app is running on port 3000
   - Check `gatsby-browser.js` for correct script URL
   - Try clearing Gatsby cache: `npm run clean && npm run develop`

#### Events Not Sending

**Problem**: Script loads but events don't appear in dashboard

**Solution**:
1. Open browser DevTools > Console tab
2. Look for errors related to tracking
3. Open DevTools > Network tab
4. Filter by "track" to see API requests
5. Verify requests to `/api/track` return 200 status
6. Check request payload to see what data is being sent

#### UTM Parameters Not Captured

**Problem**: UTM parameters in URL but not showing in dashboard

**Solution**:
1. Verify URL includes UTM parameters (check address bar)
2. Open DevTools > Console
3. Type: `sessionStorage.getItem('my-analytics-utm')`
4. Should return JSON with UTM data
5. Refresh page and check Network tab for UTM data in pageview request

#### Session ID Changes on Every Page

**Problem**: Each page navigation creates new session

**Solution**:
1. Check DevTools > Console for sessionStorage errors
2. Verify sessionStorage is enabled (not in private/incognito mode)
3. Type: `sessionStorage.getItem('my-analytics-session')`
4. Should return the same UUID across page navigations

## Production Build

### Building for Production

```bash
# Create optimized production build
npm run build
```

This generates static HTML, JavaScript, and CSS files in the `/public` directory.

### Testing Production Build Locally

```bash
# Build the site
npm run build

# Serve the production build
npm run serve
```

The production build will be served at `http://localhost:9000`

### Deployment Considerations

#### Tracking Script URL

For production deployment, update the tracking script URL in `gatsby-browser.js`:

```javascript
// Development (localhost)
const scriptSrc = 'http://localhost:3000/tracker.min.js';

// Production (replace with your actual domain)
const scriptSrc = 'https://your-analytics-domain.com/tracker.min.js';
```

#### Static Hosting

The demo site is a static Gatsby site and can be deployed to any static hosting service:

- **Netlify**: Drag and drop the `/public` folder
- **Vercel**: Connect GitHub repository and deploy
- **GitHub Pages**: Use `gh-pages` package
- **AWS S3 + CloudFront**: Upload `/public` contents
- **Gatsby Cloud**: Native Gatsby hosting

#### Environment-Specific Configuration

Consider using environment variables for tracking configuration:

```javascript
// gatsby-config.js
module.exports = {
  siteMetadata: {
    trackingScriptUrl: process.env.TRACKING_SCRIPT_URL || 'http://localhost:3000/tracker.min.js',
  },
};
```

## Troubleshooting

### Common Issues

#### Issue: "Port 8000 is already in use"

**Symptoms**: Gatsby fails to start, error message about port conflict

**Solution**:
```bash
# Option 1: Kill the process using port 8000
lsof -ti:8000 | xargs kill -9

# Option 2: Let Gatsby use a different port
# Gatsby will automatically try 8001, 8002, etc.

# Option 3: Specify a custom port
gatsby develop -p 8080
```

#### Issue: "Main app not running"

**Symptoms**: Tracking script fails to load, 404 errors in console

**Solution**:
1. Verify main app is running:
   ```bash
   cd app
   npm run dev
   ```
2. Visit `http://localhost:3000` to confirm it's accessible
3. Refresh the demo site

#### Issue: "Cannot GET /tracker.min.js"

**Symptoms**: 404 error when loading tracking script

**Solution**:
1. Verify the tracking script exists:
   ```bash
   cd app
   ls public/tracker.min.js
   ```
2. If missing, rebuild the tracker:
   ```bash
   npm run build:tracker
   ```
3. Restart the main app

#### Issue: "Gatsby cache issues"

**Symptoms**: Unexpected behavior, stale content, build errors

**Solution**:
```bash
# Clean Gatsby cache and rebuild
npm run clean
npm run develop
```

#### Issue: "Events not appearing in dashboard"

**Symptoms**: Interactions tracked but not visible in analytics

**Solution**:
1. **Verify both servers are running** (main app + demo site)
2. **Check browser console** for JavaScript errors
3. **Open DevTools Network tab** and filter by "track"
4. **Verify requests are sent** to `localhost:3000/api/track`
5. **Check response status** - should be 200 OK
6. **Refresh the dashboard** - may have caching
7. **Check time filters** in dashboard - events may be outside selected range

### Browser Developer Tools Tips

#### Verify Tracking Script Loads

1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Look for `tracker.min.js` request
5. Should show status 200 and size ~2-5KB

#### View Tracking Requests

1. Open DevTools Network tab
2. Filter by "track" or "api"
3. Look for POST requests to `/api/track`
4. Click on a request to see:
   - Headers (verify correct endpoint)
   - Payload (see what data is being sent)
   - Response (verify successful tracking)

#### Debug Session Storage

1. Open DevTools Application tab
2. Go to Session Storage > `http://localhost:8000`
3. Verify these keys exist:
   - `my-analytics-session` - UUID session identifier
   - `my-analytics-utm` - UTM parameters (if present in URL)
4. Values should persist across page navigation

#### Monitor Console Messages

1. Open DevTools Console tab
2. Look for tracking-related messages
3. Custom events trigger console logs in development mode
4. Errors will appear in red with stack traces

### Getting Help

If you encounter issues not covered here:

1. **Check the main app logs** in the terminal where `npm run dev` is running
2. **Review browser console** for error messages
3. **Inspect network requests** to see exactly what's being sent
4. **Verify both servers are running** on the correct ports
5. **Try cleaning caches** and rebuilding both projects

## Tech Stack Details

### Framework: Gatsby 5.x

Gatsby is a React-based static site generator that provides:
- File-based routing (files in `/src/pages/` become routes)
- Fast page loads through code splitting and prefetching
- Built-in performance optimizations
- Hot reloading during development

### Dependencies

Core dependencies (from `package.json`):

```json
{
  "dependencies": {
    "gatsby": "^5.13.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

No additional dependencies are required - the demo site is intentionally minimal.

### Styling Approach

- **Vanilla CSS**: No CSS frameworks or preprocessors
- **CSS Variables**: Design tokens defined in `:root`
- **Mobile-First**: Base styles for mobile, enhanced for larger screens
- **Responsive Breakpoints**:
  - Mobile: < 768px (base styles)
  - Tablet: 768px - 1023px
  - Desktop: >= 1024px

## Design Philosophy

This demo site follows a minimal, developer-focused aesthetic inspired by [franksblog.nl](https://franksblog.nl):

- **Clean typography**: Readable font sizes and clear hierarchy
- **Neutral color palette**: Understated tones with subtle accent color
- **Generous whitespace**: Content breathing room for clarity
- **Simple interactions**: Clear hover states, no complex animations
- **Content-first**: Focus on demonstrating functionality, not flashy design

## License

This demo site is part of the My Analytics project. See the main project for license information.

## Contributing

This is a demonstration site for testing and reference. For contributions to the main My Analytics platform, see the main project repository.

## Related Documentation

- **Main Project README**: Setup instructions for the My Analytics app
- **Tracking API Documentation**: Details on tracking endpoints and data format
- **Analytics Dashboard Guide**: How to use the analytics dashboard

---

**Quick Reference**

Start both servers:
```bash
# Terminal 1 - Main app
cd app && npm run dev

# Terminal 2 - Demo site
cd demo-site && npm run develop
```

Visit:
- Demo site: `http://localhost:8000`
- Analytics dashboard: `http://localhost:3000/dashboard`

Test UTM tracking:
```
http://localhost:8000/?utm_source=demo&utm_medium=test&utm_campaign=gatsby
```
