#!/usr/bin/env node

/**
 * API Function Verification Script
 * 
 * This script validates that all Netlify API functions have proper error handling
 * and follow best practices.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying API Functions...\n');

const functionsDir = path.join(__dirname, 'netlify', 'functions');
const apiFiles = [
  'ebird.js',
  'ticketmaster.js',
  'what3words.js',
  'foursquare.js',
  'nps.js',
  'recreation.js',
  'holiday.js'
];

let allPassed = true;
const issues = [];

// Validation checks
const checks = {
  hasResponseOkCheck: {
    name: 'Response.ok check before JSON parsing',
    pattern: /response\.ok|!response\.ok/,
    critical: true
  },
  hasErrorHandling: {
    name: 'Try-catch error handling',
    pattern: /try\s*{[\s\S]*?catch\s*\(/,
    critical: true
  },
  hasCorsHeaders: {
    name: 'CORS headers configured',
    pattern: /'Access-Control-Allow-Origin':\s*'\*'/,
    critical: false
  },
  hasApiKeyCheck: {
    name: 'API key validation',
    pattern: /if\s*\(\s*!apiKey\s*\)/,
    critical: true
  },
  hasOptionsHandler: {
    name: 'OPTIONS method handler',
    pattern: /if\s*\(\s*event\.httpMethod\s*===\s*['"]OPTIONS['"]\s*\)/,
    critical: false
  }
};

// Check each API function file
apiFiles.forEach(filename => {
  const filepath = path.join(functionsDir, filename);
  
  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  ${filename}: File not found`);
    return;
  }

  const content = fs.readFileSync(filepath, 'utf8');
  const functionName = filename.replace('.js', '');
  
  console.log(`\n📄 Checking ${filename}...`);
  
  let filePassed = true;
  
  Object.entries(checks).forEach(([checkKey, check]) => {
    const passed = check.pattern.test(content);
    
    if (!passed) {
      filePassed = false;
      if (check.critical) {
        allPassed = false;
        console.log(`  ❌ ${check.name}: FAILED (Critical)`);
        issues.push({
          file: filename,
          check: check.name,
          critical: true
        });
      } else {
        console.log(`  ⚠️  ${check.name}: FAILED (Warning)`);
        issues.push({
          file: filename,
          check: check.name,
          critical: false
        });
      }
    } else {
      console.log(`  ✅ ${check.name}: PASSED`);
    }
  });
  
  if (filePassed) {
    console.log(`  ✨ All checks passed for ${filename}`);
  }
});

// Check historical weather in js/api.js
console.log('\n\n📄 Checking Historical Weather (js/api.js)...');
const apiJsPath = path.join(__dirname, 'js', 'api.js');
if (fs.existsSync(apiJsPath)) {
  const apiContent = fs.readFileSync(apiJsPath, 'utf8');
  
  // Check for fetchHistoricalWeather function
  if (apiContent.includes('async function fetchHistoricalWeather')) {
    console.log('  ✅ fetchHistoricalWeather function found');
    
    // Check for response.ok validation
    const functionMatch = apiContent.match(/async function fetchHistoricalWeather[\s\S]*?(?=\n(?:async )?function|\nclass|\n$)/);
    if (functionMatch) {
      const functionContent = functionMatch[0];
      
      if (/if\s*\(\s*!response\.ok\s*\)/.test(functionContent)) {
        console.log('  ✅ Response.ok check: PASSED');
      } else {
        console.log('  ❌ Response.ok check: FAILED');
        allPassed = false;
        issues.push({
          file: 'js/api.js',
          check: 'Response.ok check in fetchHistoricalWeather',
          critical: true
        });
      }
      
      // Check for try-catch
      if (/try\s*{[\s\S]*?catch/.test(functionContent)) {
        console.log('  ✅ Error handling: PASSED');
      } else {
        console.log('  ❌ Error handling: FAILED');
        allPassed = false;
        issues.push({
          file: 'js/api.js',
          check: 'Error handling in fetchHistoricalWeather',
          critical: true
        });
      }
      
      // Check date range (should be reasonable, not too large)
      if (functionContent.includes('setFullYear(startDate.getFullYear() - 5)') || 
          functionContent.includes('setFullYear(startDate.getFullYear() - 3)') ||
          /setFullYear\(startDate\.getFullYear\(\)\s*-\s*[1-5]\)/.test(functionContent)) {
        console.log('  ✅ Reasonable date range (5 years or less): PASSED');
      } else if (functionContent.includes('setFullYear(startDate.getFullYear() - 10)')) {
        console.log('  ⚠️  Large date range (10 years) - may cause issues');
      }
      
    }
  } else {
    console.log('  ❌ fetchHistoricalWeather function not found');
    allPassed = false;
  }
} else {
  console.log('  ❌ js/api.js not found');
  allPassed = false;
}

// Summary
console.log('\n\n' + '='.repeat(60));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(60));

if (issues.length > 0) {
  console.log('\n❌ Issues Found:');
  const criticalIssues = issues.filter(i => i.critical);
  const warnings = issues.filter(i => !i.critical);
  
  if (criticalIssues.length > 0) {
    console.log(`\n🚨 Critical Issues (${criticalIssues.length}):`);
    criticalIssues.forEach(issue => {
      console.log(`  - ${issue.file}: ${issue.check}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    warnings.forEach(issue => {
      console.log(`  - ${issue.file}: ${issue.check}`);
    });
  }
}

if (allPassed) {
  console.log('\n✅ ALL CRITICAL CHECKS PASSED!');
  console.log('\nAll API functions have:');
  console.log('  ✅ Proper response.ok checks before parsing JSON');
  console.log('  ✅ Error handling with try-catch blocks');
  console.log('  ✅ API key validation');
  console.log('\nThe APIs should now handle errors gracefully.');
  process.exit(0);
} else {
  console.log('\n❌ VERIFICATION FAILED');
  console.log('\nSome critical checks did not pass. Please review the issues above.');
  process.exit(1);
}
