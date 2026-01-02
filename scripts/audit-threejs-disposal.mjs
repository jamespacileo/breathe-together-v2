#!/usr/bin/env node

/**
 * Three.js Disposal Audit Script
 *
 * Scans the codebase for Three.js resource creation patterns and checks for
 * corresponding disposal calls to detect potential GPU memory leaks.
 *
 * Usage:
 *   node scripts/audit-threejs-disposal.mjs [--fix] [--verbose]
 *
 * Options:
 *   --fix      Generate suggested fixes (not implemented yet)
 *   --verbose  Show detailed output including code snippets
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Patterns to match Three.js resource creation
const RESOURCE_PATTERNS = [
  { type: 'Geometry', regex: /new\s+THREE\.\w*Geometry\s*\(/g },
  { type: 'Material', regex: /new\s+THREE\.\w*Material\s*\(/g },
  { type: 'Texture', regex: /new\s+THREE\.\w*Texture\s*\(/g },
  { type: 'RenderTarget', regex: /new\s+THREE\.WebGLRenderTarget\s*\(/g },
  { type: 'RenderTarget', regex: /new\s+THREE\.WebGLCubeRenderTarget\s*\(/g },
];

// Patterns to match disposal calls
const DISPOSAL_PATTERNS = [
  /\.dispose\s*\(\s*\)/g,
  /useDisposeMaterials\s*\(/g,
  /useDisposeGeometries\s*\(/g,
  /useDisposeTextures\s*\(/g,
  /useDisposeRenderTargets\s*\(/g,
  /useDispose\s*\(/g,
];

// Directories to scan
const SOURCE_DIRS = ['src/entities', 'src/components', 'src/hooks', 'src/lib'];

// Directories and files to ignore
const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.vite',
  'coverage',
  'test',
  'spec',
  '__tests__',
];

/**
 * Recursively find all TypeScript/JavaScript files in a directory
 */
async function findSourceFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    // Skip ignored patterns
    if (IGNORE_PATTERNS.some((pattern) => entry.name.includes(pattern))) {
      continue;
    }

    if (entry.isDirectory()) {
      await findSourceFiles(fullPath, files);
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Count disposal calls in file content
 */
function countDisposalCalls(content) {
  let count = 0;
  for (const pattern of DISPOSAL_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

/**
 * Analyze a single file for Three.js resource usage
 */
async function analyzeFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const issues = [];
  const resources = [];

  // Find all resource creations
  for (const { type, regex } of RESOURCE_PATTERNS) {
    const matches = [...content.matchAll(regex)];
    for (const match of matches) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      resources.push({
        type,
        line: lineNumber,
        code: match[0],
      });
    }
  }

  // If no resources found, file is clean
  if (resources.length === 0) {
    return { filePath, resources: [], issues: [], disposalCalls: 0, status: 'clean' };
  }

  // Count disposal calls
  const disposalCalls = countDisposalCalls(content);

  // Check for potential leaks
  // Heuristic: If more resources than disposal patterns, flag as potential leak
  if (resources.length > disposalCalls) {
    issues.push({
      severity: 'warning',
      message: `Found ${resources.length} resource(s) but only ${disposalCalls} disposal call(s)`,
    });
  }

  // Check for specific patterns
  const hasUseMemo = content.includes('useMemo');
  const hasUseEffect = content.includes('useEffect');
  const hasDisposalHooks = content.match(/useDispose(Materials|Geometries|Textures|RenderTargets)?\s*\(/);

  if (hasUseMemo && !hasUseEffect && !hasDisposalHooks) {
    issues.push({
      severity: 'error',
      message: 'Uses useMemo for resources but no useEffect or disposal hooks found',
    });
  }

  return {
    filePath,
    resources,
    issues,
    disposalCalls,
    status: issues.some((i) => i.severity === 'error')
      ? 'error'
      : issues.length > 0
        ? 'warning'
        : 'ok',
  };
}

/**
 * Main audit function
 */
async function runAudit(options = {}) {
  console.log(`${colors.bold}${colors.cyan}Three.js Disposal Audit${colors.reset}\n`);

  let allFiles = [];
  for (const dir of SOURCE_DIRS) {
    try {
      const files = await findSourceFiles(dir);
      allFiles = allFiles.concat(files);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`${colors.red}Error scanning ${dir}:${colors.reset}`, error.message);
      }
    }
  }

  console.log(`Scanning ${colors.bold}${allFiles.length}${colors.reset} files...\n`);

  const results = await Promise.all(allFiles.map(analyzeFile));

  // Categorize results
  const errors = results.filter((r) => r.status === 'error');
  const warnings = results.filter((r) => r.status === 'warning');
  const ok = results.filter((r) => r.status === 'ok');
  const clean = results.filter((r) => r.status === 'clean');

  // Print detailed results
  if (errors.length > 0) {
    console.log(`${colors.red}${colors.bold}❌ ERRORS (${errors.length})${colors.reset}\n`);
    for (const result of errors) {
      printFileResult(result, options.verbose);
    }
  }

  if (warnings.length > 0) {
    console.log(`${colors.yellow}${colors.bold}⚠️  WARNINGS (${warnings.length})${colors.reset}\n`);
    for (const result of warnings) {
      printFileResult(result, options.verbose);
    }
  }

  if (options.verbose && ok.length > 0) {
    console.log(`${colors.green}${colors.bold}✓ OK (${ok.length})${colors.reset}\n`);
    for (const result of ok) {
      console.log(`  ${colors.green}✓${colors.reset} ${relative(process.cwd(), result.filePath)}`);
      console.log(
        `    ${result.resources.length} resource(s), ${result.disposalCalls} disposal call(s)\n`,
      );
    }
  }

  // Print summary
  console.log(`\n${colors.bold}Summary:${colors.reset}`);
  console.log(`  ${colors.red}Errors:${colors.reset}   ${errors.length}`);
  console.log(`  ${colors.yellow}Warnings:${colors.reset} ${warnings.length}`);
  console.log(`  ${colors.green}OK:${colors.reset}       ${ok.length}`);
  console.log(`  ${colors.blue}Clean:${colors.reset}    ${clean.length}`);
  console.log(`  ${colors.cyan}Total:${colors.reset}    ${results.length}`);

  // Calculate total resources
  const totalResources = results.reduce((sum, r) => sum + r.resources.length, 0);
  const totalDisposalCalls = results.reduce((sum, r) => sum + r.disposalCalls, 0);

  console.log(`\n${colors.bold}Resource Statistics:${colors.reset}`);
  console.log(`  Resources created:  ${totalResources}`);
  console.log(`  Disposal calls:     ${totalDisposalCalls}`);
  console.log(
    `  Disposal coverage:  ${totalResources > 0 ? Math.round((totalDisposalCalls / totalResources) * 100) : 100}%`,
  );

  // Exit with error code if issues found
  if (errors.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Audit failed with errors${colors.reset}`);
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log(`\n${colors.yellow}${colors.bold}Audit completed with warnings${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.green}${colors.bold}✓ Audit passed${colors.reset}`);
    process.exit(0);
  }
}

/**
 * Print detailed file result
 */
function printFileResult(result, verbose = false) {
  const icon =
    result.status === 'error' ? `${colors.red}❌${colors.reset}` : `${colors.yellow}⚠️ ${colors.reset}`;
  const relativePath = relative(process.cwd(), result.filePath);

  console.log(`${icon} ${colors.bold}${relativePath}${colors.reset}`);

  // Print issues
  for (const issue of result.issues) {
    const color = issue.severity === 'error' ? colors.red : colors.yellow;
    console.log(`  ${color}${issue.message}${colors.reset}`);
  }

  // Print resources if verbose
  if (verbose && result.resources.length > 0) {
    console.log(`\n  ${colors.cyan}Resources found:${colors.reset}`);
    for (const resource of result.resources) {
      console.log(`    Line ${resource.line}: ${resource.type} - ${colors.magenta}${resource.code}${colors.reset}`);
    }
    console.log(`\n  ${colors.cyan}Disposal calls:${colors.reset} ${result.disposalCalls}\n`);
  } else {
    console.log('');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  fix: args.includes('--fix'),
  verbose: args.includes('--verbose') || args.includes('-v'),
};

// Run audit
runAudit(options).catch((error) => {
  console.error(`${colors.red}${colors.bold}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
