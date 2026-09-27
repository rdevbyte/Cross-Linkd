/** Prints the production sitemap URL checklist (sitemap itself is served live at /sitemap.xml). */
const base = process.env.PUBLIC_SITE_URL ?? 'https://cross-linkd.vercel.app';
console.log(`Sitemap: ${base}/sitemap.xml`);
console.log(`Robots:  ${base}/robots.txt`);
console.log('Tip: submit the sitemap in Google Search Console after first deploy.');
