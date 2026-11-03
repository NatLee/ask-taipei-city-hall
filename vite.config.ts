import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { contentSecurityPolicy } from './src/config/csp.ts';

/**
 * GitHub Pages serves a project site under /<repo-name>/. The Pages workflow
 * passes that prefix in BASE_PATH (from actions/configure-pages), so the repo
 * name is never written here. Locally the app runs at /.
 */
function basePath(raw: string | undefined): string {
  const trimmed = (raw ?? '').replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

/**
 * Production pages get a Content-Security-Policy that only lets the page talk
 * to itself and the Anthropic API, so a visitor's API key cannot be sent
 * anywhere else. The dev server is left alone because Vite's hot reload
 * injects inline scripts.
 */
function cspMetaTag(): Plugin {
  return {
    name: 'csp-meta-tag',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy() },
        injectTo: 'head-prepend',
      },
    ],
  };
}

export default defineConfig({
  base: basePath(process.env.BASE_PATH),
  plugins: [react(), tailwindcss(), cspMetaTag()],
  worker: { format: 'es' },
  test: {
    environment: 'happy-dom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
  },
});
