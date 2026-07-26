import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.csv': 'text/csv' };

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

test('imports, preserves failed replacement, resets, and stays responsive', async () => {
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

    await page.locator('#inventory-file').setInputFiles(resolve(root, 'data/demo-csv/balanced-inventory.csv'));
    await page.getByText('Imported balanced-inventory.csv — 6 products loaded.').waitFor();
    assert.equal(await page.locator('.product-card').count(), 6);

    await page.locator('#inventory-file').setInputFiles(resolve(root, 'data/demo-csv/invalid-inventory.csv'));
    await page.getByText('Could not import invalid-inventory.csv. Fix the listed issues and try again.').waitFor();
    assert.equal(await page.getByText('balanced-inventory.csv', { exact: true }).count(), 1);
    assert.equal(await page.locator('.product-card').count(), 6);

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
