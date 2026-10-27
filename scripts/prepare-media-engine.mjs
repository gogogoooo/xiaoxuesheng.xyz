import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const tool = path.join(root, 'public/tools/media-converter');
const wrapperRoot = path.join(root, 'node_modules/@ffmpeg/ffmpeg');
const coreRoot = path.join(root, 'node_modules/@ffmpeg/core');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const partSize = 16 * 1024 * 1024;

async function writeIfChanged(file, bytes) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  try {
    if ((await fs.readFile(file)).equals(buffer)) return;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, buffer);
}

const wrapperPackage = JSON.parse(await fs.readFile(path.join(wrapperRoot, 'package.json'), 'utf8'));
const corePackage = JSON.parse(await fs.readFile(path.join(coreRoot, 'package.json'), 'utf8'));
if (wrapperPackage.version !== '0.12.15' || corePackage.version !== '0.12.10') {
  throw new Error('Unexpected FFmpeg dependency version. Install the pinned lockfile first.');
}
const wasm = await fs.readFile(path.join(coreRoot, 'dist/esm/ffmpeg-core.wasm'));
const wasmHash = sha256(wasm);
const wrapperFiles = (await fs.readdir(path.join(wrapperRoot, 'dist/esm'))).filter((name) => name.endsWith('.js')).sort();
const wrapperBytes = await Promise.all(wrapperFiles.map((name) => fs.readFile(path.join(wrapperRoot, 'dist/esm', name))));
const wrapperHash = sha256(Buffer.concat(wrapperBytes));
const wrapperDir = `vendor/ffmpeg-${wrapperPackage.version}-${wrapperHash.slice(0, 12)}`;
const coreDir = `vendor/core-${corePackage.version}-${wasmHash.slice(0, 12)}`;
for (let index = 0; index < wrapperFiles.length; index += 1) {
  await writeIfChanged(path.join(tool, wrapperDir, wrapperFiles[index]), wrapperBytes[index]);
}
await writeIfChanged(path.join(tool, coreDir, 'ffmpeg-core.js'), await fs.readFile(path.join(coreRoot, 'dist/esm/ffmpeg-core.js')));
const parts = [];
for (let offset = 0, index = 1; offset < wasm.length; offset += partSize, index += 1) {
  const bytes = wasm.subarray(offset, Math.min(offset + partSize, wasm.length));
  const name = `core.${String(index).padStart(2, '0')}.bin`;
  await writeIfChanged(path.join(tool, coreDir, name), bytes);
  parts.push({url: `../${coreDir}/${name}`, size: bytes.length, sha256: sha256(bytes)});
}
const manifest = {
  schemaVersion: 1,
  wrapperVersion: wrapperPackage.version,
  coreVersion: corePackage.version,
  wrapper: {module: `../${wrapperDir}/index.js`, worker: `../${wrapperDir}/worker.js`},
  core: {script: `../${coreDir}/ffmpeg-core.js`, size: wasm.length, sha256: wasmHash, parts},
};
await writeIfChanged(path.join(tool, 'engine/engine-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const notices = [
  '格式工坊 / Third-party media engine notices',
  '',
  `@ffmpeg/ffmpeg ${wrapperPackage.version}: ${wrapperPackage.license || 'See upstream license'}`,
  `@ffmpeg/core ${corePackage.version}: ${corePackage.license || 'See upstream license and bundled codecs'}`,
  'Source and build instructions: https://github.com/ffmpegwasm/ffmpeg.wasm',
  'Core build recipes: https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main/build',
  'FFmpeg 5.1.4 source: https://github.com/FFmpeg/FFmpeg/tree/n5.1.4',
  'FFmpeg source: https://ffmpeg.org/download.html',
  'License details: https://ffmpegwasm.netlify.app/docs/faq/#what-is-the-license-of-ffmpegwasm',
  'The core includes FFmpeg and third-party codecs, whose respective licenses apply.',
];
for (const name of ['ffmpeg-wasm-MIT.txt', 'GPL-2.0.txt']) {
  notices.push('', `--- ${name} ---`, await fs.readFile(path.join(root, 'scripts/licenses', name), 'utf8'));
}
for (const [label, packageRoot] of [['@ffmpeg/ffmpeg', wrapperRoot], ['@ffmpeg/core', coreRoot]]) {
  for (const name of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING']) {
    try {
      notices.push('', `--- ${label}: ${name} ---`, await fs.readFile(path.join(packageRoot, name), 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}
await writeIfChanged(path.join(tool, 'vendor/NOTICES.txt'), notices.join('\n'));

// Check every published asset: a copied original .wasm must not slip through.
async function verifyAssets(directory) {
  for (const entry of await fs.readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unexpected public asset symlink: ${file}`);
    if (entry.isDirectory()) await verifyAssets(file);
    else if (entry.isFile() && (await fs.stat(file)).size >= 25 * 1024 * 1024) {
      throw new Error(`Public asset exceeds Cloudflare Pages 25 MiB limit: ${file}`);
    }
  }
}
await verifyAssets(path.join(root, 'public'));
console.log(`Prepared FFmpeg ${wrapperPackage.version}, core ${corePackage.version}: ${wasm.length} Wasm bytes in ${parts.length} parts.`);
