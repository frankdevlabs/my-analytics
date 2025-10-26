/**
 * MaxMind GeoLite2 Country Database Setup Script
 *
 * Downloads and extracts the MaxMind GeoLite2 Country database for IP geolocation.
 * This script should be run once during initial setup and optionally re-run quarterly
 * to update the database with the latest geographic data.
 *
 * Usage:
 *   npx ts-node scripts/setup-geoip.ts
 *
 * Manual Update Instructions:
 * - MaxMind updates GeoLite2 databases weekly (every Tuesday)
 * - For personal use, quarterly manual updates are sufficient
 * - Re-run this script to download the latest database version
 * - Slightly outdated geographic data is acceptable for analytics purposes
 *
 * Database Location:
 *   /app/lib/geoip/GeoLite2-Country.mmdb
 *
 * Note: This database file is git-ignored for security and licensing reasons.
 * Each developer must download their own copy.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import type { IncomingMessage } from 'http';

const GEOIP_DIR = path.join(__dirname, '..', 'lib', 'geoip');
const DATABASE_FILE = path.join(GEOIP_DIR, 'GeoLite2-Country.mmdb');
const DOWNLOAD_URL = 'https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-Country.mmdb';

/**
 * Create directory if it doesn't exist
 */
function ensureDirectory(dir: string): void {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Download file from URL with redirect following
 */
function downloadFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = (currentUrl: string, redirectCount = 0): void => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }

      https.get(currentUrl, (response: IncomingMessage) => {
        // Follow redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (!redirectUrl) {
            reject(new Error('Redirect without location header'));
            return;
          }
          console.log(`Following redirect to: ${redirectUrl}`);
          request(redirectUrl, redirectCount + 1);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        const fileStream = fs.createWriteStream(outputPath);

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });

        fileStream.on('error', (err: Error) => {
          fs.unlinkSync(outputPath);
          reject(err);
        });
      }).on('error', (err: Error) => {
        reject(err);
      });
    };

    request(url);
  });
}

/**
 * Verify database file is valid
 */
function verifyDatabase(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const stats = fs.statSync(filePath);

  // Check file size is reasonable (> 1MB and < 100MB)
  if (stats.size < 1024 * 1024 || stats.size > 100 * 1024 * 1024) {
    console.error(`Database file size ${stats.size} bytes is outside expected range`);
    return false;
  }

  // Check that file is a binary file (not HTML error page)
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(100);
  fs.readSync(fd, buffer, 0, 100, 0);
  fs.closeSync(fd);

  // Check it's not an HTML file (common error when download fails)
  const content = buffer.toString('utf-8', 0, 100);
  if (content.includes('<html') || content.includes('<!DOCTYPE')) {
    console.error('Database file appears to be HTML (download may have failed)');
    return false;
  }

  console.log('Database file appears to be valid binary format');
  return true;
}

/**
 * Main setup function
 */
async function setupGeoIP(): Promise<void> {
  console.log('MaxMind GeoLite2 Country Database Setup');
  console.log('========================================\n');

  try {
    // Create directory if needed
    ensureDirectory(GEOIP_DIR);

    // Check if database already exists
    if (fs.existsSync(DATABASE_FILE)) {
      console.log('Database file already exists at:', DATABASE_FILE);

      if (verifyDatabase(DATABASE_FILE)) {
        console.log('Existing database appears valid.');
        const stats = fs.statSync(DATABASE_FILE);
        console.log(`File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Last modified: ${stats.mtime.toISOString()}`);
        console.log('\nTo re-download, delete the existing file and run this script again.');
        return;
      } else {
        console.log('Existing database appears corrupted. Re-downloading...');
        fs.unlinkSync(DATABASE_FILE);
      }
    }

    // Download database
    console.log('Downloading GeoLite2 Country database...');
    console.log(`URL: ${DOWNLOAD_URL}`);
    console.log(`Destination: ${DATABASE_FILE}\n`);

    await downloadFile(DOWNLOAD_URL, DATABASE_FILE);

    console.log('Download complete.');

    // Verify downloaded file
    console.log('Verifying database...');
    if (!verifyDatabase(DATABASE_FILE)) {
      throw new Error('Downloaded database file failed validation');
    }

    const stats = fs.statSync(DATABASE_FILE);
    console.log(`\nSetup successful!`);
    console.log(`Database size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Location: ${DATABASE_FILE}`);
    console.log('\nThe GeoIP lookup service is now ready to use.');
    console.log('\nOptional: Re-run this script quarterly to update the database.');

  } catch (error) {
    console.error('\nSetup failed:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Check your internet connection');
    console.error('2. Verify the download URL is accessible');
    console.error('3. Ensure you have write permissions to the lib/geoip directory');
    console.error('4. Try downloading manually from:', DOWNLOAD_URL);
    process.exit(1);
  }
}

// Run setup
setupGeoIP();
