/**
 * Data Retention Configuration
 * Manages retention period settings for pageview data cleanup
 */

/**
 * Get the number of months to retain pageview data
 * Reads from DATA_RETENTION_MONTHS environment variable with default of 24 months
 * @returns {number} Number of months to retain data
 */
export function getRetentionMonths(): number {
  const envValue = process.env.DATA_RETENTION_MONTHS;

  // Use default if not set
  if (!envValue) {
    return 24;
  }

  // Parse and validate
  const parsed = parseInt(envValue, 10);

  // Validate parsed value
  if (isNaN(parsed) || parsed < 1) {
    console.warn(
      `Invalid DATA_RETENTION_MONTHS value: "${envValue}". Using default of 24 months.`
    );
    return 24;
  }

  return parsed;
}

/**
 * Calculate the cutoff date for data retention
 * Pageviews older than this date should be deleted
 * @returns {Date} Cutoff date (NOW - retention_months)
 */
export function getRetentionCutoffDate(): Date {
  const retentionMonths = getRetentionMonths();
  const cutoffDate = new Date();

  // Subtract retention months from current date
  cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

  return cutoffDate;
}
