import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const pagesBasePath = process.env.PAGES_BASE_PATH ?? '/turndown-php/';

export default defineConfig({
  base: pagesBasePath,
  assetsInclude: [/\.wasm$/, /\.so$/],
  css: { postcss: { plugins: [tailwindcss()] } },
  optimizeDeps: {
    exclude: [
      'php-wasm',
      'php-wasm-dom',
      'php-wasm-libxml',
      'php-wasm-mbstring',
      'php-wasm-xml',
    ],
  },
  plugins: [react()],
  publicDir: 'public',
  worker: { format: 'es' as const },
  build: {
    outDir: 'pages-dist',
    emptyOutDir: true,
  },
});
