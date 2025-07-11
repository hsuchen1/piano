# 萬能鋼琴演奏 (Interactive Piano Studio)

[![GitHub Pages Deploy](https://github.com/hsuchen1/piano/actions/workflows/deploy.yml/badge.svg)](https://github.com/hsuchen1/piano/actions/workflows/deploy.yml)

**線上演示:** [https://hsuchen1.github.io/piano/](https://hsuchen1.github.io/piano/)

歡迎來到互動鋼琴工作室！這是一款功能強大的網頁工具，讓您不只能彈奏鋼琴，還能創造出豐富的背景伴奏，並透過多種效果精雕細琢您的音樂。本應用程式亦為漸進式網頁應用程式 (PWA)，支援離線使用並可安裝至主畫面。

<!-- 建議：在此處插入應用程式的螢幕截圖或 GIF 動畫 -->
<!-- <img src="link_to_your_screenshot.png" alt="應用程式截圖" width="600"/> -->

## ✨ 主要功能

### 1. 彈奏虛擬鋼琴
*   **多種輸入方式：**
    *   **滑鼠/觸控：** 直接點擊或觸碰螢幕上的琴鍵即可發聲。
    *   **電腦鍵盤：**
        *   中下排 (Z, S, X, D...) 對應一個八度。
        *   中上排 (Q, 2, W, 3...) 對應高一個八度。
        *   (註：詳細的預設按鍵對應可在 `src/constants.ts` 的 `KEY_MAPPING` 變數中找到。)
*   **視覺化回饋：** 按下的琴鍵會高亮顯示。

### 2. 核心設定
*   **移調控制：** 使用 `+` 和 `-` 按鈕來即時升高或降低所有琴鍵的音高。讓您能輕鬆地用 C 調的指法彈奏任何調性的音樂。
*   **主鍵盤設定：**
    *   **音色 (Instrument)：** 從下拉選單中選擇您喜歡的鋼琴或合成器音色（如古典平台鋼琴、真實平台鋼琴、明亮直立鋼琴、電鋼琴、基本合成器）。部分音色（如真實平台鋼琴）在首次選擇時可能需要短暫的載入時間。
    *   **音量 (Volume)：** 調整您手動彈奏的琴鍵音量。
    *   **顯示伴奏音符：** (此功能待確認是否存在於當前程式碼中) 開啟後，伴奏所彈奏的音符會在琴鍵上以藍色顯示。

### 3. 建立您的和弦進行
這是創造伴奏的核心步驟。
*   **新增和弦：** 在「新增和弦至進行」面板中選擇根音 (Root) 與和弦類型 (Type) (如 Major, minor, 7th, m7, Maj7, dim7, m7b5)，然後點擊「新增和弦」。
*   **編輯和弦進行：**
    *   **刪除 (Delete)：** 點擊和弦右側的紅色 `X` 按鈕。
    *   **轉位 (Inversion)：** (此功能待確認是否存在於當前程式碼中，教學文件提及，但先前程式碼掃描未明確發現) 點擊和弦旁的 `0, 1, 2` 按鈕來切換和弦轉位。
    *   **重新排序 (Reorder)：** 按住和弦並拖曳到新的位置即可改變順序。
    *   **清除 (Clear)：** 一次清除所有和弦。
*   **儲存與載入 (Saved Progressions)：**
    *   **儲存目前進行 (Save Current)：** 點擊「儲存」按鈕，為您當前的和弦進行（包含所有樂器、節奏、音量、效果等設定）命名並保存至瀏覽器本機。
    *   **載入已存進行 (Load)：** 在「已儲存的和弦進行」面板中，選擇已儲存的項目並點擊「載入」以還原。
    *   **刪除已存進行 (Delete)：** 移除已儲存的項目。

### 4. 設計您的伴奏 (Accompaniment Controls)
伴奏控制面板讓您精雕細琢您的音樂，主要包含以下控制項及分頁：

*   **主控制 (面板頂部)：**
    *   **播放/停止 (Play/Stop)：** 控制整體伴奏的啟動與停止。
    *   **總體速度 (Overall Tempo - BPM)：** 拖動滑桿調整伴奏的快慢 (40-240 BPM)。左側的紫色圓點 (或類似視覺提示) 會跟隨節拍閃爍。
    *   **狀態提示：** 顯示音訊引擎是否就緒、和弦進行是否為空等。

*   **和弦伴奏 (Chord Instrument) 設定：**
    *   **(教學提及「伴奏層」，此處依先前程式碼理解為單層和弦伴奏，待確認是否支援多層)**
    *   **音量 (Volume)：** 獨立控制和弦伴奏的音量。
    *   **樂器 (Instrument)：** 為和弦伴奏選擇樂器音色 (如鋼琴、合成鋼琴、吉他等)。
    *   **節奏型態 (Rhythm Pattern)：**
        *   選擇預設的節奏型態 (如每小節一次、每兩拍一次、每拍一次等)。
        *   選擇「自訂 (Custom)」後，會出現**自訂節奏編輯器 (Custom Rhythm Editor)**，讓您為進行中的每個和弦的每一拍 (共4拍) 獨立設定音符時值 (全音符到十六分音符，或關閉)。

*   **鼓組伴奏 (Drum Kit) 設定：**
    *   **啟用鼓組 (Enable Drums)：** 開啟/關閉鼓聲。
    *   **音量 (Volume)：** 獨立控制鼓組的音量。
    *   **鼓組風格 (Pattern)：** 選擇預設的鼓組風格 (如搖滾、流行/放克、爵士、拉丁、EDM)。
    *   選擇「自訂 (Custom)」風格後，會出現強大的**自訂鼓點編輯器 (Custom Drum Editor)**：
        *   為和弦進行中的每個和弦獨立編輯鼓點。
        *   可分別為多種鼓樂器 (大鼓、小鼓、閉合鈸、筒鼓、碎音鈸) 的每一拍 (共4拍) 中的每個細分音符 (16分音符，共4個細分) 設定是否啟用。

*   **貝斯伴奏 (Bass Guitar) 設定：**
    *   **啟用貝斯 (Enable Bass)：** 開啟/關閉貝斯。
    *   **音量 (Volume)：** 獨立控制貝斯的音量。
    *   **貝斯音色 (Instrument)：** 選擇貝斯音色 (如電貝斯、合成貝斯、木貝斯)。
    *   **貝斯線風格 (Pattern)：** 選擇預設的貝斯線風格 (如根音、根音與五音、簡單琶音、簡易行走貝斯)。

*   **效果 (Effects) 設定：** (此功能區塊待確認是否存在於當前程式碼中，教學文件提及)
    *   這裡的設定會影響所有聲音（包含您的手動彈奏和所有伴奏樂器）。
    *   **殘響 (Reverb)：** 增加空間感。
    *   **延遲 (Delay)：** 產生回音效果。
    *   **搖擺律動 (Swing)：** 讓節奏帶有搖擺感，常用於爵士樂。

### 5. 其他特性
*   📱 **響應式設計：** 界面自動適應桌面、平板和行動裝置螢幕尺寸。
*   ⚙️ **PWA (漸進式網頁應用程式)：**
    *   可添加至裝置主畫面，提供類似原生應用的體驗。
    *   支援離線使用 (需在有網路時至少載入一次資源)。
    *   透過 Service Worker 自動更新快取資源。

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

您可以使用電腦鍵盤來彈奏鋼琴音符。按鍵配置旨在模擬真實鋼琴的佈局。詳細的預設按鍵對應可以在程式碼中的 `src/constants.ts` 檔案內的 `KEY_MAPPING` 變數找到。當輸入焦點在文字輸入框或下拉選單等表單元件上時，鍵盤彈奏功能會暫時停用，以避免衝突。

## ☁️ 部署

此專案已設定好透過 GitHub Actions 自動部署到 GitHub Pages。相關的部署流程設定位於 `.github/workflows/deploy.yml`。
每次推送到 `main` 分支後，成功的部署將會更新 [線上演示](https://hsuchen1.github.io/piano/)。

## 🧑‍💻 作者

*   **hsuchen**

## 📄 授權條款

<!-- 建議：添加一個授權條款，例如 MIT License -->
本專案目前未設定明確的授權條款。如果您希望使用、修改或分發此專案，建議您聯繫作者，或在您自行 fork 的版本中添加一個您選擇的開源授權（例如 MIT License）。

---

希望這個 README 對您有所幫助！開始探索，結合不同的樂器、節奏和效果，創造出屬於您獨一無二的音樂！
如果您有任何建議、發現任何問題，或希望貢獻，請隨時提出 Issue 或 Pull Request。
