/// <reference lib="webworker" />

import {
  PhpBase,
  type PhpBaseModuleFactory,
  type PhpSharedLibrary,
} from 'php-wasm/PhpBase';
import * as dom84 from 'php-wasm-dom/8.4.mjs';
import * as libxml from 'php-wasm-libxml';
import * as mbstring84 from 'php-wasm-mbstring/8.4.mjs';
import * as xml84 from 'php-wasm-xml/8.4.mjs';
import { phpRuntimeBuild, phpRuntimeFiles } from '../app/php-files.generated';

type ConversionOptionValue = string | boolean;

type WorkerRequest =
  | { type: 'initialize' }
  | {
      type: 'convert';
      requestId: number;
      html: string;
      options: Record<string, ConversionOptionValue>;
      gfmEnabled: boolean;
    };

type WorkerResponse =
  | {
      type: 'status';
      status: 'loading' | 'ready';
      message: string;
      phpVersion?: string;
    }
  | {
      type: 'result';
      requestId: number;
      markdown: string;
    }
  | {
      type: 'conversion-error';
      requestId: number;
      error: string;
    }
  | {
      type: 'fatal-error';
      error: string;
    };

type RuntimeCapabilities = {
  php: string;
  dom: boolean;
  libxml: boolean;
  mbstring: boolean;
  turndown: boolean;
};

type BridgeResult =
  | { ok: true; markdown: string }
  | { ok: false; error: string };

class RuntimeStartupError extends Error {}

const workerScope = self as unknown as DedicatedWorkerGlobalScope;
let runtimePromise: Promise<PhpBase> | null = null;

function post(message: WorkerResponse) {
  workerScope.postMessage(message);
}

function installPhpWasmWorkerGlobals() {
  const globals = globalThis as unknown as Record<string, unknown>;

  // php-wasm's web binary is also advertised for Worker use, but its
  // Emscripten glue initializes a few DOM target constants at module load.
  // The converter never uses those UI APIs; these inert targets let the web
  // binary initialize without moving the PHP runtime onto the main thread.
  globals.window ??= globalThis;
  globals.document ??= {
    body: null,
    currentScript: null,
    documentElement: { style: {} },
    getElementById: () => null,
    querySelector: () => null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'The PHP runtime could not start.';
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function decodeBase64Text(value: string): string {
  return new TextDecoder().decode(base64ToBytes(value));
}

function collectDirectories(paths: readonly string[]): string[] {
  const directories = new Set<string>();

  for (const path of paths) {
    const segments = path.split('/').filter(Boolean);
    segments.pop();

    let directory = '';
    for (const segment of segments) {
      directory += `/${segment}`;
      directories.add(directory);
    }
  }

  return [...directories].sort((left, right) => {
    const depthDifference = left.split('/').length - right.split('/').length;
    return depthDifference || left.localeCompare(right);
  });
}

function parseJsonResult<T>(value: unknown, context: string): T {
  if (typeof value !== 'string') {
    throw new Error(`${context} returned an unexpected value.`);
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${context} returned invalid JSON.`);
  }
}

async function createRuntime(): Promise<PhpBase> {
  post({
    type: 'status',
    status: 'loading',
    message: 'Loading PHP 8.4 and its HTML extensions…',
  });

  installPhpWasmWorkerGlobals();
  const { default: php84Runtime } = await import('php-wasm/php8.4-web.mjs');

  let startupError = '';
  const sharedLibs = [libxml, xml84, dom84, mbstring84] as unknown as PhpSharedLibrary[];
  const moduleFactory = { default: php84Runtime } as unknown as PhpBaseModuleFactory;
  const runtime = new PhpBase(Promise.resolve(moduleFactory), {
    version: '8.4',
    sharedLibs,
    ini: `
display_errors=0
display_startup_errors=0
html_errors=0
log_errors=0
memory_limit=256M
`,
  });

  runtime.addEventListener('error', (event) => {
    const detail = (event as CustomEvent<string[]>).detail;
    startupError += Array.isArray(detail) ? detail.join('') : '';
  });

  await runtime.binary;

  for (const directory of collectDirectories(phpRuntimeFiles.map(({ path }) => path))) {
    await runtime.mkdir(directory);
  }

  for (const file of phpRuntimeFiles) {
    await runtime.writeFile(file.path, base64ToBytes(file.base64));
  }

  const capabilityValue = await runtime.exec(String.raw`
(static function (): string {
require_once '/app/bootstrap.php';
return json_encode([
    'php' => PHP_VERSION,
    'dom' => class_exists('DOMDocument'),
    'libxml' => extension_loaded('libxml'),
    'mbstring' => extension_loaded('mbstring'),
    'turndown' => class_exists('Catouse\\Turndown\\TurndownService'),
], JSON_THROW_ON_ERROR);
})()
`);
  const capabilities = parseJsonResult<RuntimeCapabilities>(capabilityValue, 'PHP startup');

  if (!capabilities.dom || !capabilities.libxml || !capabilities.mbstring || !capabilities.turndown) {
    throw new Error(startupError.trim() || 'PHP started without the required HTML extensions.');
  }

  post({
    type: 'status',
    status: 'ready',
    message: `turndown-php is running locally · ${phpRuntimeBuild.fileCount} PHP files`,
    phpVersion: capabilities.php,
  });

  return runtime;
}

function ensureRuntime(): Promise<PhpBase> {
  if (!runtimePromise) {
    runtimePromise = createRuntime().catch((error) => {
      runtimePromise = null;
      const startupError = new RuntimeStartupError(describeError(error));
      post({ type: 'fatal-error', error: startupError.message });
      throw startupError;
    });
  }

  return runtimePromise;
}

async function convert(request: Extract<WorkerRequest, { type: 'convert' }>) {
  try {
    const runtime = await ensureRuntime();
    const payload = JSON.stringify({
      html: request.html,
      options: request.options,
      gfm: request.gfmEnabled,
    });
    const encodedPayload = bytesToBase64(new TextEncoder().encode(payload));
    const value = await runtime.exec(`
(static function (): string {
require_once '/app/bridge.php';
return json_encode(
    turndown_wasm_convert(base64_decode('${encodedPayload}', true)),
    JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES
);
})()
`);
    const result = parseJsonResult<BridgeResult>(value, 'turndown-php');

    if (!result.ok) {
      post({
        type: 'conversion-error',
        requestId: request.requestId,
        error: decodeBase64Text(result.error),
      });
      return;
    }

    post({
      type: 'result',
      requestId: request.requestId,
      markdown: decodeBase64Text(result.markdown),
    });
  } catch (error) {
    if (error instanceof RuntimeStartupError) return;

    post({
      type: 'conversion-error',
      requestId: request.requestId,
      error: describeError(error),
    });
  }
}

workerScope.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type === 'initialize') {
    void ensureRuntime().catch(() => undefined);
    return;
  }

  void convert(event.data);
});
