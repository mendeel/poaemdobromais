import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { ogIndex } from './src/lib/og.js';

const CUPOMS_FILE = fileURLToPath(new URL('./data/all_cupoms.json', import.meta.url));
const OG_MODULE = 'virtual:og-index';

// Bundles a trimmed { id: { nome, description, image } } map into the Worker
// for link previews. Every data commit triggers a new build, so it stays fresh.
function ogIndexPlugin() {
  return {
    name: 'og-index',
    resolveId(id) {
      if (id === OG_MODULE) return '\0' + OG_MODULE;
    },
    load(id) {
      if (id !== '\0' + OG_MODULE) return;
      this.addWatchFile(CUPOMS_FILE);
      const index = ogIndex(JSON.parse(readFileSync(CUPOMS_FILE, 'utf8')));
      return `export default ${JSON.stringify(index)};`;
    },
  };
}

export default defineConfig({
  // cloudflare(): runs worker/index.js (ratings API + link previews) with a
  // local D1 during `vite dev`, and builds it next to the client for
  // `wrangler deploy`.
  plugins: [react(), tailwindcss(), ogIndexPlugin(), cloudflare()],
  server: {
    allowedHosts: ['regainable-unavailably-steven.ngrok-free.dev'],
  },
  preview: {
    allowedHosts: ['regainable-unavailably-steven.ngrok-free.dev'],
  },
});
