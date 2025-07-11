# 萬能鋼琴演奏 (Interactive Piano Studio)

[![GitHub Pages Deploy](https://github.com/hsuchen1/piano/actions/workflows/deploy.yml/badge.svg)](https://github.com/hsuchen1/piano/actions/workflows/deploy.yml)

**線上演示:** [https://hsuchen1.github.io/piano/](https://hsuchen1.github.io/piano/)

一款功能豐富的網頁應用程式，讓您可以彈奏虛擬鋼琴、實驗移調功能，並創建和播放帶有多種樂器聲音、節奏模式及詳細控制選項的和弦、鼓組與貝斯伴奏。本應用程式亦為漸進式網頁應用程式 (PWA)，支援離線使用並可安裝至主畫面。

<!-- 建議：在此處插入應用程式的螢幕截圖或 GIF 動畫 -->
<!-- <img src="link_to_your_screenshot.png" alt="應用程式截圖" width="600"/> -->

## ✨ 主要功能

*   🎹 **虛擬鋼琴鍵盤：**
    *   支援滑鼠點擊、觸控螢幕及電腦鍵盤輸入。
    *   視覺化顯示按下的琴鍵。
    *   可調整主鋼琴音量。
*   🎼 **移調控制：** 輕鬆對主鋼琴的音高進行半音升降調整。
*   🔊 **多種主鋼琴音色：** 提供多種鋼琴音色選擇，包括古典平台鋼琴、真實取樣平台鋼琴、明亮直立鋼琴、電鋼琴及基本合成器音色。音色載入時會顯示提示。
*   🎶 **和弦進程編輯器：**
    *   輕鬆添加、移除、清除及重新排序和弦。
    *   支援多種和弦類型 (Major, minor, 7th, m7, Maj7, dim7, m7b5)。
*   🎸 **和弦樂器伴奏：**
    *   獨立控制伴奏音量。
    *   多種伴奏樂器音色可選 (如鋼琴、合成器、吉他等)。
    *   多種預設節奏型態 (每小節一次、每兩拍一次、每拍一次等)。
    *   支援**自訂節奏編輯器**：可為進行中的每個和弦的每一拍獨立設定音符時值 (全音符、二分音符、四分音符、八分音符、十六分音符或關閉)。
*   🥁 **鼓機伴奏：**
    *   可獨立啟用或停用鼓組。
    *   獨立控制鼓組音量。
    *   提供多種預設鼓點風格 (如搖滾、流行/放克、爵士、拉丁、EDM)。
    *   支援強大的**自訂鼓點編輯器**：
        *   為和弦進行中的每個和弦獨立編輯鼓點。
        *   可分別為多種鼓樂器 (大鼓、小鼓、閉合鈸、筒鼓、碎音鈸) 的每一拍 (共4拍) 中的每個細分音符 (共4個細分) 設定是否啟用。
*   🎻 **貝斯伴奏：**
    *   可獨立啟用或停用貝斯。
    *   獨立控制貝斯音量。
    *   多種貝斯樂器音色可選 (如電貝斯、合成貝斯、木貝斯)。
    *   提供多種預設貝斯線風格 (如根音、根音與五音、簡單琶音、簡易行走貝斯)。
*   ⚙️ **總體伴奏控制：**
    *   可調整整體伴奏的 BPM (每分鐘節拍數)。
    *   播放/停止伴奏控制。
    *   音訊引擎狀態提示 (如未就緒、和弦進行空白等)。
*   💾 **儲存與載入：**
    *   將包含所有設定 (和弦進行、自訂節奏、鼓組設定、貝斯設定、音量、音色等) 的完整編曲儲存到瀏覽器本機。
    *   可為儲存的編曲命名。
    *   隨時載入或刪除已儲存的編曲。
*   📱 **響應式設計：** 界面自動適應桌面、平板和行動裝置螢幕尺寸。
*    PWA **漸進式網頁應用程式：**
    *   可添加至裝置主畫面，提供類似原生應用的體驗。
    *   支援離線使用 (需先載入一次)。
    *   自動更新 Service Worker。

## 🛠️ 技術棧

*   **前端框架：** [React](https://reactjs.org/) (`react`, `react-dom`)
*   **建置工具：** [Vite](https://vitejs.dev/)
*   **程式語言：** [TypeScript](https://www.typescriptlang.org/)
*   **音訊處理與排程：** [Tone.js](https://tonejs.github.io/)
*   **樣式：** [Tailwind CSS](https://tailwindcss.com/) (透過 CDN 引入)
*   **PWA 功能：** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)

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
    (或使用 `npm ci` 進行更嚴格的安裝，或對應的 yarn/pnpm 指令：`yarn install --frozen-lockfile` / `pnpm install --frozen-lockfile`)

### 在本機執行 (開發模式)

```bash
npm run dev
```
這將啟動 Vite 開發伺服器。應用程式通常可以在 `http://localhost:5173` (或 Vite 在終端機提示的其他埠號) 找到。

### 建置生產版本

```bash
npm run build
```
編譯後的靜態檔案將會輸出到 `dist` 目錄。

### 預覽生產版本

```bash
npm run preview
```
這會在本地啟動一個伺服器來預覽 `dist` 目錄中的生產版本。

## ⌨️ 鍵盤控制

您可以使用電腦鍵盤來彈奏鋼琴音符。按鍵配置旨在模擬真實鋼琴的佈局。詳細的按鍵對應可以在程式碼中的 `src/constants.ts` 檔案內的 `KEY_MAPPING` 變數找到。輸入焦點在輸入框或下拉選單時，鍵盤彈奏會暫時停用。

## ☁️ 部署

此專案已設定好透過 GitHub Actions 自動部署到 GitHub Pages。相關的部署流程設定位於 `.github/workflows/deploy.yml`。
每次推送到 `main` 分支後，成功的部署將會更新 [線上演示](https://hsuchen1.github.io/piano/)。

## 🧑‍💻 作者

*   **hsuchen**

## 📄 授權條款

<!-- 建議：添加一個授權條款，例如 MIT License -->
本專案目前未設定明確的授權條款。如果您希望使用、修改或分發此專案，建議您聯繫作者，或在您自行 fork 的版本中添加一個您選擇的開源授權（例如 MIT License）。

---

希望這個 README 對您有所幫助！
如果您有任何建議、發現任何問題，或希望貢獻，請隨時提出 Issue 或 Pull Request。
