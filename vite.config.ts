
import { fileURLToPath, URL } from 'node:url';
// defineConfig comes from vitest/config (not vite) so the `test` block below is typed.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// --- GitHub Pages 設定 ---
// 部署位置為 https://hsuchen1.github.io/piano/，因此 base 必須是 /piano/。
// 您的 GitHub 儲存庫名稱
const repositoryName = 'piano';
// --- END ---

// 設定基礎路徑。對於 GitHub Pages，它通常是 /<儲存庫名稱>/
// 在開發模式下，基礎路徑是 '/'
const base = process.env.NODE_ENV === 'production' ? `/${repositoryName}/` : '/';

export default defineConfig({
  base: base,
  build: {
    rollupOptions: {
      output: {
        // Split the two heavyweight dependencies out of the app chunk. They change
        // far less often than application code, so a browser that has visited
        // before keeps them cached across deploys instead of re-downloading
        // everything because one component changed.
        manualChunks: {
          react: ['react', 'react-dom'],
          tone: ['tone'],
        },
      },
    },
  },
  test: {
    // Default to node because most tests are pure functions. Files that need a
    // DOM (localStorage) opt in with a `@vitest-environment jsdom` docblock;
    // spinning jsdom up costs ~35s, so it is not worth paying globally.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  // Keep the `@/*` alias in tsconfig.json working at build time too, so TypeScript
  // and Vite resolve it identically.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // 自動更新 Service Worker
      injectRegister: 'auto',    // 自動注入註冊 Service Worker 的腳本
      devOptions: {
        enabled: true, // 在開發模式下也啟用 PWA 功能 (方便測試)
        type: 'module',
      },
      manifest: {
        name: '互動鋼琴工作室 by hsuchen',
        short_name: '鋼琴工作室',
        description: '自由彈奏、移調，並創造您的和弦伴奏。由 hsuchen 開發。',
        theme_color: '#3b82f6',      // 藍色 (建議與您的品牌色一致)
        background_color: '#1f2937', // 深灰色 (與您的 body 背景色一致)
        display: 'standalone',       // PWA 以獨立視窗模式啟動
        scope: base,                 // PWA 的作用域，應與 base 路徑一致
        start_url: base,             // PWA 的啟動 URL，應與 base 路徑一致
        icons: [
          {
            src: `${base.endsWith('/') ? base : base + '/'}icons/icon-192x192.png`, // 路徑包含 base
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable', // maskable 允許圖示在不同形狀的遮罩下良好顯示
          },
          {
            src: `${base.endsWith('/') ? base : base + '/'}icons/icon-512x512.png`, // 路徑包含 base
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'], 
      }
    }),
  ],
});