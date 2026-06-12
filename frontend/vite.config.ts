import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'rename-mjs-to-js',
      closeBundle() {
        const fs = require('fs');
        const distDir = path.resolve(__dirname, 'dist/assets');
        if (!fs.existsSync(distDir)) return;
        const files = fs.readdirSync(distDir);
        for (const file of files) {
          if (file.endsWith('.mjs')) {
            const oldPath = path.join(distDir, file);
            const newFile = file.replace('.mjs', '.js');
            const newPath = path.join(distDir, newFile);
            fs.renameSync(oldPath, newPath);
            const indexPath = path.resolve(__dirname, 'dist/index.html');
            let indexHtml = fs.readFileSync(indexPath, 'utf8');
            indexHtml = indexHtml.replaceAll(file, newFile);
            fs.writeFileSync(indexPath, indexHtml);
            const jsFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.js'));
            for (const jsFile of jsFiles) {
              const jsPath = path.join(distDir, jsFile);
              let content = fs.readFileSync(jsPath, 'utf8');
              if (content.includes(file)) {
                content = content.replaceAll(file, newFile);
                fs.writeFileSync(jsPath, content);
              }
            }
          }
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        timeout: 120000,
      },
      '/pdfs': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        timeout: 120000,
      },
    },
  },
});