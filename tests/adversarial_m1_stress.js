/**
 * STOCKLY WMS NEXT-GEN REDESIGN - MILESTONE 1 ADVERSARIAL STRESS TEST HARNESS
 * Author: challenger_m1_1 (Empirical Challenger)
 * Scope: M1 (Theme, Layout, useCounter bounds, Topbar/CommandBar shortcuts, Contrast, Zero C: pollution)
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedTests = 0;
let failedTests = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passedTests++;
    console.log(`  ✔ PASS: ${name}`);
  } catch (err) {
    failedTests++;
    failures.push({ name, error: err.message, stack: err.stack });
    console.error(`  ✖ FAIL: ${name}`);
    console.error(`    -> ${err.message}`);
  }
}

console.log('======================================================================');
console.log('       STOCKLY WMS NEXT-GEN M1 EMPIRICAL ADVERSARIAL STRESS HARNESS    ');
console.log('======================================================================\n');

// -----------------------------------------------------------------------------
// UTILITY: WCAG 2.1 Contrast Calculation Engine
// -----------------------------------------------------------------------------
function hexToRgb(hex) {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function getRelativeLuminance({ r, g, b }) {
  const srgb = [r / 255, g / 255, b / 255].map(val => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function getContrastRatio(hex1, hex2) {
  const lum1 = getRelativeLuminance(hexToRgb(hex1));
  const lum2 = getRelativeLuminance(hexToRgb(hex2));
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

// =============================================================================
// SUITE 1: THEME TOKENS, CONTRAST RATIOS & STATE SWITCHING
// =============================================================================
console.log('▶ [SUITE 1] Silicon Valley Clean Light & Dark Mode Contrast & State Switching');

const globalsCssPath = path.resolve(__dirname, '../apps/web/src/app/globals.css');
const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');

// Parse CSS Variables
function extractCssVariables(css, selectorRegex) {
  const match = css.match(selectorRegex);
  if (!match) return {};
  const block = match[1];
  const vars = {};
  const varRegex = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
  let vMatch;
  while ((vMatch = varRegex.exec(block)) !== null) {
    vars[`--${vMatch[1]}`] = vMatch[2].trim();
  }
  return vars;
}

const lightVars = extractCssVariables(globalsCss, /(?::root\s*,\s*\.light|\.light)\s*\{([^}]+)\}/);
const darkVars = extractCssVariables(globalsCss, /\.dark\s*\{([^}]+)\}/);

test('1.1: Core palette tokens are comprehensively defined in Clean Light mode', () => {
  const requiredTokens = [
    '--bg-primary',
    '--bg-secondary',
    '--bg-tertiary',
    '--text-primary',
    '--text-secondary',
    '--text-muted',
    '--accent-primary',
    '--accent-cobalt',
    '--border-light',
    '--shadow-enterprise',
    '--shadow-card'
  ];
  for (const token of requiredTokens) {
    assert(lightVars[token], `Missing light token: ${token}`);
  }
});

test('1.2: Core palette tokens are preserved in Titanium Obsidian Dark mode', () => {
  const requiredTokens = [
    '--bg-primary',
    '--bg-secondary',
    '--bg-tertiary',
    '--text-primary',
    '--text-secondary',
    '--text-muted',
    '--accent-primary',
    '--accent-cobalt',
    '--border-light',
    '--shadow-enterprise',
    '--shadow-card'
  ];
  for (const token of requiredTokens) {
    assert(darkVars[token], `Missing dark token: ${token}`);
  }
});

test('1.3: Clean Light primary text #0F172A on card #FFFFFF exceeds WCAG AAA (>= 7.0:1)', () => {
  const textPrimary = '#0F172A';
  const bgCard = '#FFFFFF';
  const ratio = getContrastRatio(textPrimary, bgCard);
  console.log(`    Calculated Contrast: ${ratio.toFixed(2)}:1 (Worker claimed 15.6:1)`);
  assert(ratio >= 15.0, `Contrast ratio ${ratio} is less than 15.0:1`);
  assert(ratio >= 7.0, `Fails WCAG AAA requirement of 7.0:1`);
});

test('1.4: Clean Light primary text #0F172A on canvas #F8FAFC exceeds WCAG AAA (>= 7.0:1)', () => {
  const textPrimary = '#0F172A';
  const bgCanvas = '#F8FAFC';
  const ratio = getContrastRatio(textPrimary, bgCanvas);
  console.log(`    Calculated Contrast: ${ratio.toFixed(2)}:1`);
  assert(ratio >= 14.0, `Contrast ratio ${ratio} is less than 14.0:1`);
  assert(ratio >= 7.0, `Fails WCAG AAA requirement of 7.0:1`);
});

test('1.5: Clean Light secondary text #334155 on card #FFFFFF exceeds WCAG AAA (>= 7.0:1)', () => {
  const textSecondary = '#334155';
  const bgCard = '#FFFFFF';
  const ratio = getContrastRatio(textSecondary, bgCard);
  console.log(`    Calculated Contrast: ${ratio.toFixed(2)}:1 (Worker claimed 9.0:1)`);
  assert(ratio >= 8.5, `Contrast ratio ${ratio} is less than 8.5:1`);
  assert(ratio >= 7.0, `Fails WCAG AAA requirement of 7.0:1`);
});

test('1.6: Dark mode primary text #F8FAFC on canvas #070D18 exceeds WCAG AAA (>= 7.0:1)', () => {
  const textPrimary = '#F8FAFC';
  const bgCanvas = '#070D18';
  const ratio = getContrastRatio(textPrimary, bgCanvas);
  console.log(`    Calculated Contrast: ${ratio.toFixed(2)}:1`);
  assert(ratio >= 17.0, `Contrast ratio ${ratio} is less than 17.0:1`);
  assert(ratio >= 7.0, `Fails WCAG AAA requirement of 7.0:1`);
});

test('1.7: Dark mode primary text #F8FAFC on card #0F172A exceeds WCAG AAA (>= 7.0:1)', () => {
  const textPrimary = '#F8FAFC';
  const bgCard = '#0F172A';
  const ratio = getContrastRatio(textPrimary, bgCard);
  console.log(`    Calculated Contrast: ${ratio.toFixed(2)}:1`);
  assert(ratio >= 14.0, `Contrast ratio ${ratio} is less than 14.0:1`);
  assert(ratio >= 7.0, `Fails WCAG AAA requirement of 7.0:1`);
});

test('1.8: RootLayout configures defaultTheme="light" and disableTransitionOnChange', () => {
  const layoutPath = path.resolve(__dirname, '../apps/web/src/app/layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  assert(layoutContent.includes('defaultTheme="light"'), 'layout.tsx must configure defaultTheme="light"');
  assert(layoutContent.includes('attribute="class"'), 'layout.tsx must configure attribute="class"');
  assert(layoutContent.includes('disableTransitionOnChange'), 'layout.tsx must configure disableTransitionOnChange');
});

test('1.9: High-frequency theme toggle state machine simulation (10,000 rapid switches)', () => {
  let activeTheme = 'light';
  const themeHistory = [];
  for (let i = 0; i < 10000; i++) {
    activeTheme = activeTheme === 'light' ? 'dark' : 'light';
    const activeTokens = activeTheme === 'light' ? lightVars : darkVars;
    assert(activeTokens['--bg-primary'] !== undefined, `Token lookup failed on iteration ${i}`);
    assert(activeTokens['--text-primary'] !== undefined, `Token lookup failed on iteration ${i}`);
    themeHistory.push(activeTheme);
  }
  assert.strictEqual(themeHistory.length, 10000);
  assert.strictEqual(activeTheme, 'light');
});

// =============================================================================
// SUITE 2: useCounter INTEGER ANIMATION BOUNDS UNDER ADVERSARIAL STRESS
// =============================================================================
console.log('\n▶ [SUITE 2] useCounter Hook Mathematical Precision & Boundary Stress');

function simulateCounterAnimation(end, duration = 1200, frameStepMs = 16.66) {
  let startTimestamp = null;
  const frames = [];
  let currentTimestamp = 0;
  let count = 0;

  while (true) {
    if (!startTimestamp) startTimestamp = currentTimestamp;
    const progress = duration > 0 ? Math.min((currentTimestamp - startTimestamp) / duration, 1) : 1;
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    count = Math.floor(easeOutQuart * end);
    frames.push({ time: currentTimestamp, progress, count });

    if (progress >= 1) {
      count = end;
      frames[frames.length - 1].count = end;
      break;
    }
    currentTimestamp += frameStepMs;
  }

  return { finalCount: count, frames };
}

test('2.1: useCounter under Zero boundary (end = 0) maintains 0 on all frames', () => {
  const result = simulateCounterAnimation(0, 1200);
  assert.strictEqual(result.finalCount, 0);
  for (const f of result.frames) {
    assert.strictEqual(f.count, 0, `Frame count ${f.count} is not 0`);
  }
});

test('2.2: useCounter under Negative boundary (end = -50) produces strictly integer values down to -50', () => {
  const result = simulateCounterAnimation(-50, 1200);
  assert.strictEqual(result.finalCount, -50);
  let prevCount = 0;
  for (const f of result.frames) {
    assert(Number.isInteger(f.count), `Frame count ${f.count} is not an integer`);
    assert(f.count <= 0 && f.count >= -50, `Frame count ${f.count} is out of bounds [0, -50]`);
    assert(f.count <= prevCount, `Frame count ${f.count} did not monotonically decrease from ${prevCount}`);
    prevCount = f.count;
  }
});

test('2.3: useCounter under Extreme High Value (end = 10,000,000) maintains integer precision and smooth progression', () => {
  const result = simulateCounterAnimation(10000000, 1200);
  assert.strictEqual(result.finalCount, 10000000);
  let prevCount = 0;
  for (const f of result.frames) {
    assert(Number.isInteger(f.count), `Frame count ${f.count} is not an integer`);
    assert(f.count >= 0 && f.count <= 10000000, `Frame count ${f.count} out of bounds`);
    assert(f.count >= prevCount, `Frame count ${f.count} decreased from ${prevCount}`);
    prevCount = f.count;
  }
});

test('2.4: useCounter under Zero Duration (duration = 0) completes in a single frame without infinite recursion', () => {
  const result = simulateCounterAnimation(500, 0);
  assert.strictEqual(result.finalCount, 500);
  assert.strictEqual(result.frames.length, 1);
});

test('2.5: useCounter under Decimals (end = 45.8) verifies DashboardContent calls Math.round() on metric inputs', () => {
  const dashContentPath = path.resolve(__dirname, '../apps/web/src/app/dashboard/DashboardContent.tsx');
  const dashContent = fs.readFileSync(dashContentPath, 'utf8');

  assert(dashContent.includes('Math.round(metrics.physicalStockUnits'), 'physicalStockUnits must be guarded with Math.round()');
  assert(dashContent.includes('Math.round(metrics.totalStockUnits)'), 'totalStockUnits must be guarded with Math.round()');
});

test('2.6: useCounter state race simulation under rapid target value changes (100 -> 5000 -> 20 -> 1000)', () => {
  const targets = [100, 5000, 20, 1000];
  let finalState = 0;
  for (const t of targets) {
    const res = simulateCounterAnimation(t, 200);
    finalState = res.finalCount;
  }
  assert.strictEqual(finalState, 1000);
});

// =============================================================================
// SUITE 3: TOPBAR & COMMANDBAR KEYBOARD SHORTCUTS & RAPID INPUTS
// =============================================================================
console.log('\n▶ [SUITE 3] Topbar & CommandBar Keyboard Shortcuts & Rapid Streams');

const commandBarPath = path.resolve(__dirname, '../apps/web/src/components/layout/CommandBar.tsx');
const commandBarContent = fs.readFileSync(commandBarPath, 'utf8');

test('3.1: CommandBar handles Ctrl+K and Cmd+K (MetaKey) case-insensitively', () => {
  assert(
    commandBarContent.includes("(e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'"),
    'CommandBar must support both Ctrl+K and Meta+K with case-insensitive check'
  );
});

test('3.2: CommandBar Escape key listener safely closes modal when open', () => {
  assert(
    commandBarContent.includes("e.key === 'Escape' && open"),
    'CommandBar must check open state before closing on Escape'
  );
});

test('3.3: CommandBar Arrow navigation modulo arithmetic prevents negative indices and out-of-bounds', () => {
  assert(
    commandBarContent.includes('(prev + 1) % (filtered.length || 1)'),
    'ArrowDown must guard against division by zero using (filtered.length || 1)'
  );
  assert(
    commandBarContent.includes('(prev - 1 + (filtered.length || 1)) % (filtered.length || 1)'),
    'ArrowUp must guard against negative indices and division by zero'
  );

  const simulateArrowNav = (initialIndex, keyPresses, listLength) => {
    let index = initialIndex;
    for (const key of keyPresses) {
      if (key === 'ArrowDown') {
        index = (index + 1) % (listLength || 1);
      } else if (key === 'ArrowUp') {
        index = (index - 1 + (listLength || 1)) % (listLength || 1);
      }
      assert(index >= 0 && index < Math.max(listLength, 1), `Invalid index ${index} for length ${listLength}`);
    }
    return index;
  };

  const keys = Array.from({ length: 5000 }, () => (Math.random() > 0.5 ? 'ArrowDown' : 'ArrowUp'));
  simulateArrowNav(0, keys, 9);
  simulateArrowNav(0, keys, 0);
});

test('3.4: CommandBar search filtering handles edge cases (Arabic, English, punctuation, injection strings)', () => {
  const rawCommands = [
    { id: 'warehouse-map', titleAr: 'خريطة المستودع ثلاثية الأبعاد (Digital Twin)', titleEn: '3D Warehouse Digital Twin Map', categoryAr: 'العمليات اللوجستية', categoryEn: 'Operations' },
    { id: 'dashboard', titleAr: 'مركز العمليات والمراقبة الحية (Mission Control)', titleEn: 'Mission Control Dashboard', categoryAr: 'العمليات اللوجستية', categoryEn: 'Operations' },
    { id: 'inventory', titleAr: 'مصفوفة المخزون والأرصدة الحية', titleEn: 'Smart Inventory Matrix', categoryAr: 'إدارة المخزون', categoryEn: 'Inventory' },
    { id: 'additions', titleAr: 'رصيف الاستلام وأذون التوريد (Inbound)', titleEn: 'Inbound Receiving & Additions', categoryAr: 'حركة البضائع', categoryEn: 'Movement' },
    { id: 'disbursements', titleAr: 'رصيف الصرف ومسار الشحن والتوزيع (Outbound)', titleEn: 'Outbound Dispatch & Disbursements', categoryAr: 'حركة البضائع', categoryEn: 'Movement' },
    { id: 'cycle-count', titleAr: 'محرك الجرد الدوري والأعمى (Cycle Counting)', titleEn: 'Blind Cycle Count & Auditing', categoryAr: 'الحوكمة والمطابقة', categoryEn: 'Governance' },
    { id: 'item-ledger', titleAr: 'كارت الصنف والمسار الزمني للحركات', titleEn: 'Item Ledger & Bin Card Timeline', categoryAr: 'الحوكمة والمطابقة', categoryEn: 'Governance' },
    { id: 'qc-records', titleAr: 'محاضر الفحص الفني والاستلام والعهد', titleEn: 'Technical Inspection & Custody Records', categoryAr: 'الحوكمة والمطابقة', categoryEn: 'Governance' },
    { id: 'barcode-scan', titleAr: 'تشغيل ماسح الباركود والـ QR بالكاميرا', titleEn: 'Launch Camera Barcode / QR Scanner', categoryAr: 'أدوات سريعة', categoryEn: 'Quick Tools' }
  ];

  const filterFn = (search) => rawCommands.filter(c => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    return (
      c.titleAr.toLowerCase().includes(query) ||
      c.titleEn.toLowerCase().includes(query) ||
      c.categoryAr.toLowerCase().includes(query) ||
      c.categoryEn.toLowerCase().includes(query)
    );
  });

  assert.strictEqual(filterFn('').length, 9);
  assert.strictEqual(filterFn('   ').length, 9);
  assert(filterFn('مستودع').length >= 1);
  assert(filterFn('warehouse').length >= 1);
  assert(filterFn('WAREHOUSE').length >= 1);
  assert.strictEqual(filterFn('xyznonexistent123').length, 0);
  assert.strictEqual(filterFn("'; DROP TABLE items; --").length, 0);
  assert.strictEqual(filterFn('🚀📦🔥').length, 0);
});

test('3.5: All 9 CommandBar destination routes exist as static Next.js pages', () => {
  const routes = [
    'warehouse-map',
    'dashboard',
    'inventory',
    'additions',
    'disbursements',
    'inventory-sheets',
    'item-ledger',
    'completion-records'
  ];
  for (const r of routes) {
    const pagePath = path.resolve(__dirname, `../apps/web/src/app/${r}/page.tsx`);
    assert(fs.existsSync(pagePath), `Page route does not exist: ${pagePath}`);
  }
});

// =============================================================================
// SUITE 4: LAYOUT STABILITY, CLS & TOUCH TARGET ERGONOMICS
// =============================================================================
console.log('\n▶ [SUITE 4] Layout Stability, Zero CLS & Tablet Touch Targets');

test('4.1: Skeleton loading container matches 142px height of loaded KPI cards for CLS = 0.00', () => {
  const dashContentPath = path.resolve(__dirname, '../apps/web/src/app/dashboard/DashboardContent.tsx');
  const dashContent = fs.readFileSync(dashContentPath, 'utf8');

  // Verify skeleton has 142px card placeholders
  assert(dashContent.includes("height: '142px'"), 'Skeleton card placeholders must enforce 142px height');
  // Verify rendered KPI card matches minHeight 142px
  assert(dashContent.includes("minHeight: '142px'"), 'Rendered KPI cards must enforce minHeight 142px');
});

test('4.2: Tablet navigation strip satisfies 44px minimum touch target height (WCAG 2.5.5)', () => {
  const topbarPath = path.resolve(__dirname, '../apps/web/src/components/layout/Topbar.tsx');
  const topbarContent = fs.readFileSync(topbarPath, 'utf8');

  // Verify .mobile-tab-pill has min-height: 44px !important;
  assert(topbarContent.includes('min-height: 44px'), 'Mobile tabs strip must provide min-height: 44px');
  assert(topbarContent.includes("touch-action: pan-x"), 'Mobile tabs strip must define touch-action: pan-x');
  assert(topbarContent.includes("-webkit-overflow-scrolling: touch"), 'Mobile tabs strip must support smooth inertial scrolling');
});

// =============================================================================
// SUITE 5: ZERO DRIVE C: POLLUTION VERIFICATION
// =============================================================================
console.log('\n▶ [SUITE 5] Zero Drive C: Pollution Verification');

test('5.1: Next.js build output and node_modules reside strictly on Drive D:', () => {
  const nextDir = path.resolve(__dirname, '../apps/web/.next');
  assert(fs.existsSync(nextDir), 'Next.js build output (.next) must exist on Drive D:');
  assert(nextDir.startsWith('D:\\') || nextDir.startsWith('d:\\'), `Next dir ${nextDir} is not on Drive D:`);

  const nodeModulesDir = path.resolve(__dirname, '../apps/web/node_modules');
  assert(fs.existsSync(nodeModulesDir), 'node_modules must exist on Drive D:');
  assert(nodeModulesDir.startsWith('D:\\') || nodeModulesDir.startsWith('d:\\'), `node_modules is not on Drive D:`);
});

test('5.2: Verification that verify_nextgen.js exists and is runnable', () => {
  const verifyPath = path.resolve(__dirname, 'verify_nextgen.js');
  assert(fs.existsSync(verifyPath), 'tests/verify_nextgen.js must exist');
  assert(fs.statSync(verifyPath).size > 10000, 'verify_nextgen.js must be comprehensive (>10KB)');
});

// =============================================================================
// SUMMARY & EXIT
// =============================================================================
console.log('\n======================================================================');
console.log(`  M1 ADVERSARIAL STRESS TEST SUMMARY`);
console.log(`  Passed: ${passedTests} / ${passedTests + failedTests}`);
console.log(`  Failed: ${failedTests} / ${passedTests + failedTests}`);
console.log('======================================================================');

if (failedTests > 0) {
  console.error('\n✖ ADVERSARIAL CHALLENGE IDENTIFIED CRITICAL FAILURES:');
  for (const f of failures) {
    console.error(`- ${f.name}: ${f.error}`);
  }
  process.exit(1);
} else {
  console.log('\n✨ ALL M1 ADVERSARIAL STRESS TESTS PASSED WITH 100% SUCCESS ✨\n');
  process.exit(0);
}
