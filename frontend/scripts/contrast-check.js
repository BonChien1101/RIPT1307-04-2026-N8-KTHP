const fs = require('fs');
const path = require('path');

function parseGlobalLess(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const vars = { light: {}, dark: {} };
  const lines = src.split(/\r?\n/);
  let mode = 'light';
  let inDark = false;
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('.theme-dark')) {
      inDark = true;
      mode = 'dark';
      continue;
    }
    if (inDark && line === '}') {
      inDark = false;
      mode = 'light';
      continue;
    }
    const m = line.match(/^--([\w-]+)\s*:\s*([^;]+);/);
    if (m) {
      const name = m[1];
      const value = m[2].trim();
      vars[mode][name] = value;
    }
  }
  return vars;
}

function parseColor(str) {
  if (!str) return null;
  str = str.trim();
  if (str.startsWith('rgba')) {
    const nums = str.match(/rgba?\(([^)]+)\)/)[1].split(',').map(s => parseFloat(s));
    return { r: nums[0], g: nums[1], b: nums[2], a: nums[3] };
  }
  if (str.startsWith('rgb')) {
    const nums = str.match(/rgb\(([^)]+)\)/)[1].split(',').map(s => parseInt(s));
    return { r: nums[0], g: nums[1], b: nums[2], a: 1 };
  }
  // hex
  const hex = str.replace(/\s*!important$/, '');
  const h = hex.replace(/['\"]+/g, '');
  if (h[0] === '#') {
    if (h.length === 4) {
      const r = parseInt(h[1] + h[1], 16);
      const g = parseInt(h[2] + h[2], 16);
      const b = parseInt(h[3] + h[3], 16);
      return { r, g, b, a: 1 };
    }
    if (h.length === 7) {
      const r = parseInt(h.slice(1, 3), 16);
      const g = parseInt(h.slice(3, 5), 16);
      const b = parseInt(h.slice(5, 7), 16);
      return { r, g, b, a: 1 };
    }
  }
  // rgba percentage or css var references fallback
  return null;
}

function srgb2lin(v) {
  v = v / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(c) {
  if (!c) return null;
  const R = srgb2lin(c.r);
  const G = srgb2lin(c.g);
  const B = srgb2lin(c.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(a, b) {
  if (!a || !b) return null;
  const L1 = luminance(a);
  const L2 = luminance(b);
  const high = Math.max(L1, L2);
  const low = Math.min(L1, L2);
  return (high + 0.05) / (low + 0.05);
}

function run() {
  const file = path.join(__dirname, '..', 'src', 'styles', 'global.less');
  if (!fs.existsSync(file)) {
    console.error('global.less not found at', file);
    process.exit(1);
  }
  const vars = parseGlobalLess(file);
  const report = [];
  const checks = [
    ['text', 'bg'],
    ['text', 'card-bg'],
    ['muted', 'bg'],
    ['muted', 'card-bg'],
    ['card-head-text', 'primary-start'],
    ['card-head-text', 'card-bg']
  ];

  for (const mode of ['light','dark']) {
    report.push(`\nMode: ${mode}`);
    for (const [a,b] of checks) {
      const va = vars[mode][a];
      const vb = vars[mode][b];
      const ca = parseColor(va);
      const cb = parseColor(vb);
      const ratio = contrastRatio(ca, cb);
      report.push(`- ${a} (${va}) on ${b} (${vb}) => ${ratio ? ratio.toFixed(2) : 'n/a'}` + (ratio ? (ratio >= 4.5 ? ' ✓' : ' ✗ (fail AA)') : ''));
    }
  }

  console.log('Contrast report:');
  console.log(report.join('\n'));
}

run();
