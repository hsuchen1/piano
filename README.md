# 萬能鋼琴演奏 (Interactive Piano Studio)

[![GitHub Pages Deploy](https://github.com/hsuchen1/piano/actions/workflows/deploy.yml/badge.svg)](https://github.com/hsuchen1/piano/actions/workflows/deploy.yml)

**線上演示:** [https://hsuchen1.github.io/piano/](https://hsuchen1.github.io/piano/)

一款網頁應用程式，讓您可以彈奏虛擬鋼琴、實驗移調功能，並創建和播放帶有多種樂器聲音及控制選項的和弦伴奏。它還包括鼓組和貝斯伴奏，並且是一個漸進式網頁應用程式 (PWA)，支援離線使用。

<!-- 建議：在此處插入螢幕截圖或 GIF 動畫 -->
<!-- <img src="link_to_your_screenshot.png" alt="應用程式截圖" width="600"/> -->

## ✨ 主要功能

*   🎹 **虛擬鋼琴鍵盤：** 可透過滑鼠、觸控螢幕或電腦鍵盤彈奏。
*   🎼 **移調控制：** 輕鬆調整鋼琴的音高。
*   🔊 **多種鋼琴音色：** 可選擇不同的鋼琴聲音。
*   🎶 **和弦進程編輯器：** 創建、編輯和管理您的和弦進行。
*   🎸 **自動和弦伴奏：**
    *   可調整的 BPM (每分鐘節拍數)、整體音量和樂器音色。
    *   提供預設伴奏模式，並支援自訂每個和弦的節奏。
*   🥁 **鼓機：**
    *   可啟用或停用鼓聲。
    *   獨立的音量控制。
    *   提供多種預設鼓點模式，並支援強大的**自訂鼓點編輯器**，可為每個和弦的每一拍的每個細分音符獨立設定不同鼓樂器 (大鼓、小鼓、腳踏鈸、開鈸)。
*   🎻 **貝斯伴奏：**
    *   可啟用或停用貝斯。
    *   獨立的音量控制。
    *   提供多種預設貝斯線型態和貝斯音色。
*   💾 **儲存與載入：** 將您的和弦進程、自訂節奏、鼓點設定和貝斯設定儲存在瀏覽器本機，隨時載入。
*   📱 **響應式設計：** 完美適應桌面、平板和行動裝置。
*   ⚙️ **漸進式網頁應用程式 (PWA)：** 可安裝到您的裝置主畫面，支援離線使用，提供更接近原生應用程式的體驗。

## 🛠️ 技術棧

*   **前端框架：** [React](https://reactjs.org/)
*   **建置工具：** [Vite](https://vitejs.dev/)
*   **程式語言：** [TypeScript](https://www.typescriptlang.org/)
*   **音訊處理：** [Tone.js](https://tonejs.github.io/)
*   **樣式：** [Tailwind CSS](https://tailwindcss.com/) (透過 CDN 引入)
*   **PWA：** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)

## 🚀 開始使用

### 先決條件

*   [Node.js](https://nodejs.org/) (建議使用 LTS 版本，例如 v18 或更高版本)
*   [npm](https://www.npmjs.com/) (通常隨 Node.js 一併安裝) 或 [yarn](https://yarnpkg.com/) / [pnpm](https://pnpm.io/)

### 安裝

1.  複製此儲存庫：
    ```bash
    git clone https://github.com/hsuchen1/piano.git
    ```
2.  進入專案目錄：
    ```bash
    cd piano
    ```
3.  安裝依賴套件：
    ```bash
    npm install
    ```
    (或者，如果您使用 yarn: `yarn install --frozen-lockfile` 或 pnpm: `pnpm install --frozen-lockfile`)

### 在本機執行 (開發模式)

```bash
npm run dev
```
這將啟動 Vite 開發伺服器，您通常可以在 `http://localhost:5173` (或 Vite 提示的其他埠號) 存取應用程式。

### 建置生產版本

```bash
npm run build
```
編譯後的檔案將會輸出到 `dist` 目錄。

### 預覽生產版本

```bash
npm run preview
```
這會在本地啟動一個伺服器來預覽 `dist` 目錄中的生產版本。

## ⌨️ 鍵盤控制

您可以使用電腦鍵盤來彈奏鋼琴音符。按鍵配置旨在模擬真實鋼琴的佈局 (例如 'a', 's', 'd', 'f', ... 對應白鍵，'w', 'e', 't', 'y', ... 對應黑鍵)。詳細的按鍵對應可以在程式碼中的 `src/constants.ts` 檔案內的 `KEY_MAPPING` 變數找到。

## ☁️ 部署

此專案透過 GitHub Actions 自動部署到 GitHub Pages。相關的部署流程設定位於 `.github/workflows/deploy.yml`。
成功的部署將更新 [線上演示](https://hsuchen1.github.io/piano/)。

## 🧑‍💻 作者

*   **hsuchen**

## 📄 授權條款

<!-- 建議：添加一個授權條款，例如 MIT -->
本專案目前未設定明確的授權條款。如果您希望使用或修改此專案，建議您聯繫作者，或在您 fork 的版本中添加一個您選擇的開源授權（例如 MIT License）。

---

希望這個 README 對您有所幫助！
如果您有任何建議或發現任何問題，請隨時提出 Issue。
