#!/usr/bin/env node

/**
 * Minify tracker.js to meet <5KB bundle size requirement
 * Uses Terser for JavaScript minification
 * Updated from 3KB to 5KB to accommodate CUID2 generation logic
 */

import * as fs from 'fs';
import * as path from 'path';
import { minify } from 'terser';

const inputPath = path.join(__dirname, '../public/tracker.js');
const outputPath = path.join(__dirname, '../public/tracker.min.js');

async function minifyTracker() {
  try {
    console.log('Reading tracker.js...');
    const code = fs.readFileSync(inputPath, 'utf8');

    console.log('Minifying...');
    const result = await minify(code, {
      compress: {
        dead_code: true,
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
        passes: 3
      },
      mangle: {
        toplevel: true
      },
      format: {
        comments: false,
        preamble: '/* Privacy-First Analytics Tracker v2.0.0 */'
      }
    });

    if (result.code) {
      console.log('Writing minified file...');
      fs.writeFileSync(outputPath, result.code, 'utf8');

      const originalSize = fs.statSync(inputPath).size;
      const minifiedSize = fs.statSync(outputPath).size;
      const compressionRatio = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

      console.log('\n✓ Minification complete!');
      console.log(`  Original size:  ${originalSize} bytes (${(originalSize / 1024).toFixed(2)} KB)`);
      console.log(`  Minified size:  ${minifiedSize} bytes (${(minifiedSize / 1024).toFixed(2)} KB)`);
      console.log(`  Compression:    ${compressionRatio}%`);

      // Check bundle size requirement (updated to 5KB for CUID2 support)
      const maxSize = 5120; // 5KB in bytes
      if (minifiedSize > maxSize) {
        console.error(`\n✗ ERROR: Bundle size ${minifiedSize} bytes exceeds 5KB limit (${maxSize} bytes)`);
        process.exit(1);
      } else {
        console.log(`\n✓ Bundle size check passed (< 5KB)`);
      }
    } else {
      throw new Error('Minification produced no output');
    }
  } catch (error) {
    console.error('Minification failed:', error);
    process.exit(1);
  }
}

minifyTracker();
