import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { mockApiPlugin } from './src/dev/mockApi';

export default defineConfig({
  plugins: [
    vue(),
    mockApiPlugin(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
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
