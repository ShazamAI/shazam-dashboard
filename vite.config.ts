import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { mockApiPlugin } from './src/dev/mockApi';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

const monacoPlugin = (monacoEditorPlugin as any).default || monacoEditorPlugin;

export default defineConfig({
  plugins: [
    vue(),
    // mockApiPlugin(), // Disabled — use real daemon backend
    monacoPlugin({
      languageWorkers: ['editorWorkerService', 'typescript', 'json', 'css', 'html'],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4040',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:4040',
        ws: true,
      },
    },
  },
});
