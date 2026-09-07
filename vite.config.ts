import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Extension content scripts must be standalone classic scripts. Bundle React
  // locally and resolve its environment check without a Node.js process global.
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    target: 'es2022',
    sourcemap: true,
    lib: {
      entry: 'src/content/index.ts',
      name: 'YouTubeSubscriptionGroups',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
  },
});
