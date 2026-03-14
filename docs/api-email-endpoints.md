# Email API Endpoints Documentation

## Overview

The Email Reports and Alerts feature provides REST API endpoints for managing email preferences, viewing delivery history, and getting downtime alert suggestions. All endpoints require authentication via NextAuth.js session.

**Base URL:** `/api/settings/email/`

**Authentication:** All endpoints require a valid NextAuth session cookie

**Content-Type:** `application/json`

---

## Endpoints

### 1. Get Email Preferences

Retrieves email preferences for the authenticated user, including global defaults and site-specific overrides.

**Endpoint:** `GET /api/settings/email/preferences`

**Authentication:** Required

**Query Parameters:** None

**Response:** `200 OK`

```json
{
  "global": {
    "id": "clxyz123",
    "userId": "user_abc",
    "websiteId": null,
    "reportSchedule": "DAILY",
    "reportEnabled": true,
    "spikeAlertEnabled": true,
    "spikeThreshold": 1000,
    "lastSpikeTriggeredAt": "2025-11-20T14:30:00.000Z",
    "downtimeAlertEnabled": false,
    "downtimeThresholdMinutes": null,
    "lastDowntimeTriggeredAt": null,
    "alertCooldownHours": 1,
    "templateConfig": {
      "includePageviews": true,
      "includeUniqueVisitors": true,
      "includeTopPages": true,
      "includeTopReferrers": true,
      "includeComparison": true,
      "topPagesLimit": 5
    },
    "createdAt": "2025-11-01T10:00:00.000Z",
    "updatedAt": "2025-11-20T14:30:00.000Z"
  },
  "sites": {
    "website_123": {
      "id": "clxyz456",
      "userId": "user_abc",
      "websiteId": "website_123",
      "reportSchedule": "WEEKLY",
      "reportEnabled": true,
      "spikeAlertEnabled": false,
      "spikeThreshold": null,
      "lastSpikeTriggeredAt": null,
      "downtimeAlertEnabled": true,
      "downtimeThresholdMinutes": 30,
      "lastDowntimeTriggeredAt": null,
      "alertCooldownHours": 2,
      "templateConfig": null,
      "createdAt": "2025-11-15T12:00:00.000Z",
      "updatedAt": "2025-11-15T12:00:00.000Z"
    }
  }
}
```

**Response Fields:**

- `global`: Global default preferences (websiteId = null), fallback for sites without specific preferences
- `sites`: Object mapping websiteId to site-specific preferences
- `reportSchedule`: Enum - "DAILY", "WEEKLY", or "MONTHLY" (nullable)
- `reportEnabled`: Boolean - Whether email reports are enabled
- `spikeAlertEnabled`: Boolean - Whether traffic spike alerts are enabled
- `spikeThreshold`: Integer - Pageviews per hour threshold for spike alerts (nullable)
- `lastSpikeTriggeredAt`: ISO timestamp - Last time spike alert fired (nullable, for cooldown tracking)
- `downtimeAlertEnabled`: Boolean - Whether downtime alerts are enabled
- `downtimeThresholdMinutes`: Integer - Minutes without pageviews before alert (nullable)
- `lastDowntimeTriggeredAt`: ISO timestamp - Last time downtime alert fired (nullable)
- `alertCooldownHours`: Integer - Hours between alerts of same type (default 1)
- `templateConfig`: JSON - Metric toggles and customization (nullable, uses defaults if null)

**Error Responses:**

- `401 Unauthorized` - No valid session (not logged in)
  ```json
  { "error": "Unauthorized" }
  ```

- `500 Internal Server Error` - Database error
  ```json
  { "error": "Failed to fetch preferences" }
  ```

**Example Request:**

```bash
curl -X GET 'http://localhost:3000/api/settings/email/preferences' \
  -H 'Cookie: next-auth.session-token=your-session-token'
```

---

### 2. Create or Update Email Preferences

Creates new email preferences or updates existing ones for a specific website or global defaults.

**Endpoint:** `POST /api/settings/email/preferences`

**Authentication:** Required

**Request Body:**

```json
{
  "websiteId": "website_123",
  "reportSchedule": "WEEKLY",
  "reportEnabled": true,
  "spikeAlertEnabled": true,
  "spikeThreshold": 1000,
  "downtimeAlertEnabled": false,
  "downtimeThresholdMinutes": null,
  "alertCooldownHours": 1,
  "templateConfig": {
    "includePageviews": true,
    "includeUniqueVisitors": true,
    "includeTopPages": true,
    "includeTopReferrers": true,
    "includeComparison": true,
    "topPagesLimit": 5
  }
}
```

**Request Fields:**

- `websiteId` (string | null) - Website ID for site-specific preferences, or null for global defaults
- `reportSchedule` (string, optional) - "DAILY", "WEEKLY", or "MONTHLY"
- `reportEnabled` (boolean, required) - Enable/disable email reports
- `spikeAlertEnabled` (boolean, required) - Enable/disable traffic spike alerts
- `spikeThreshold` (integer, optional) - Pageviews per hour threshold (1-100,000)
- `downtimeAlertEnabled` (boolean, required) - Enable/disable downtime alerts
- `downtimeThresholdMinutes` (integer, optional) - Minutes without pageviews (5-1440)
- `alertCooldownHours` (number, optional) - Hours between alerts (0.083-24, default 1)
- `templateConfig` (object, optional) - Metric customization

**Validation Rules:**

- `spikeThreshold`: Min 1, Max 100,000 (required if spikeAlertEnabled = true)
- `downtimeThresholdMinutes`: Min 5, Max 1440 (24 hours) (required if downtimeAlertEnabled = true)
- `alertCooldownHours`: Min 0.083 (5 minutes), Max 24
- `templateConfig.topPagesLimit`: Min 1, Max 10

**Response:** `201 Created`

```json
{
  "id": "clxyz789",
  "userId": "user_abc",
  "websiteId": "website_123",
  "reportSchedule": "WEEKLY",
  "reportEnabled": true,
  "spikeAlertEnabled": true,
  "spikeThreshold": 1000,
  "lastSpikeTriggeredAt": null,
  "downtimeAlertEnabled": false,
  "downtimeThresholdMinutes": null,
  "lastDowntimeTriggeredAt": null,
  "alertCooldownHours": 1,
  "templateConfig": {
    "includePageviews": true,
    "includeUniqueVisitors": true,
    "includeTopPages": true,
    "includeTopReferrers": true,
    "includeComparison": true,
    "topPagesLimit": 5
  },
  "createdAt": "2025-11-21T15:00:00.000Z",
  "updatedAt": "2025-11-21T15:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request` - Validation error
  ```json
  {
    "error": "Validation failed",
    "issues": [
      {
        "path": ["spikeThreshold"],
        "message": "Spike threshold must be between 1 and 100,000"
      }
    ]
  }
  ```

- `401 Unauthorized` - No valid session
  ```json
  { "error": "Unauthorized" }
  ```

- `500 Internal Server Error` - Database error
  ```json
  { "error": "Failed to save preferences" }
  ```

**Example Request:**

```bash
curl -X POST 'http://localhost:3000/api/settings/email/preferences' \
  -H 'Content-Type: application/json' \
  -H 'Cookie: next-auth.session-token=your-session-token' \
  -d '{
    "websiteId": null,
    "reportSchedule": "DAILY",
    "reportEnabled": true,
    "spikeAlertEnabled": true,
    "spikeThreshold": 500,
    "downtimeAlertEnabled": false,
    "downtimeThresholdMinutes": null,
    "alertCooldownHours": 1
  }'
```

---

### 3. Get Email Delivery Log

Retrieves paginated email delivery history for the authenticated user, showing all sent and failed emails.

**Endpoint:** `GET /api/settings/email/delivery-log`

**Authentication:** Required

**Query Parameters:**

- `page` (integer, optional) - Page number (default: 1)
- `limit` (integer, optional) - Items per page (default: 20, max: 100)

**Response:** `200 OK`

```json
{
  "logs": [
    {
      "id": "log_abc123",
      "userId": "user_abc",
      "websiteId": "website_123",
      "emailType": "DAILY_REPORT",
      "recipientEmail": "user@example.com",
      "sentAt": "2025-11-21T09:00:05.000Z",
      "status": "SENT",
      "errorMessage": null
    },
    {
      "id": "log_def456",
      "userId": "user_abc",
      "websiteId": "website_456",
      "emailType": "TRAFFIC_SPIKE",
      "recipientEmail": "user@example.com",
      "sentAt": "2025-11-21T08:45:12.000Z",
      "status": "SENT",
      "errorMessage": null
    },
    {
      "id": "log_ghi789",
      "userId": "user_abc",
      "websiteId": "website_123",
      "emailType": "DOWNTIME",
      "recipientEmail": "user@example.com",
      "sentAt": "2025-11-20T14:30:00.000Z",
      "status": "FAILED",
      "errorMessage": "Rate limit exceeded: 100 emails/day"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 20
}
```

**Response Fields:**

- `logs`: Array of email delivery log entries (sorted by sentAt DESC)
- `emailType`: Enum - "DAILY_REPORT", "WEEKLY_REPORT", "MONTHLY_REPORT", "TRAFFIC_SPIKE", or "DOWNTIME"
- `status`: Enum - "SENT" or "FAILED"
- `errorMessage`: String - Error details if status = "FAILED" (null if sent successfully)
- `total`: Total number of logs (for pagination)
- `page`: Current page number
- `limit`: Items per page

**Error Responses:**

- `400 Bad Request` - Invalid query parameters
  ```json
  { "error": "Invalid page or limit parameter" }
  ```

- `401 Unauthorized` - No valid session
  ```json
  { "error": "Unauthorized" }
  ```

- `500 Internal Server Error` - Database error
  ```json
  { "error": "Failed to fetch delivery logs" }
  ```

**Example Request:**

```bash
curl -X GET 'http://localhost:3000/api/settings/email/delivery-log?page=1&limit=20' \
  -H 'Cookie: next-auth.session-token=your-session-token'
```

---

### 4. Get Downtime Alert Suggestion

Calculates 7-day average pageviews and provides a recommendation on whether to enable downtime alerts for a specific website.

**Endpoint:** `GET /api/settings/email/downtime-suggestion`

**Authentication:** Required

**Query Parameters:**

- `websiteId` (string, required) - Website ID to analyze

**Response:** `200 OK`

```json
{
  "averagePageviewsPerDay": 342.5,
  "suggestion": "enable",
  "reason": "Your site averages 342.5 pageviews per day. We recommend enabling downtime alerts to detect outages quickly."
}
```

**Response Fields:**

- `averagePageviewsPerDay`: Number - 7-day average (or available days if less than 7)
- `suggestion`: String - "enable", "disable", or null (if insufficient data)
- `reason`: String - Human-readable explanation for suggestion

**Suggestion Algorithm:**

- `average > 100/day`: Suggest "enable" - Site has consistent traffic, downtime alerts useful
- `average <= 100/day`: Suggest "disable" - Low traffic may cause false positives
- `average = 0` OR `< 1 day of data`: Return null suggestion - Not enough data

**Edge Cases:**

- Less than 7 days of data: Uses available days (e.g., 3 days of data = 3-day average)
- Less than 1 day of data: Returns null suggestion with reason "Insufficient data"
- Zero pageviews ever: Returns average = 0, suggest "disable"

**Error Responses:**

- `400 Bad Request` - Missing or invalid websiteId
  ```json
  { "error": "websiteId query parameter is required" }
  ```

- `401 Unauthorized` - No valid session
  ```json
  { "error": "Unauthorized" }
  ```

- `500 Internal Server Error` - Database error
  ```json
  { "error": "Failed to calculate suggestion" }
  ```

**Example Request:**

```bash
curl -X GET 'http://localhost:3000/api/settings/email/downtime-suggestion?websiteId=website_123' \
  -H 'Cookie: next-auth.session-token=your-session-token'
```

**Example Responses:**

High Traffic Site:
```json
{
  "averagePageviewsPerDay": 1250.3,
  "suggestion": "enable",
  "reason": "Your site averages 1250.3 pageviews per day. We recommend enabling downtime alerts to detect outages quickly."
}
```

Low Traffic Site:
```json
{
  "averagePageviewsPerDay": 42.7,
  "suggestion": "disable",
  "reason": "Your site averages 42.7 pageviews per day. Low traffic sites may experience false positive downtime alerts."
}
```

New Site:
```json
{
  "averagePageviewsPerDay": null,
  "suggestion": null,
  "reason": "Insufficient data to provide a recommendation. Wait at least 24 hours after adding tracking."
}
```

---

## Common Use Cases

### Setting Up Daily Reports

1. Create global default preferences:
   ```bash
   POST /api/settings/email/preferences
   {
     "websiteId": null,
     "reportSchedule": "DAILY",
     "reportEnabled": true,
     "spikeAlertEnabled": false,
     "downtimeAlertEnabled": false
   }
   ```

2. User receives daily reports at 9am server time for all sites without site-specific preferences

### Enabling Traffic Spike Alerts

1. Get downtime suggestion (optional):
   ```bash
   GET /api/settings/email/downtime-suggestion?websiteId=website_123
   ```

2. Create site-specific preferences with spike alert:
   ```bash
   POST /api/settings/email/preferences
   {
     "websiteId": "website_123",
     "reportSchedule": null,
     "reportEnabled": false,
     "spikeAlertEnabled": true,
     "spikeThreshold": 1000,
     "downtimeAlertEnabled": false,
     "alertCooldownHours": 1
   }
   ```

3. Alert fires when pageviews exceed 1000 in any 60-minute window
4. Cooldown prevents duplicate alerts for 1 hour after alert fires

### Viewing Failed Email Deliveries

1. Get delivery logs with pagination:
   ```bash
   GET /api/settings/email/delivery-log?page=1&limit=20
   ```

2. Filter for failed emails in UI by checking `status === 'FAILED'`
3. Display `errorMessage` to help debug issues (rate limits, invalid email, etc.)

### Disabling All Emails for a Site

1. Update site-specific preferences:
   ```bash
   POST /api/settings/email/preferences
   {
     "websiteId": "website_123",
     "reportEnabled": false,
     "spikeAlertEnabled": false,
     "downtimeAlertEnabled": false
   }
   ```

2. Site will not receive any emails (reports or alerts)
3. Global preferences remain unchanged for other sites

---

## Authentication

All endpoints require a valid NextAuth.js session. The session is checked using:

```typescript
import { auth } from '@/lib/auth/config';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  // ... endpoint logic
}
```

**Session Cookie Name:** `next-auth.session-token` (development) or `__Secure-next-auth.session-token` (production)

**Session Expiry:** Configured in NextAuth.js (default: 30 days)

**CSRF Protection:** NextAuth.js handles CSRF automatically

---

## Rate Limiting

### API Rate Limits

Currently no explicit rate limiting on these endpoints (authenticated users only). Consider implementing rate limiting in production:

- 100 requests per minute per user
- 1000 requests per hour per user

### Email Rate Limits

See Resend API rate limits (enforced by send.ts):
- Free tier: 100 emails/day, 3000 emails/month
- Rate limit errors logged in delivery logs with status = "FAILED"

---

## Testing

### Manual Testing

```bash
# Get preferences (requires valid session cookie)
curl -X GET 'http://localhost:3000/api/settings/email/preferences' \
  --cookie-jar cookies.txt \
  --cookie cookies.txt

# Update preferences
curl -X POST 'http://localhost:3000/api/settings/email/preferences' \
  -H 'Content-Type: application/json' \
  --cookie cookies.txt \
  -d '{"websiteId": null, "reportSchedule": "DAILY", "reportEnabled": true, "spikeAlertEnabled": false, "downtimeAlertEnabled": false}'

# Get delivery logs
curl -X GET 'http://localhost:3000/api/settings/email/delivery-log?page=1&limit=10' \
  --cookie cookies.txt

# Get downtime suggestion
curl -X GET 'http://localhost:3000/api/settings/email/downtime-suggestion?websiteId=website_123' \
  --cookie cookies.txt
```

### Integration Testing

See test files:
- `/app/src/app/api/settings/email/preferences/__tests__/route.test.ts`
- `/app/src/app/api/settings/email/delivery-log/__tests__/route.test.ts`
- `/app/src/app/api/settings/email/downtime-suggestion/__tests__/route.test.ts`

---

## Security Considerations

1. **Authentication Required** - All endpoints check for valid NextAuth session
2. **User Scoping** - All queries filtered by userId from session (prevents cross-user data access)
3. **Input Validation** - Zod schemas validate all inputs before database operations
4. **Sensitive Data** - Error messages sanitized (no stack traces exposed to client)
5. **CSRF Protection** - NextAuth.js provides automatic CSRF protection

---

## Performance Considerations

1. **Indexed Queries** - All database queries use indexed fields (userId, websiteId, sentAt)
2. **Pagination** - Delivery logs paginated to prevent large result sets
3. **Limit Clamping** - Maximum limit of 100 prevents excessive data transfer
4. **Caching** - Consider adding Redis caching for GET preferences endpoint (high read frequency)

---

## Error Handling Best Practices

1. **Client Errors (4xx)** - Return clear error messages for validation failures
2. **Server Errors (5xx)** - Log full error context server-side, return generic message to client
3. **Database Errors** - Catch Prisma errors and map to appropriate HTTP status codes
4. **Validation Errors** - Return Zod validation issues with field paths for inline error display

---

## Changelog

### Version 1.0 (2025-11-21)
- Initial release of email API endpoints
- Support for global and site-specific preferences
- Delivery log with pagination
- Downtime suggestion algorithm
