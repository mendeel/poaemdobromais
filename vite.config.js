import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['regainable-unavailably-steven.ngrok-free.dev'],
  },
  preview: {
    allowedHosts: ['regainable-unavailably-steven.ngrok-free.dev'],
  },
});
