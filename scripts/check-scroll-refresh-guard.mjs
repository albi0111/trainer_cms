import { readFileSync } from 'node:fs';

const pageWrapperCss = readFileSync('src/components/layout/PageWrapper.css', 'utf8');
const indexCss = readFileSync('src/index.css', 'utf8');

const failures = [];

const pageScrollerRule = pageWrapperCss.match(/\.page-wrapper--scroll\s*\{[\s\S]*?\}/);

if (!pageScrollerRule) {
  failures.push('Missing .page-wrapper--scroll rule.');
} else {
  const rule = pageScrollerRule[0];

  if (!/overflow-y\s*:\s*auto\s*;/.test(rule)) {
    failures.push('.page-wrapper--scroll must remain the internal vertical scroll surface.');
  }

  if (!/overscroll-behavior-y\s*:\s*(contain|none)\s*;/.test(rule)) {
    failures.push('.page-wrapper--scroll must contain vertical overscroll to block browser pull-to-refresh.');
  }
}

if (/\.page-wrapper--scroll\s*\{[\s\S]*?overflow\s*:\s*visible\s*;[\s\S]*?\}/.test(pageWrapperCss)) {
  failures.push('.page-wrapper--scroll must not use overflow: visible; it bypasses the PWA scroll guard.');
}

const bodyRule = indexCss.match(/body\s*\{[\s\S]*?\}/);

if (!bodyRule || !/overscroll-behavior\s*:\s*none\s*;/.test(bodyRule[0])) {
  failures.push('body must keep overscroll-behavior: none as the viewport-level fallback.');
}

if (!bodyRule || !/overflow\s*:\s*hidden\s*;/.test(bodyRule[0])) {
  failures.push('body must keep overflow: hidden so scrolling stays inside the app surface.');
}

if (failures.length > 0) {
  console.error('PWA scroll refresh guard failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('PWA scroll refresh guard passed.');
