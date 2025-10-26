/**
 * Browser Major Version Extraction Utility
 *
 * Extracts the major version number (first numeric segment) from browser version strings.
 * This simplifies version display in analytics (e.g., "Chrome 120" instead of "Chrome 120.0.6099.109").
 *
 * Used during pageview ingestion to populate the browser_major_version field for cleaner
 * analytics visualizations while preserving the full version in browser_version.
 */

/**
 * Extract major version from browser version string
 *
 * Parses the version string to extract the first numeric segment before a dot or end of string.
 * Gracefully handles null, empty, malformed, and non-numeric version strings by returning null.
 *
 * @param browserVersion - The full browser version string (e.g., "120.0.6099.109")
 * @returns The major version as a string (e.g., "120"), or null if extraction fails
 *
 * @example
 * ```typescript
 * extractMajorVersion("120.0.6099.109") // Returns: "120"
 * extractMajorVersion("17.1")           // Returns: "17"
 * extractMajorVersion("10")             // Returns: "10"
 * extractMajorVersion("Safari")         // Returns: null (non-numeric)
 * extractMajorVersion(null)             // Returns: null
 * extractMajorVersion("")               // Returns: null
 * extractMajorVersion("1.2.3.4.5")      // Returns: "1"
 * ```
 */
export function extractMajorVersion(browserVersion: string | null): string | null {
  try {
    // Handle null or empty input
    if (!browserVersion || typeof browserVersion !== 'string' || browserVersion.trim() === '') {
      return null;
    }

    // Extract first segment (before first dot or end of string)
    const firstSegment = browserVersion.split('.')[0].trim();

    // Validate that first segment is numeric
    // Use regex to match digits only (no letters, no special chars)
    const numericMatch = firstSegment.match(/^\d+$/);

    if (!numericMatch) {
      // First segment is not purely numeric (e.g., "Safari", "1a", etc.)
      return null;
    }

    return firstSegment;
  } catch (error) {
    // Gracefully handle unexpected parsing errors
    console.warn('Major version extraction failed:', error);
    return null;
  }
}
