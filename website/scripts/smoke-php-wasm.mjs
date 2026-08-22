import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PhpNode } from 'php-wasm/PhpNode';
import * as dom84 from 'php-wasm-dom/8.4.mjs';
import * as libxml from 'php-wasm-libxml';
import * as mbstring84 from 'php-wasm-mbstring/8.4.mjs';
import * as xml84 from 'php-wasm-xml/8.4.mjs';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generatedSource = await readFile(
  resolve(siteRoot, 'app/php-files.generated.ts'),
  'utf8',
);
const filesPrefix = 'export const phpRuntimeFiles = ';
const filesStart = generatedSource.indexOf(filesPrefix);
const filesEnd = generatedSource.indexOf(' as const;', filesStart);

assert.notEqual(filesStart, -1, 'Generated PHP file manifest is missing.');
assert.notEqual(filesEnd, -1, 'Generated PHP file manifest is incomplete.');

const phpFiles = JSON.parse(
  generatedSource.slice(filesStart + filesPrefix.length, filesEnd),
);

function collectDirectories(paths) {
  const directories = new Set();

  for (const path of paths) {
    const segments = path.split('/').filter(Boolean);
    segments.pop();

    let directory = '';
    for (const segment of segments) {
      directory += '/' + segment;
      directories.add(directory);
    }
  }

  return [...directories].sort((left, right) => {
    const depthDifference = left.split('/').length - right.split('/').length;
    return depthDifference || left.localeCompare(right);
  });
}

let stderr = '';
const runtime = new PhpNode({
  version: '8.4',
  sharedLibs: [libxml, xml84, dom84, mbstring84],
  ini: [
    'display_errors=0',
    'display_startup_errors=0',
    'html_errors=0',
    'log_errors=0',
    'memory_limit=256M',
  ].join('\n'),
});

runtime.addEventListener('error', (event) => {
  const detail = event.detail;
  stderr += Array.isArray(detail) ? detail.join('') : '';
});

await runtime.binary;

for (const directory of collectDirectories(phpFiles.map(({ path }) => path))) {
  await runtime.mkdir(directory);
}

for (const file of phpFiles) {
  await runtime.writeFile(file.path, Buffer.from(file.base64, 'base64'));
}

const capabilities = JSON.parse(await runtime.exec(
  "\n(static function (): string {\n" +
  "require_once '/app/bootstrap.php';\n" +
  "return json_encode([\n" +
  "    'php' => PHP_VERSION,\n" +
  "    'dom' => class_exists('DOMDocument'),\n" +
  "    'libxml' => extension_loaded('libxml'),\n" +
  "    'mbstring' => extension_loaded('mbstring'),\n" +
  "    'turndown' => class_exists('Catouse\\\\Turndown\\\\TurndownService'),\n" +
  "], JSON_THROW_ON_ERROR);\n" +
  "})()",
));

assert.match(capabilities.php, /^8\.4\./);
assert.equal(capabilities.dom, true);
assert.equal(capabilities.libxml, true);
assert.equal(capabilities.mbstring, true);
assert.equal(capabilities.turndown, true);

const payload = {
  html: [
    '<h1>PHP WASM</h1>',
    '<p>你好 <strong>turndown-php</strong></p>',
    '<ul><li>local conversion</li></ul>',
    '<table><thead><tr><th>Name</th><th>Value</th></tr></thead>',
    '<tbody><tr><td>runtime</td><td>PHP 8.4</td></tr></tbody></table>',
  ].join(''),
  options: { bulletListMarker: '-', headingStyle: 'atx' },
  gfm: true,
};
const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
const result = JSON.parse(await runtime.exec(
  "\n(static function (): string {\n" +
  "require_once '/app/bridge.php';\n" +
  "return json_encode(turndown_wasm_convert(base64_decode('" +
  encodedPayload +
  "', true)), JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);\n" +
  "})()",
));

assert.equal(result.ok, true, stderr.trim() || 'The conversion bridge failed.');

const markdown = Buffer.from(result.markdown, 'base64').toString('utf8');
assert.match(markdown, /^# PHP WASM/m);
assert.match(markdown, /你好 \*\*turndown-php\*\*/);
assert.match(markdown, /- {3}local conversion/);
assert.match(markdown, /\| Name\s+\| Value\s+\|/);
assert.match(markdown, /\| runtime\s+\| PHP 8\.4\s+\|/);

console.log(
  'PHP WASM smoke test passed: ' +
  capabilities.php +
  ', DOM/libxml/mbstring, core conversion, and GFM tables.',
);
