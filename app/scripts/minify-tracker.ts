#!/usr/bin/env node

/**
 * Minify tracker.js to meet <5KB bundle size requirement
 * Uses Terser for JavaScript minification
 * Generates both tracker.min.js (legacy) and fb-a7k2.js (production)
 */

import * as fs from 'fs';
import * as path from 'path';
import { minify } from 'terser';

const inputPath = path.join(__dirname, '../public/tracker.js');
const outputPaths = [
  { path: path.join(__dirname, '../public/fb-a7k2.js'), name: 'fb-a7k2.js' }
];

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
        preamble: '/* Privacy-First Analytics Tracker v2.1.0 */'
      }
    });

    if (result.code) {
      const originalSize = fs.statSync(inputPath).size;

      for (const output of outputPaths) {
        console.log(`\nWriting ${output.name}...`);
        fs.writeFileSync(output.path, result.code, 'utf8');

        const minifiedSize = fs.statSync(output.path).size;
        const compressionRatio = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

        console.log(`✓ ${output.name} complete!`);
        console.log(`  Original size:  ${originalSize} bytes (${(originalSize / 1024).toFixed(2)} KB)`);
        console.log(`  Minified size:  ${minifiedSize} bytes (${(minifiedSize / 1024).toFixed(2)} KB)`);
        console.log(`  Compression:    ${compressionRatio}%`);

        // Check bundle size requirement (5KB limit)
        const maxSize = 5120; // 5KB in bytes
        if (minifiedSize > maxSize) {
          console.error(`\n✗ ERROR: ${output.name} size ${minifiedSize} bytes exceeds 5KB limit (${maxSize} bytes)`);
          process.exit(1);
        } else {
          console.log(`✓ Bundle size check passed (< 5KB)`);
        }
      }

      // Delete old tracker.min.js if it exists
      const oldMinPath = path.join(__dirname, '../public/tracker.min.js');
      if (fs.existsSync(oldMinPath)) {
        console.log('\nRemoving old tracker.min.js...');
        fs.unlinkSync(oldMinPath);
        console.log('✓ tracker.min.js removed (replaced by fb-a7k2.js)');
      }

      console.log('\n✓ All minification tasks complete!');
    } else {
      throw new Error('Minification produced no output');
    }
  } catch (error) {
    console.error('Minification failed:', error);
    process.exit(1);
  }
}

minifyTracker();
