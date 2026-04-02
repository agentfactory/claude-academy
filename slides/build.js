#!/usr/bin/env node
/**
 * Claude Academy Slide Builder
 * Reads slides.json, renders each slide as HTML using the template, and screenshots to PNG.
 *
 * Usage:
 *   node slides/build.js              # Build all slides
 *   node slides/build.js --ids 01,05  # Build specific slides
 */

const fs = require('fs');
const path = require('path');

const SLIDE_WIDTH = 1080;
const SLIDE_HEIGHT = 1350;
const OUTPUT_DIR = path.join(__dirname, 'output');
const TEMPLATE_PATH = path.join(__dirname, 'template.html');
const DATA_PATH = path.join(__dirname, 'slides.json');

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const ICONS = {
  document: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  zap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  brain: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2a3.5 3.5 0 00-3.4 4.35A3.5 3.5 0 004 10a3.5 3.5 0 003.1 3.48A3.5 3.5 0 0010.5 17h.5"/><path d="M14.5 2a3.5 3.5 0 013.4 4.35A3.5 3.5 0 0120 10a3.5 3.5 0 01-3.1 3.48A3.5 3.5 0 0113.5 17h-.5"/><path d="M12 2v15"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`,
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
  lightbulb: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6m-5 4h4M12 2a7 7 0 00-3 13.33V17h6v-1.67A7 7 0 0012 2z"/></svg>`,
};

// ── Section Renderers ─────────────────────────────────────────────────────────

function renderSectionHeader(section) {
  return `
    <div class="section-header">
      <span class="section-header-label">${section.label}</span>
      <span class="section-header-line"></span>
    </div>`;
}

function renderTextBox(section) {
  return `
    <div class="text-box">
      <p>${section.content}</p>
    </div>`;
}

function renderCardGrid(section) {
  const colsClass = section.cols === 2 ? ' cols-2' : '';
  const cards = section.cards.map(card => `
      <div class="card">
        <div class="card-icon">${ICONS[card.icon] || ICONS.star}</div>
        <div class="card-title">${card.title}</div>
        <div class="card-desc">${card.desc}</div>
      </div>`).join('');
  return `
    <div class="card-grid${colsClass}">
      ${cards}
    </div>`;
}

function renderComparison(section) {
  const leftItems = section.left.items.map(i => `<li>${i}</li>`).join('');
  const rightItems = section.right.items.map(i => `<li>${i}</li>`).join('');
  return `
    <div class="comparison">
      <div class="comparison-panel left">
        <span class="panel-badge ${section.left.badgeStyle}">${section.left.badge}</span>
        <div class="panel-title">${section.left.title}</div>
        <div class="panel-desc">${section.left.desc}</div>
        <ul class="panel-list">${leftItems}</ul>
      </div>
      <div class="comparison-panel right">
        <span class="panel-badge ${section.right.badgeStyle}">${section.right.badge}</span>
        <div class="panel-title">${section.right.title}</div>
        <div class="panel-desc">${section.right.desc}</div>
        <ul class="panel-list">${rightItems}</ul>
      </div>
    </div>`;
}

function renderQuote(section) {
  return `
    <div class="quote-block">
      <div class="quote-text">${section.text}</div>
      ${section.attribution ? `<div class="quote-attribution">${section.attribution}</div>` : ''}
    </div>`;
}

function renderBulletList(section) {
  const items = section.items.map(i => `<li>${i}</li>`).join('');
  return `
    <ul class="bullet-list">
      ${items}
    </ul>`;
}

function renderNumberedList(section) {
  const items = section.items.map(i => `<li>${i}</li>`).join('');
  return `
    <ol class="numbered-list">
      ${items}
    </ol>`;
}

function renderTable(section) {
  const headers = section.headers.map(h => `<th>${h}</th>`).join('');
  const rows = section.rows.map(row =>
    `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
  ).join('');
  return `
    <table class="slide-table">
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderDivider() {
  return `<div class="divider"></div>`;
}

const RENDERERS = {
  'section-header': renderSectionHeader,
  'text-box': renderTextBox,
  'card-grid': renderCardGrid,
  'comparison': renderComparison,
  'quote': renderQuote,
  'bullet-list': renderBulletList,
  'numbered-list': renderNumberedList,
  'table': renderTable,
  'divider': renderDivider,
};

// ── Build HTML for a slide ────────────────────────────────────────────────────

function buildSlideHTML(templateHTML, slide) {
  const sections = slide.sections.map(section => {
    const renderer = RENDERERS[section.type];
    if (!renderer) {
      console.warn(`  Unknown section type: ${section.type}`);
      return '';
    }
    return renderer(section);
  }).join('\n');

  const slideContent = `
    <span class="series-label">${slide.seriesLabel}</span>
    <div class="slide-title">${slide.title}</div>
    ${slide.subtitle ? `<div class="slide-subtitle">${slide.subtitle}</div>` : ''}
    <div class="divider"></div>
    ${sections}
    <div class="spacer"></div>
    <div class="slide-footer">
      <span class="footer-copyright">Copyright by Claude Academy</span>
      <span class="footer-logo">Claude Academy</span>
    </div>
  `;

  // Fix font paths for output directory (fonts are in ../fonts/ relative to output/)
  let html = templateHTML.replace(
    /<!-- Content injected by build script -->/,
    slideContent
  );
  html = html.replace(/url\('fonts\//g, "url('../fonts/");
  return html;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Parse args
  const args = process.argv.slice(2);
  let filterIds = null;
  const idsFlag = args.indexOf('--ids');
  if (idsFlag !== -1 && args[idsFlag + 1]) {
    filterIds = args[idsFlag + 1].split(',').map(id => id.trim());
  }

  // Read template and data
  const templateHTML = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const slides = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

  // Ensure output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Filter slides if --ids provided
  const toRender = filterIds
    ? slides.filter(s => filterIds.includes(s.id))
    : slides;

  console.log(`Building ${toRender.length} slide(s)...\n`);

  const { execSync } = require('child_process');

  for (const slide of toRender) {
    const html = buildSlideHTML(templateHTML, slide);

    // Save HTML file
    const htmlPath = path.join(OUTPUT_DIR, `${slide.filename}.html`);
    fs.writeFileSync(htmlPath, html);
    console.log(`  ✓ ${slide.filename}.html`);

    // Try to render PNG using wkhtmltoimage (with xvfb for headless rendering)
    const pngPath = path.join(OUTPUT_DIR, `${slide.filename}.png`);
    try {
      execSync(
        `xvfb-run --auto-servernum wkhtmltoimage ` +
        `--width ${SLIDE_WIDTH} --height ${SLIDE_HEIGHT} ` +
        `--quality 100 --enable-local-file-access ` +
        `--load-error-handling ignore ` +
        `"${htmlPath}" "${pngPath}"`,
        { timeout: 30000, stdio: 'pipe' }
      );
      console.log(`  ✓ ${slide.filename}.png (${SLIDE_WIDTH}x${SLIDE_HEIGHT})`);
    } catch (err) {
      // wkhtmltoimage often exits with code 1 but still produces output
      if (fs.existsSync(pngPath)) {
        console.log(`  ✓ ${slide.filename}.png (${SLIDE_WIDTH}x${SLIDE_HEIGHT}) [with warnings]`);
      } else {
        console.warn(`  ✗ ${slide.filename}.png failed: ${err.message}`);
      }
    }
  }

  console.log(`\nDone! ${toRender.length} slide(s) saved to ${OUTPUT_DIR}/`);
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
