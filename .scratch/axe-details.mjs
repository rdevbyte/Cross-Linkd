import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const browser = await chromium.launch(); const context=await browser.newContext({viewport:{width:390,height:844}}); const page=await context.newPage();
try {
  for(const path of ['/', '/search', '/add-listing', '/contact?topic=suggest', '/browse/industries', '/articles']) {
    await page.goto(`http://127.0.0.1:4321${path}`,{waitUntil:'networkidle'});
    const r=await new AxeBuilder({page}).analyze();
    console.log('\nPAGE',path);
    for(const v of r.violations) console.log(JSON.stringify({id:v.id, nodes:v.nodes.map(n=>({target:n.target, html:n.html, summary:n.failureSummary}))},null,2));
  }
} finally {await context.close();await browser.close()}
