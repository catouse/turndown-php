declare module 'php-wasm/php8.4-web.mjs' {
  const runtimeFactory: new (args: object) => object;
  export default runtimeFactory;
}

declare module 'php-wasm-dom/8.4.mjs' {
  import type { PhpSharedLibrary } from 'php-wasm/PhpBase';
  export function getLibs(): PhpSharedLibrary[];
}

declare module 'php-wasm-mbstring/8.4.mjs' {
  import type { PhpSharedLibrary } from 'php-wasm/PhpBase';
  export function getLibs(): PhpSharedLibrary[];
}

declare module 'php-wasm-xml/8.4.mjs' {
  import type { PhpSharedLibrary } from 'php-wasm/PhpBase';
  export function getLibs(): PhpSharedLibrary[];
}
