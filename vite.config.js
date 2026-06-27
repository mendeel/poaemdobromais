import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  server: {
    allowedHosts: ['regainable-unavailably-steven.ngrok-free.dev'],
  },
  preview: {
    allowedHosts: ['regainable-unavailably-steven.ngrok-free.dev'],
  },
});