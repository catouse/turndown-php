import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../app/runtime-startup.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function setup(idle = true) {
  const callbacks = new Map();
  const window = new EventTarget();
  const state = { starts: 0, stops: 0 };
  let handle = 0;
  window.setTimeout = (callback) => { callbacks.set(++handle, callback); return handle; };
  window.clearTimeout = (id) => callbacks.delete(id);
  if (idle) {
    window.requestIdleCallback = window.setTimeout;
    window.cancelIdleCallback = window.clearTimeout;
  }
  const exports = {};
  runInNewContext(outputText, { exports, window });
  const cancel = exports.deferRuntimeStartup(() => {
    state.starts++;
    return () => { state.stops++; };
  });
  const flush = () => { for (const callback of [...callbacks.values()]) callback(); };
  assert.equal(state.starts, 0, 'The runtime must not start during initial setup.');
  return { callbacks, window, state, cancel, flush };
}

for (const idle of [true, false]) {
  const run = setup(idle);
  run.flush();
  assert.equal(run.state.starts, 1);
  run.cancel();
  run.cancel();
  assert.equal(run.state.stops, 1);

  const cancelled = setup(idle);
  cancelled.cancel();
  cancelled.flush();
  cancelled.window.dispatchEvent(new Event('input'));
  assert.equal(cancelled.state.starts, 0);
  assert.equal(cancelled.callbacks.size, 0);
}

for (const event of ['pointerdown', 'keydown', 'input']) {
  const run = setup();
  run.window.dispatchEvent(new Event(event));
  run.window.dispatchEvent(new Event(event));
  run.flush();
  assert.equal(run.state.starts, 1, 'Interaction must start the runtime exactly once.');
  assert.equal(run.callbacks.size, 0);
  run.cancel();
  assert.equal(run.state.stops, 1);
}

console.log('Runtime startup checks passed: idle, timer fallback, interaction, and cleanup.');
