import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const toolRoot = fileURLToPath(new URL('../public/tools/media-converter/', import.meta.url));
const manifestURL = new URL('../public/tools/media-converter/engine/engine-manifest.json', import.meta.url);
const digest = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

test('自托管引擎分片完整重建 Wasm，且没有超限静态资源', async () => {
  const manifest = JSON.parse(await fs.readFile(manifestURL, 'utf8'));
  assert.equal(manifest.wrapperVersion, '0.12.15');
  assert.equal(manifest.coreVersion, '0.12.10');
  assert.equal(manifest.schemaVersion, 1);
  const parts = [];
  for (const part of manifest.core.parts) {
    const bytes = await fs.readFile(new URL(part.url, manifestURL));
    assert.equal(bytes.length, part.size);
    assert.equal(digest(bytes), part.sha256);
    assert.ok(bytes.length <= 16 * 1024 * 1024);
    parts.push(bytes);
  }
  const wasm = Buffer.concat(parts);
  assert.equal(wasm.length, manifest.core.size);
  assert.equal(digest(wasm), manifest.core.sha256);
  assert.deepEqual([...wasm.subarray(0, 4)], [0, 97, 115, 109]);
  for (const url of [manifest.wrapper.module, manifest.wrapper.worker, manifest.core.script]) {
    assert.ok((await fs.stat(new URL(url, manifestURL))).size > 0);
  }
  const files = await fs.readdir(toolRoot, {recursive: true, withFileTypes: true});
  for (const entry of files) {
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath, entry.name);
    assert.ok((await fs.stat(file)).size < 25 * 1024 * 1024, `${file} 超过 Pages 单资源限制`);
    assert.ok(!entry.name.endsWith('.wasm'), '原始 Wasm 不应作为超限资源被发布');
  }
});
