import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const browser=await chromium.launch(); const context=await browser.newContext({viewport:{width:390,height:844}}); const page=await context.newPage();
try { for(const path of ['/','/search','/add-listing','/contact?topic=suggest','/browse/industries','/articles']) { await page.goto(`http://127.0.0.1:4321${path}`,{waitUntil:'networkidle'}); await page.evaluate(()=>{document.documentElement.dataset.theme='dark'}); await page.waitForTimeout(350); const r=await new AxeBuilder({page}).analyze(); console.log(JSON.stringify({path,violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))})); } } finally {await context.close();await browser.close()}
