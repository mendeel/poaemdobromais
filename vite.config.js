import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  // cloudflare(): runs worker/index.js (the ratings API) with a local D1
  // during `vite dev`, and builds it next to the client for `wrangler deploy`.
  plugins: [react(), tailwindcss(), cloudflare()],
  server: {
    allowedHosts: ['regainable-unavailably-steven.ngrok-free.dev'],
  },
  preview: {
    allowedHosts: ['regainable-unavailably-steven.ngrok-free.dev'],
  },
});
