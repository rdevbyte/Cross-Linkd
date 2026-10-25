import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
try {
  for (const path of ['/', '/search', '/add-listing', '/contact?topic=suggest', '/browse/industries', '/articles']) {
    const response = await page.goto(`http://127.0.0.1:4321${path}`, { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page }).analyze();
    console.log(JSON.stringify({ path, status: response?.status(), violations: results.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length })) }));
  }
} finally { await context.close(); await browser.close(); }
