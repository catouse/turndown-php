import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = resolve(siteRoot, 'node_modules/microlighter');
const publicRoot = resolve(siteRoot, 'public');

const assets = [
  ['dist/microlighter.min.js', 'vendor/microlighter/microlighter.min.js'],
  ['dist/grammars/bash.js', 'vendor/microlighter/grammars/bash.js'],
  ['dist/grammars/php.js', 'vendor/microlighter/grammars/php.js'],
  ['dist/themes/tokyo-night.css', 'vendor/microlighter/themes/tokyo-night.css'],
  ['LICENSE', 'licenses/MICROLIGHTER-MIT.txt'],
];

for (const [source, target] of assets) {
  const output = resolve(publicRoot, target);
  await mkdir(dirname(output), { recursive: true });
  await copyFile(resolve(packageRoot, source), output);
}

console.log(`Generated ${assets.length} microlighter assets.`);
