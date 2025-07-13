

import React, { FC } from 'react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TutorialModal: FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const SectionTitle: FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="text-xl font-bold text-blue-300 mt-5 mb-2 border-b border-gray-600 pb-1">{children}</h3>
  );

  const ListItem: FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="text-gray-300">{children}</li>
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4 transition-opacity duration-300"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-gray-700 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <header className="flex justify-between items-center p-4 border-b border-gray-600">
          <h2 className="text-2xl font-bold text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            使用教學
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full transition-colors"
            aria-label="關閉教學"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        
        <main className="p-6 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-600">
          <div>
            <h2 className="text-2xl font-semibold text-purple-300">歡迎來到互動鋼琴工作室！</h2>
            <p className="text-gray-300 mt-1">這是一個功能強大的網頁工具，讓您不只能彈奏鋼琴，還能創造出豐富的背景伴奏。</p>
          </div>
          
          <SectionTitle>1. 彈奏虛擬鋼琴</SectionTitle>
          <ul className="list-disc list-inside space-y-2">
            <ListItem><strong>滑鼠/觸控:</strong> 直接點擊或觸碰螢幕上的琴鍵即可發聲。</ListItem>
            <ListItem>
              <strong>電腦鍵盤:</strong>
              <ul className="list-square list-inside pl-5 mt-1 text-sm space-y-1">
                  <ListItem>中下排 (<code className="bg-gray-800 px-1 rounded">Z, S, X, D...</code>) 對應一個八度。</ListItem>
                  <ListItem>中上排 (<code className="bg-gray-800 px-1 rounded">Q, 2, W, 3...</code>) 對應高一個八度。</ListItem>
                  <ListItem><strong>空白鍵捷徑:</strong> 您也可以隨時按下<code className="bg-gray-800 px-1 rounded">空白鍵</code>來播放或暫停伴奏。</ListItem>
              </ul>
            </ListItem>
          </ul>

          <SectionTitle>2. 核心設定</SectionTitle>
          <ul className="list-disc list-inside space-y-2">
            <ListItem><strong>移調控制:</strong> 使用 <code className="bg-gray-800 px-1 rounded">+</code> 和 <code className="bg-gray-800 px-1 rounded">-</code> 按鈕來升高或降低所有琴鍵的音高。</ListItem>
            <ListItem>
              <strong>主鍵盤設定:</strong>
              <ul className="list-square list-inside pl-5 mt-1 text-sm space-y-1">
                <ListItem><strong>音色:</strong> 從下拉選單中選擇您喜歡的鋼琴或合成器音色。部分音色（如真實平台鋼琴）在首次選擇時需要短暫的載入時間。</ListItem>
                <ListItem><strong>音量:</strong> 調整您手動彈奏的琴鍵音量。</ListItem>
                <ListItem><strong>顯示伴奏音符:</strong> 開啟後，伴奏所彈奏的音符會在琴鍵上以藍色顯示。</ListItem>
              </ul>
            </ListItem>
          </ul>

          <SectionTitle>3. 建立您的和弦進行</SectionTitle>
           <p className="text-gray-300">您可以用兩種方式建立伴奏的和弦基礎：</p>
           <ol className="list-decimal list-inside space-y-2">
                <ListItem><strong>手動新增:</strong> 在「新增和弦至進行」面板中選擇根音與和弦類型，然後點擊「新增和弦」。</ListItem>
                <ListItem>
                  <strong>編輯和弦進行:</strong>
                  <ul className="list-square list-inside pl-5 mt-1 text-sm space-y-1">
                    <ListItem><strong>刪除:</strong> 點擊和弦右側的紅色 <code className="bg-red-500 text-white px-1 rounded">X</code> 按鈕。</ListItem>
                    <ListItem><strong>轉位:</strong> 點擊和弦旁的 <code className="bg-gray-800 px-1 rounded">0, 1, 2...</code> 按鈕來切換和弦轉位。按鈕的數量會根據和弦的複雜度（三和弦、七和弦等）自動變化。</ListItem>
                    <ListItem><strong>重新排序:</strong> 按住和弦並拖曳到新的位置即可改變順序。</ListItem>
                  </ul>
                </ListItem>
                <ListItem>
                  <strong>儲存與載入:</strong>
                  <ul className="list-square list-inside pl-5 mt-1 text-sm space-y-1">
                    <ListItem><strong>儲存:</strong> 點擊「儲存」按鈕，為您當前的和弦進行命名並保存。</ListItem>
                    <ListItem><strong>載入:</strong> 在「已儲存的和弦進行」面板中，點擊「載入」以還原之前儲存的設定（包含所有樂器、節奏和效果）。</ListItem>
                  </ul>
                </ListItem>
           </ol>

          <SectionTitle>4. AI 智慧創作 (Gemini API)</SectionTitle>
          <p className="text-gray-300">利用 AI 的強大功能，加速您的音樂創作流程！</p>
          <ol className="list-decimal list-inside space-y-2 mt-2">
              <ListItem>
                  <strong>第一步：設定 API 金鑰 (僅需一次)</strong>
                  <ul className="list-square list-inside pl-5 mt-1 text-sm space-y-1">
                      <ListItem>前往「API 金鑰設定」面板。</ListItem>
                      <ListItem>將您的 Google Gemini API 金鑰貼入輸入框中並點擊「儲存」。</ListItem>
                      <ListItem><strong>安全提示：</strong>您的金鑰只會被安全地儲存在您自己的瀏覽器中，絕不會上傳或公開。</ListItem>
                  </ul>
              </ListItem>
              <ListItem>
                  <strong>AI 和弦生成:</strong> 在「AI 智慧創作」面板中，用文字描述您想要的音樂風格或情緒（例如：「一首輕快的流行歌」、「悲傷的電影配樂」），然後點擊生成。AI 將會**取代**您目前編輯的內容。
              </ListItem>
              <ListItem>
                  <strong>AI 風格轉換:</strong> 在「和弦進行」面板中，點擊「AI 風格轉換」按鈕。輸入您想要的新風格（例如：「爵士」、「8-bit 遊戲音樂」），AI 將會重新詮釋您現有的和弦進行。
              </ListItem>
              <ListItem>
                  <strong>AI 智慧轉位:</strong> 在「和弦進行」面板中，點擊「🧠 AI 智慧轉位」按鈕。AI 會自動調整所有和弦的轉位，讓和弦之間的銜接聽起來更流暢、更悅耳。
              </ListItem>
              <ListItem>
                  <strong>AI 鼓組生成:</strong> 在「鼓組」分頁中將風格設為「自訂」，然後在自訂鼓組編輯器中點擊任一和弦右上角的「AI」按鈕，描述您想要的鼓點即可。
              </ListItem>
               <ListItem>
                  <strong>AI 貝斯線生成:</strong> 在「貝斯」分頁中將風格設為「🤖 AI 生成貝斯線」，然後點擊「✨ 生成 AI 貝斯線」按鈕。描述您想要的風格，AI 就會為您的整個和弦進行創作一段完整的貝斯線。
              </ListItem>
          </ol>

          <SectionTitle>5. 設計您的伴奏</SectionTitle>
          <p className="text-gray-300">伴奏控制面板分為四個分頁，讓您精雕細琢您的音樂：</p>
          <ul className="space-y-3">
              <li><strong>主控制 (面板頂部):</strong>
                  <ul className="list-square list-inside pl-5 mt-1 text-sm space-y-1">
                      <ListItem><strong>播放/停止:</strong> 控制伴奏的啟動與停止。</ListItem>
                      <ListItem><strong>速度 (BPM):</strong> 拖動滑桿調整伴奏的快慢。左側的紫色圓點會跟隨節拍閃爍。</ListItem>
                  </ul>
              </li>
              <li><strong>和弦 (Chords) 分頁:</strong>
                  <ul className="list-square list-inside pl-5 mt-1 text-sm space-y-1">
                      <ListItem>您可以建立<strong>多個伴奏層</strong>，例如一層鋼琴、一層弦樂。</ListItem>
                      <ListItem>點擊「+ 新增伴奏層」來增加樂器。</ListItem>
                      <ListItem>每一層都可以獨立設定<strong>音量</strong>、<strong>樂器</strong>和<strong>節奏型態</strong>。</ListItem>
                      <ListItem>選擇「自訂」節奏型態後，會出現編輯器，讓您精確設定每個和弦在四拍中每一拍的音符時長。</ListItem>
                  </ul>
              </li>
              <li><strong>鼓組 (Drums) 分頁:</strong>
                  <ul className="list-square list-inside pl-5 mt-1 text-sm space-y-1">
                      <ListItem>點擊「啟用鼓組」來開啟/關閉鼓。</ListItem>
                      <ListItem>可以調整鼓的<strong>音量</strong>和選擇預設的<strong>鼓組風格</strong> (如搖滾、拉丁)。</ListItem>
                      <ListItem>選擇「自訂」風格後，會出現詳細的編輯器，讓您為每個和弦的每一拍的 4 個分拍點擊設定鼓點。</ListItem>
                      <ListItem>在自訂模式中，您可以使用「複製」按鈕複製一個小節的鼓點，再到另一個小節點擊「貼上」，快速應用相同節奏。</ListItem>
                  </ul>
              </li>
              <li><strong>貝斯 (Bass) 分頁:</strong>
                  <ul className="list-square list-inside pl-5 mt-1 text-sm space-y-1">
                      <ListItem>啟用後，可以調整貝斯的<strong>音量</strong>、<strong>音色</strong>和<strong>貝斯線風格</strong> (如根音、簡單琶音等)。</ListItem>
                  </ul>
              </li>
              <li><strong>效果 (Effects) 分頁:</strong>
                  <ul className="list-square list-inside pl-5 mt-1 text-sm space-y-1">
                      <ListItem>這裡的設定會影響<strong>所有</strong>聲音（包含您的手動彈奏和所有伴奏樂器）。</ListItem>
                      <ListItem><strong>殘響 (Reverb):</strong> 增加空間感。</ListItem>
                      <ListItem><strong>延遲 (Delay):</strong> 產生回音效果。</ListItem>
                      <ListItem><strong>搖擺律動 (Swing):</strong> 讓節奏帶有搖擺感，常用於爵士樂。</ListItem>
                  </ul>
              </li>
          </ul>

          <div className="text-center pt-4 mt-4 border-t border-gray-600">
            <p className="text-lg font-semibold text-purple-300">開始探索吧！</p>
            <p className="text-gray-300">結合不同的樂器、節奏和效果，創造出屬於您獨一無二的音樂！</p>
          </div>
        </main>

        <footer className="p-4 text-center">
            <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-700"
            >
                關閉
            </button>
        </footer>
      </div>
    </div>
  );
};

export default TutorialModal;