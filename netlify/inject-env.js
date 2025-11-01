#!/usr/bin/env node

/**
 * Netlify Build Plugin to inject environment variables into client-side code
 * This runs during the Netlify build process to replace placeholders with actual API keys
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  // Read the key.js file from the build output directory
  const keyFilePath = path.join(__dirname, '..', 'build', 'key.js');
  
  // Check if file exists before reading
  if (!fs.existsSync(keyFilePath)) {
    console.warn(`Warning: ${keyFilePath} not found. Skipping environment injection.`);
    process.exit(0);
  }
  
  let content = fs.readFileSync(keyFilePath, 'utf8');

  let mutated = false;

  // Inject MAPS_API_KEY if available
  if (process.env.MAPS_API_KEY) {
    console.log('Injecting MAPS_API_KEY into client code...');
    content = content.replace(
      /(\/\/ window\.MAPS_API_KEY will be set during build process)(?:\nwindow\.MAPS_API_KEY\s*=\s*.*?;)?/,
      `$1\nwindow.MAPS_API_KEY = ${JSON.stringify(process.env.MAPS_API_KEY)};`
    );
    mutated = true;
    console.log('MAPS_API_KEY injected successfully');
  } else {
    console.warn('MAPS_API_KEY environment variable not found - API key will not be available');
  }

  // Inject WEATHER_API_KEY if explicitly provided (optional)
  if (process.env.WEATHER_API_KEY) {
    console.log('Injecting WEATHER_API_KEY into client code...');
    content = content.replace(
      /(\/\/ window\.WEATHER_API_KEY will be set during build process when provided)(?:\nwindow\.WEATHER_API_KEY\s*=\s*.*?;)?/,
      `$1\nwindow.WEATHER_API_KEY = ${JSON.stringify(process.env.WEATHER_API_KEY)};`
    );
    mutated = true;
    console.log('WEATHER_API_KEY injected successfully');
  }

  if (mutated) {
    fs.writeFileSync(keyFilePath, content);
  }
} catch (error) {
  // Log error but don't fail the build
  console.error('Error during environment injection:', error.message);
  console.warn('Continuing build without environment injection...');
  process.exit(0);
}
