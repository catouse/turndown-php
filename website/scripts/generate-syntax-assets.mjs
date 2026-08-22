import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = resolve(siteRoot, 'node_modules/microlighter');
const publicRoot = resolve(siteRoot, 'public');

const assets = [
  ['dist/microlighter.min.js', 'vendor/microlighter/microlighter.min.js'],
  ['dist/grammars/bash.js', 'vendor/microlighter/grammars/bash.js'],
  ['dist/grammars/css.js', 'vendor/microlighter/grammars/css.js'],
  ['dist/grammars/html.js', 'vendor/microlighter/grammars/html.js'],
  ['dist/grammars/javascript.js', 'vendor/microlighter/grammars/javascript.js'],
  ['dist/grammars/json.js', 'vendor/microlighter/grammars/json.js'],
  ['dist/grammars/markdown.js', 'vendor/microlighter/grammars/markdown.js'],
  ['dist/grammars/php.js', 'vendor/microlighter/grammars/php.js'],
  ['dist/grammars/yaml.js', 'vendor/microlighter/grammars/yaml.js'],
  ['dist/themes/tokyo-night.css', 'vendor/microlighter/themes/tokyo-night.css'],
  ['LICENSE', 'licenses/MICROLIGHTER-MIT.txt'],
];

for (const [source, target] of assets) {
  const output = resolve(publicRoot, target);
  await mkdir(dirname(output), { recursive: true });
  await copyFile(resolve(packageRoot, source), output);
}

console.log(`Generated ${assets.length} microlighter assets.`);
