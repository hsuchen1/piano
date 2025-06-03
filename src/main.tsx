
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// 如果您有全域 CSS (除了 Tailwind CDN 和 index.html 中的 <style>)，可以在這裡引入
// import './index.css'; 

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("CRITICAL: Could not find root element to mount to. HTML structure issue?");
  document.body.innerHTML = `
    <div style="color: #f3f4f6; background-color: #1f2937; padding: 20px; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <h1>應用程式啟動錯誤 (Application Startup Error)</h1>
      <p>無法找到用於掛載應用程式的根元素 (Could not find root element to mount to).</p>
      <p>請檢查 HTML 結構 (Please check the HTML structure).</p>
    </div>`;
  throw new Error("Could not find root element to mount to");
}

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (e) {
  console.error("CRITICAL: Error during React rendering in main.tsx:", e);
  rootElement.innerHTML = `
    <div style="color: #f3f4f6; background-color: #1f2937; padding: 20px; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
      <h1 style="color: #ef4444; font-size: 1.5rem; margin-bottom: 1rem;">應用程式啟動時發生嚴重錯誤</h1>
      <h2 style="color: #f87171; font-size: 1.2rem; margin-bottom: 0.5rem;">(A critical error occurred and the application could not start)</h2>
      <p style="margin-bottom: 1rem;">請開啟瀏覽器的開發者控制台 (通常按 F12)，查看 "Console" 分頁獲取詳細錯誤資訊。</p>
      <p style="margin-bottom: 1rem;">(Please check the browser console (usually F12) for more details in the "Console" tab.)</p>
      ${e instanceof Error ? `<pre style="background-color: #374151; padding: 10px; border-radius: 5px; max-width: 80%; overflow-wrap: break-word; white-space: pre-wrap; text-align: left;">${e.name}: ${e.message}\n${e.stack}</pre>` : ''}
    </div>
  `;
}
