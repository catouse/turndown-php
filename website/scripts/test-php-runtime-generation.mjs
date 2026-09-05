import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directory = await mkdtemp(join(tmpdir(), 'turndown-runtime-generation-'));

try {
  const scripts = join(directory, 'website/scripts');
  const app = join(directory, 'website/app');
  await mkdir(scripts, { recursive: true });
  await mkdir(app, { recursive: true });
  const generator = join(scripts, 'generate-php-runtime.mjs');
  const bundle = join(app, 'php-files.generated.ts');
  await copyFile(new URL('./generate-php-runtime.mjs', import.meta.url), generator);
  await writeFile(bundle, 'committed runtime snapshot');

  const fallback = spawnSync(process.execPath, [generator], {
    encoding: 'utf8',
    env: { ...process.env, TURNDOWN_REQUIRE_SOURCES: '0' },
  });
  assert.equal(fallback.status, 0, fallback.stderr);
  assert.match(fallback.stdout, /Using the committed PHP runtime bundle/);

  const required = spawnSync(process.execPath, [generator], {
    encoding: 'utf8',
    env: { ...process.env, TURNDOWN_REQUIRE_SOURCES: '1' },
  });
  assert.equal(required.status, 1);
  assert.match(required.stderr, /PHP sources and Composer dependencies are required/);
  assert.equal(await readFile(bundle, 'utf8'), 'committed runtime snapshot');

  console.log('Runtime generation checks passed: standalone fallback and required CI sources.');
} finally {
  await rm(directory, { recursive: true, force: true });
}
