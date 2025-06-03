
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// --- VERY IMPORTANT ---
// ----  用戶請務必填寫以下兩個變數！ ----
// ----  USER: YOU MUST FILL IN THESE TWO VARIABLES! ----
// 
// 您的 GitHub 使用者名稱 (Your GitHub Username)
// 例如：const githubUsername = 'your-github-name';
const githubUsername = '<hsuchen1>'; // <-- 請替換成您的 GitHub 使用者名稱

// 您的 GitHub 儲存庫名稱 (Your GitHub Repository Name)
// 這必須與您在 GitHub 上建立的儲存庫名稱完全一致
// 例如：const repositoryName = 'my-interactive-piano';
const repositoryName = '<piano>'; // <-- 請替換成您的 GitHub 儲存庫名稱
// --- END OF IMPORTANT USER INPUT ---

// 檢查用戶是否已填寫佔位符
if (githubUsername === '<YOUR_GITHUB_USERNAME>' || repositoryName === '<YOUR_REPOSITORY_NAME>') {
  console.warn(
    '\n\n⚠️  警告：請務必在 `vite.config.ts` 中填寫您的 `githubUsername` 和 `repositoryName`！\n' +
    '⚠️  WARNING: Please fill in your `githubUsername` and `repositoryName` in `vite.config.ts`!\n\n'
  );
}

// 設定基礎路徑。對於 GitHub Pages，它通常是 /<儲存庫名稱>/
// 在開發模式下，基礎路徑是 '/'
const base = process.env.NODE_ENV === 'production' && repositoryName !== '<YOUR_REPOSITORY_NAME>' 
             ? `/${repositoryName}/` 
             : '/';

export default defineConfig({
  base: base,
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
      // Workbox 選項可以進一步自訂快取策略
      // 預設的 `generateSW` 策略通常能很好地處理常見資源的快取
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'], // 確保快取所有必要的靜態資源
        // 如果您的採樣音訊檔案 (如鋼琴音源) 也想透過 Service Worker 快取 (可能會很大)
        // 您可以在這裡加入它們的路徑，或者使用 runtimeCaching
        // runtimeCaching: [
        //   {
        //     urlPattern: /^https:\/\/tonejs\.github\.io\/audio\/salamander\/.*/i,
        //     handler: 'CacheFirst',
        //     options: {
        //       cacheName: 'salamander-piano-samples',
        //       expiration: {
        //         maxEntries: 50, // 最多快取 50 個音訊檔案
        //         maxAgeSeconds: 60 * 60 * 24 * 30 // 快取 30 天
        //       },
        //       cacheableResponse: {
        //         statuses: [0, 200]
        //       }
        //     }
        //   }
        // ]
      }
    }),
  ],
  // 如果您將來需要使用環境變數 (例如 API 金鑰)
  // 並希望在 GitHub Actions 中設定 Secret (例如 VITE_GEMINI_API_KEY)
  // 可以在這裡定義，使其在程式碼中可用 (import.meta.env.VITE_GEMINI_API_KEY)
  // define: {
  //   'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(process.env.VITE_GEMINI_API_KEY)
  // }
});
