import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.csv': 'text/csv' };
const scenarios = [
  {
    fileName: 'balanced-inventory.csv',
    counts: { Urgent: 4, 'Low Stock': 12, 'Expiring Soon': 16, Safe: 48 },
    headline: '4 cases are at the red line.',
  },
  {
    fileName: 'high-urgency-inventory.csv',
    counts: { Urgent: 45, 'Low Stock': 10, 'Expiring Soon': 10, Safe: 15 },
    headline: '45 cases are at the red line.',
  },
  {
    fileName: 'expiration-heavy-inventory.csv',
    counts: { Urgent: 0, 'Low Stock': 0, 'Expiring Soon': 60, Safe: 20 },
    headline: '60 products need attention today.',
  },
  {
    fileName: 'all-safe-inventory.csv',
    counts: { Urgent: 0, 'Low Stock': 0, 'Expiring Soon': 0, Safe: 80 },
    headline: 'Inventory is clear for today.',
  },
];

async function startServer() {
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const target = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (relative(root, target).startsWith('..')) { response.writeHead(403).end(); return; }
    try {
      const contents = await readFile(target);
      response.writeHead(200, { 'content-type': types[extname(target)] ?? 'application/octet-stream' }).end(contents);
    }
    catch { response.writeHead(404).end(); }
  });
  await new Promise((resolveServer) => server.listen(0, '127.0.0.1', resolveServer));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

async function dashboardCounts(page) {
  return Object.fromEntries(await page.locator('.rail-item').evaluateAll((items) =>
    items.map((item) => [
      item.querySelector('.rail-status')?.lastChild?.textContent.trim(),
      Number(item.querySelector('strong')?.textContent),
    ]),
  ));
}

test('imports every 80-product demo, preserves failed replacement, resets, and stays responsive', async () => {
  const { server, url } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Import a CSV inventory file to begin.' }).waitFor();
    assert.equal(await page.locator('.product-card').count(), 0);

    for (const scenario of scenarios) {
      await page.locator('#inventory-file').setInputFiles(resolve(root, 'data/demo-csv', scenario.fileName));
      await page.getByText(`Imported ${scenario.fileName} — 80 products loaded.`).waitFor();
      await page.getByRole('heading', { name: scenario.headline }).waitFor();
      assert.equal(await page.locator('.product-card').count(), 80);
      assert.deepEqual(await dashboardCounts(page), scenario.counts);
    }

    await page.locator('#inventory-file').setInputFiles(resolve(root, 'data/demo-csv/invalid-inventory.csv'));
    await page.getByText('Could not import invalid-inventory.csv. Fix the listed issues and try again.').waitFor();
    assert.equal(await page.getByText('all-safe-inventory.csv', { exact: true }).count(), 1);
    assert.equal(await page.locator('.product-card').count(), 80);
    assert.deepEqual(await dashboardCounts(page), scenarios.at(-1).counts);

    await page.getByRole('button', { name: 'Clear inventory' }).click();
    await page.getByText('Inventory cleared. Import a CSV inventory file to begin.').waitFor();
    assert.equal(await page.locator('.product-card').count(), 0);

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.reload({ waitUntil: 'networkidle' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, `${width}px should not overflow horizontally`);
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise((resolveServer) => server.close(resolveServer));
  }
});
