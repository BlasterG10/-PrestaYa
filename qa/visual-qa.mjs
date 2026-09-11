import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const roles = ['admin', 'supervisor', 'collector', 'client'];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 }
];

const root = process.cwd();
const out = path.join(root, 'qa', 'artifacts');
const reference = path.join(root, 'qa', 'reference');
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
let failures = [];

for (const role of roles) {
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`file://${path.join(root, 'index.html')}`);
    await page.selectOption('#role', role);
    await page.fill('#username', `${role}-qa`);
    await page.fill('#password', 'qa');
    await page.click('button[data-action="login"]');
    await page.waitForTimeout(100);

    const appVisible = await page.locator('#app').isVisible();
    if (!appVisible) failures.push(`${role}/${viewport.name}: app did not open`);

    const title = await page.locator('#pageTitle').textContent();
    if (!title?.trim()) failures.push(`${role}/${viewport.name}: missing page title`);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (overflow) failures.push(`${role}/${viewport.name}: horizontal overflow`);

    const interactive = await page.locator('button:visible').count();
    if (interactive < 2) failures.push(`${role}/${viewport.name}: unexpectedly low visible interaction count`);

    const shot = path.join(out, `${role}-${viewport.name}.png`);
    await page.screenshot({ path: shot, fullPage: true });

    const ref = path.join(reference, `${role}-${viewport.name}.png`);
    if (fs.existsSync(ref)) {
      const a = PNG.sync.read(fs.readFileSync(ref));
      const b = PNG.sync.read(fs.readFileSync(shot));
      if (a.width !== b.width || a.height !== b.height) {
        failures.push(`${role}/${viewport.name}: screenshot dimensions differ from reference`);
      } else {
        const diff = new PNG({ width: a.width, height: a.height });
        const mismatched = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
        const ratio = mismatched / (a.width * a.height);
        if (ratio > 0.08) {
          fs.writeFileSync(path.join(out, `${role}-${viewport.name}-diff.png`), PNG.sync.write(diff));
          failures.push(`${role}/${viewport.name}: visual difference ${(ratio * 100).toFixed(2)}% > 8% threshold`);
        }
      }
    }

    await page.reload();
  }
}

await browser.close();
console.log(failures.length ? failures.join('\n') : 'Visual QA passed for all roles/viewports.');
if (failures.length) process.exit(1);
