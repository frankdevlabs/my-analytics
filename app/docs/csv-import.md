# CSV Data Import Documentation

## Overview

The CSV Import feature enables you to import historical analytics data from CSV files into the Pageview database table. It uses the same validation rules as live tracking to ensure data integrity and provides detailed error reporting for troubleshooting.

### Key Features

- Imports pageview records from 36-column CSV files
- Validates all data using existing Zod validation schemas
- Processes large files efficiently using streaming parser
- Batch inserts with automatic retry logic
- Continues processing when individual rows fail validation
- Generates detailed import summaries with error reports
- Outputs to both console and timestamped log files

## Quick Start

```bash
npm run import:csv -- ./path/to/file.csv
```

The script will:
1. Validate and parse the CSV file
2. Import all valid pageview records
3. Skip invalid rows with detailed error messages
4. Generate a summary report showing success/failure counts
5. Create a timestamped log file in `logs/import-{timestamp}.log`

## CSV File Format Requirements

### File Structure

Your CSV file must include 36 columns with headers in the first row. The columns can be in any order, but all column names must match exactly as shown below.

### Required Columns

All 36 columns must be present in the CSV header row:

```
datapoint,uuid,added_iso,path,user_agent,device_type,hostname,session_id,query,
document_referrer,browser_name,browser_version,os_name,os_version,viewport_width,
viewport_height,screen_width,screen_height,lang_language,timezone,country_code,
utm_source,utm_medium,utm_campaign,utm_content,utm_term,duration_seconds,
scrolled_percentage,is_unique,is_robot,added_date,added_unix,hostname_original,
referrer_hostname,referrer_path,path_and_query,lang_region
```

### Critical Fields (Required)

These fields MUST have valid values for every row:

- **added_iso**: ISO 8601 datetime (e.g., `2024-10-24T10:00:00.000Z`)
- **path**: URL path starting with `/` (e.g., `/products/shoes`)

If either of these fields is missing or invalid, the entire row will be skipped.

## Complete Field Mappings

### CSV Column to Database Field Mapping

| CSV Column | Database Field | Type | Required | Description |
|------------|----------------|------|----------|-------------|
| **Critical Fields** |
| `added_iso` | `added_iso` | DateTime | Yes | ISO 8601 timestamp when pageview occurred |
| `path` | `path` | String | Yes | URL path (must start with `/`) |
| `user_agent` | `user_agent` | String | Yes | Browser user agent string |
| **Identity & Session** |
| `uuid` | `page_id` | String | Yes | Unique pageview identifier |
| `session_id` | `session_id` | String | No | Session identifier |
| `hostname` | `hostname` | String | No | Website hostname |
| **Device & Browser** |
| `device_type` | `device_type` | Enum | Yes | `desktop`, `mobile`, or `tablet` |
| `browser_name` | `browser_name` | String | No | Browser name (Chrome, Safari, etc.) |
| `browser_version` | `browser_version` | String | No | Browser version number |
| `os_name` | `os_name` | String | No | Operating system name |
| `os_version` | `os_version` | String | No | Operating system version |
| `screen_width` | `screen_width` | Integer | No | Screen width in pixels |
| `screen_height` | `screen_height` | Integer | No | Screen height in pixels |
| `viewport_width` | `viewport_width` | Integer | No | Viewport width in pixels |
| `viewport_height` | `viewport_height` | Integer | No | Viewport height in pixels |
| **Referrer & Navigation** |
| `document_referrer` | `document_referrer` | String | No | HTTP referrer URL |
| `query` | `query_string` | String | No | URL query string |
| **Location & Locale** |
| `country_code` | `country_code` | String | No | 2-character country code (ISO 3166-1) |
| `lang_language` | `language` | String | No | Language code (e.g., `en-US`) |
| `timezone` | `timezone` | String | No | IANA timezone (e.g., `America/New_York`) |
| **Marketing Attribution** |
| `utm_source` | `utm_source` | String | No | UTM source parameter |
| `utm_medium` | `utm_medium` | String | No | UTM medium parameter |
| `utm_campaign` | `utm_campaign` | String | No | UTM campaign parameter |
| `utm_content` | `utm_content` | String | No | UTM content parameter |
| `utm_term` | `utm_term` | String | No | UTM term parameter |
| **Engagement Metrics** |
| `duration_seconds` | `duration_seconds` | Integer | Yes | Time spent on page (defaults to 0) |
| `scrolled_percentage` | `scrolled_percentage` | Integer | No | Scroll depth (0-100) |
| `is_unique` | `is_unique` | Boolean | Yes | First-time visitor flag (defaults to false) |
| `is_robot` | `is_bot` | Boolean | Yes | Bot detection flag (defaults to false) |

### Fields NOT Stored (CSV-only or Derived)

These CSV columns are used for filtering or are derived fields not stored in the database:

- `datapoint` - Used to filter for "pageview" records only (events are skipped)
- `added_date` - Redundant with `added_iso`
- `added_unix` - Redundant with `added_iso`
- `hostname_original` - Use `hostname` instead
- `referrer_hostname` - Derived from `document_referrer`
- `referrer_path` - Derived from `document_referrer`
- `path_and_query` - Can be reconstructed from `path` + `query`
- `lang_region` - Can be combined with `language` if needed

### Database Fields NOT in CSV (Auto-filled)

These fields are automatically set by the import process:

- `is_internal_referrer` → `false` (always)
- `visibility_changes` → `0` (always)
- `time_on_page_seconds` → `null` (optional engagement metric)
- `document_title` → `null` (not available in CSV)
- `hash` → `null` (not available in CSV)
- `created_at` → Auto-generated by database

## Usage Instructions

### Basic Command Syntax

```bash
npm run import:csv -- ./path/to/file.csv
```

You can also run directly with ts-node:

```bash
npx ts-node app/scripts/import-csv.ts ./path/to/file.csv
```

### File Path Requirements

- Use relative or absolute paths
- File must exist and be readable
- Supports paths with spaces (automatically quoted)
- File extension should be `.csv`

### Expected Output

#### Console Output

The script outputs real-time progress updates every 100 rows:

```
============================================================
CSV Import Script
============================================================

File: /absolute/path/to/your/file.csv
Start time: 2024-10-24T10:00:00.000Z

Log file: /absolute/path/to/logs/import-2024-10-24T10-00-00.log

Progress: 100 rows imported, 5 failed...
Progress: 200 rows imported, 12 failed...
Progress: 300 rows imported, 18 failed...

============================================================
Import Summary
============================================================
Total rows processed: 305
Successfully imported: 287
Failed rows: 18
Batches processed: 3
Duration: 15420ms (15.42s)
Performance: 18.61 rows/second

Validation Errors (showing first 20):
  Row 15: path: Path must start with "/"
  Row 42: added_iso: Invalid datetime
  Row 89: device_type: Invalid enum value
  ... and 15 more validation errors

Full log: /absolute/path/to/logs/import-2024-10-24T10-00-00.log
============================================================
Import completed successfully
```

#### Log File Output

Detailed log files are created at `logs/import-{timestamp}.log` with:

- Timestamped start/end markers
- Row-by-row processing status
- Batch insertion details
- All validation errors with row numbers
- All database errors with batch numbers
- Complete summary statistics

Example log file content:

```
================================================================================
CSV Import Log
Started: 2024-10-24T10:00:00.000Z
================================================================================

[2024-10-24T10:00:00] Starting import from: /path/to/file.csv
[2024-10-24T10:00:01] Inserting batch 1 (100 rows)...
[2024-10-24T10:00:02] Batch 1 inserted successfully (100 rows)
[2024-10-24T10:00:03] ERROR: Row 15: path: Path must start with "/"
[2024-10-24T10:00:04] Inserting batch 2 (100 rows)...
[2024-10-24T10:00:05] Batch 2 inserted successfully (100 rows)
...
[2024-10-24T10:00:15] Import completed

================================================================================
Import Summary
================================================================================
Total rows: 305
Success: 287
Failed: 18
Batches processed: 3
Duration: 15420ms (15.42s)
Performance: 18.61 rows/second
================================================================================

Validation Errors:
--------------------------------------------------------------------------------
Row 15: path: Path must start with "/"
Row 42: added_iso: Invalid datetime string
Row 89: device_type: Invalid enum value. Expected 'desktop' | 'mobile' | 'tablet'
...

Completed: 2024-10-24T10:00:15.420Z
================================================================================
```

### Exit Codes

The script uses standard Unix exit codes:

- **Exit 0**: Import succeeded (at least one row imported successfully)
- **Exit 1**: Import failed (no rows imported OR critical error occurred)

Critical errors that cause Exit 1:
- File not found
- Invalid file path
- Database connection failure
- CSV parsing error (malformed file)
- All rows failed validation

## Validation Rules

The import script performs two-phase validation:

### Phase 1: Critical Field Validation

These fields are validated FIRST for fast-fail behavior:

1. **added_iso**
   - Must be present (non-empty)
   - Must be valid ISO 8601 datetime format
   - Example valid: `2024-10-24T10:00:00.000Z`
   - Example invalid: `10/24/2024`, `2024-10-24`, empty string

2. **path**
   - Must be present (non-empty)
   - Must start with `/`
   - Example valid: `/products`, `/blog/post-1`, `/`
   - Example invalid: `products`, `https://example.com/path`, empty string

If either critical field fails, the row is skipped immediately without further validation.

### Phase 2: Full Schema Validation

After critical fields pass, all fields are validated using the existing pageview Zod schema:

| Field | Validation Rules | Error Examples |
|-------|------------------|----------------|
| `page_id` | Non-empty string | "Required field" |
| `added_iso` | Valid ISO 8601 datetime | "Invalid datetime string" |
| `path` | Non-empty string starting with `/` | "Path must start with /" |
| `user_agent` | Non-empty string | "Required field" |
| `device_type` | Enum: `desktop`, `mobile`, `tablet` | "Invalid enum value" |
| `country_code` | 2 characters (if present) | "Must be 2 characters" |
| `scrolled_percentage` | Integer 0-100 (if present) | "Must be between 0 and 100" |
| `duration_seconds` | Integer >= 0 | "Must be non-negative" |
| `viewport_width` | Positive integer (if present) | "Must be positive" |
| `viewport_height` | Positive integer (if present) | "Must be positive" |
| `screen_width` | Positive integer (if present) | "Must be positive" |
| `screen_height` | Positive integer (if present) | "Must be positive" |
| `utm_*` | String (if present) | N/A - any string accepted |

### Type Conversions

The import script automatically converts CSV string values:

- **Numbers**: `duration_seconds`, `scrolled_percentage`, viewport/screen dimensions
  - Empty strings → `undefined`
  - Non-numeric strings → `undefined`
  - Decimals → Invalid (integers only)

- **Booleans**: `is_unique`, `is_robot`
  - `"true"` → `true`
  - `"false"` → `false`
  - Empty string → `false`
  - Any other value → `false`

- **Dates**: `added_iso`
  - Must be valid ISO 8601 format
  - Timezone-aware timestamps preferred

- **Optional Fields**: All optional string fields
  - Empty strings → `undefined` (not stored)
  - Whitespace trimmed automatically

## Error Message Formats

### Validation Errors

Format: `Row {number}: {field}: {message}`

Examples:
```
Row 15: path: Path must start with "/"
Row 42: added_iso: Invalid datetime string
Row 89: device_type: Invalid enum value. Expected 'desktop' | 'mobile' | 'tablet'
Row 103: scrolled_percentage: Must be between 0 and 100
Row 156: country_code: Must be exactly 2 characters
```

### Database Errors

Format: `Batch {number}: {error message}`

Examples:
```
Batch 3: Duplicate record detected (unique constraint violation)
Batch 5: Database connection timeout - retrying...
Batch 7: Foreign key constraint violation
```

### Critical Errors

Format: `{error type}: {detailed message}`

Examples:
```
File not found: ./data/pageviews.csv
CSV parsing error: Unexpected end of file
Database connection error: Unable to connect to PostgreSQL
```

## Common Validation Failures

### Problem: "Path must start with /"

**Cause**: The `path` field doesn't begin with a forward slash.

**Solution**: Ensure all path values start with `/`. Common mistakes:
```
❌ products/shoes     → ✅ /products/shoes
❌ blog/post-1        → ✅ /blog/post-1
❌ https://site.com/  → ✅ /
```

### Problem: "Invalid datetime string"

**Cause**: The `added_iso` field is not in ISO 8601 format.

**Solution**: Use proper ISO 8601 datetime format with timezone:
```
❌ 10/24/2024         → ✅ 2024-10-24T10:00:00.000Z
❌ 2024-10-24         → ✅ 2024-10-24T00:00:00.000Z
❌ 1698148800         → ✅ 2024-10-24T10:00:00.000Z
```

### Problem: "Invalid enum value" (device_type)

**Cause**: The `device_type` is not `desktop`, `mobile`, or `tablet`.

**Solution**: Use only the three accepted values:
```
❌ phone              → ✅ mobile
❌ computer           → ✅ desktop
❌ ipad               → ✅ tablet
❌ Desktop            → ✅ desktop (lowercase required)
```

### Problem: "Must be between 0 and 100" (scrolled_percentage)

**Cause**: Scroll percentage is outside the valid range.

**Solution**: Ensure percentage values are 0-100:
```
❌ 150                → ✅ 100
❌ -10                → ✅ 0
❌ 1.0 (decimal)      → ✅ 100 (use integer percentage)
```

### Problem: "Must be exactly 2 characters" (country_code)

**Cause**: Country code is not ISO 3166-1 alpha-2 format.

**Solution**: Use 2-letter country codes:
```
❌ USA                → ✅ US
❌ United States      → ✅ US
❌ U                  → ✅ US
```

### Problem: "Required field" (page_id, user_agent, etc.)

**Cause**: A required field is empty or missing.

**Solution**: Ensure all required fields have values:
- `uuid` (maps to `page_id`)
- `added_iso`
- `path`
- `user_agent`
- `device_type`

## Troubleshooting

### File Access Issues

**Error**: `File not found: ./path/to/file.csv`

**Solutions**:
1. Verify file path is correct (use absolute path if unsure)
2. Check file permissions (must be readable)
3. Ensure file extension is `.csv`
4. Try using absolute path: `/full/path/to/file.csv`

### Database Connection Issues

**Error**: `Database connection error` or `ECONNREFUSED`

**Solutions**:
1. Verify PostgreSQL is running
2. Check `.env` file has correct database credentials
3. Test connection: `npm run db:test` (if available)
4. Check network/firewall settings

### Memory Issues

**Error**: `JavaScript heap out of memory`

**Solutions**:
1. Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096" npm run import:csv -- ./file.csv`
2. Split large CSV files into smaller chunks
3. Process files sequentially rather than concurrently

### CSV Format Issues

**Error**: `CSV parsing error: Unexpected end of file`

**Solutions**:
1. Verify CSV has proper structure (all rows have same column count)
2. Check for unescaped quotes or commas in data
3. Ensure file encoding is UTF-8
4. Look for truncated/incomplete rows

**Error**: `Row X: Required field missing`

**Solutions**:
1. Verify CSV header row has all 36 required columns
2. Check column names match exactly (case-sensitive)
3. Ensure no extra/missing commas in header row
4. Validate data rows have values for all required fields

### Performance Issues

**Symptom**: Import is very slow (< 100 rows/minute)

**Solutions**:
1. Check database server load
2. Verify network latency if database is remote
3. Consider adding database indexes on frequently queried fields
4. Check if database is on SSD vs HDD
5. Monitor system resources (CPU, RAM, Disk I/O)

## Performance Expectations

### Throughput

- **Target**: 1,000 rows per minute minimum
- **Typical**: 500-2,000 rows per minute
- **Large files**: Performance scales linearly with file size

Performance is affected by:
- Database server hardware
- Network latency (for remote databases)
- Number of validation failures (failures are slower)
- System resource availability

### Resource Usage

- **Memory**: < 500MB for files with 10,000+ rows
- **CPU**: Moderate usage (validation and parsing)
- **Network**: Batch inserts reduce network overhead
- **Disk**: Log files grow with error count

### Batch Processing

- **Batch Size**: 100 rows per database transaction
- **Retry Logic**: 3 attempts with exponential backoff (1s, 2s, 4s)
- **Transaction Timeout**: 30 seconds

### Optimization Tips

1. **Pre-validate CSV files**: Check format before import
2. **Clean data first**: Fix validation errors in source data
3. **Import during off-peak hours**: Reduce database contention
4. **Monitor logs**: Watch for patterns in failures
5. **Use local database**: Avoid network latency

## Advanced Usage

### Importing Multiple Files

To import multiple CSV files sequentially:

```bash
#!/bin/bash
for file in data/*.csv; do
  echo "Importing $file..."
  npm run import:csv -- "$file"

  # Check exit code
  if [ $? -ne 0 ]; then
    echo "Import failed for $file"
    exit 1
  fi
done
echo "All files imported successfully"
```

### Automated Import Scripts

Example cron job to import daily files:

```bash
# crontab entry - runs at 2 AM daily
0 2 * * * cd /path/to/project && npm run import:csv -- ./data/daily-pageviews.csv >> ./logs/cron.log 2>&1
```

### Pre-validation

Validate CSV format before importing:

```bash
# Check file has correct number of columns
head -1 your-file.csv | tr ',' '\n' | wc -l
# Should output: 36

# Check for required columns
head -1 your-file.csv | grep -q "added_iso" && echo "✓ added_iso found"
head -1 your-file.csv | grep -q "path" && echo "✓ path found"
head -1 your-file.csv | grep -q "uuid" && echo "✓ uuid found"
```

## Example CSV File

See `/examples/sample-import.csv` for a complete example with 10 sample rows demonstrating:
- All 36 required columns
- Various device types (desktop, mobile, tablet)
- Different browsers and operating systems
- International data (multiple countries and languages)
- UTM tracking parameters
- Various engagement metrics

You can use this file to test the import functionality:

```bash
npm run import:csv -- ./examples/sample-import.csv
```

## Data Types Reference

### String Fields
- Trimmed automatically (leading/trailing whitespace removed)
- Empty strings converted to `undefined` for optional fields
- Max length varies by field (see database schema)

### Integer Fields
- Must be whole numbers (no decimals)
- Negative numbers rejected for dimensions/metrics
- Empty strings converted to `undefined`

### Boolean Fields
- Accepts: `"true"` or `"false"` (case-insensitive)
- Defaults: `false` for empty strings
- Used for: `is_unique`, `is_robot`

### DateTime Fields
- Format: ISO 8601 (e.g., `2024-10-24T10:00:00.000Z`)
- Timezone: Recommended to include (Z for UTC, or ±HH:MM)
- Precision: Milliseconds supported but optional

### Enum Fields
- `device_type`: Must be exactly `desktop`, `mobile`, or `tablet`
- Case-sensitive (lowercase required)
- No other values accepted

## Related Files

### Implementation Files
- `/Users/frankdevlab/WebstormProjects/my-analytics/app/scripts/import-csv.ts` - Main CLI script
- `/Users/frankdevlab/WebstormProjects/my-analytics/app/lib/import/field-mapper.ts` - CSV to database field mapping
- `/Users/frankdevlab/WebstormProjects/my-analytics/app/lib/import/validation-adapter.ts` - Validation logic
- `/Users/frankdevlab/WebstormProjects/my-analytics/app/lib/import/batch-inserter.ts` - Database insertion with retry
- `/Users/frankdevlab/WebstormProjects/my-analytics/app/lib/import/log-manager.ts` - Logging functionality

### Test Files
- `/Users/frankdevlab/WebstormProjects/my-analytics/test/fixtures/csv-import/` - Test CSV files
- `/Users/frankdevlab/WebstormProjects/my-analytics/test/lib/import/` - Unit tests

### Schema Files
- `/Users/frankdevlab/WebstormProjects/my-analytics/app/lib/validation/pageview-schema.ts` - Zod validation schema
- `/Users/frankdevlab/WebstormProjects/my-analytics/prisma/schema.prisma` - Database schema

## Future Enhancements

Features planned for future releases:

- **Dry-run mode**: Preview import without writing to database
- **Data transformation**: Custom field mapping configuration
- **Resume capability**: Continue interrupted imports
- **Progress bar**: Visual progress indicator
- **Event imports**: Support for event records (currently pageview-only)
- **Duplicate detection**: Skip or update existing records
- **Web UI**: Browser-based file upload and import
- **Scheduled imports**: Built-in cron scheduling

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review log files in `logs/` directory
3. Verify CSV format matches requirements
4. Test with the example CSV file
5. Check database connection and credentials
6. Review validation error messages for specific field issues

## License

This import tool is part of the Analytics project and follows the same license.
