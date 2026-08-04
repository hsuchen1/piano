
import React, { FC } from 'react';
import Modal from '../ui/Modal';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Declared at module scope on purpose. When these lived inside TutorialModal they
// were re-created on every render, giving them a new component identity each time,
// which makes React unmount and remount the entire tutorial subtree instead of
// updating it.
const SectionTitle: FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-xl font-bold text-blue-300 mt-5 mb-2 border-b border-gray-600 pb-1">{children}</h3>
);

const ListItem: FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="text-gray-300">{children}</li>
);

const TutorialModal: FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      title="使用教學"
      size="lg"
      scrollBody
      onDismiss={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-6 min-h-tap inline-flex items-center bg-accent-chord hover:bg-blue-700 text-white font-semibold rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-chord"
        >
          關閉
        </button>
      }
    >
      <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-purple-300">歡迎來到互動鋼琴工作室！</h2>
            <p className="text-gray-300 mt-1">釋放您的音樂創意！在這裡，您不僅可以自由彈奏、編曲，更能讓 AI 成為您的智慧編曲夥伴，輕鬆打造專屬伴奏。</p>
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
                    <ListItem><strong>儲存:</strong> 點擊「儲存」按鈕，為您當前的和弦進行命名並保存至瀏覽器本機。若名稱與既有存檔重複，會先詢問是否覆寫。</ListItem>
                    <ListItem><strong>載入:</strong> 在「已儲存的和弦進行」面板中點擊「載入」。除了和弦與轉位，速度、移調、主鍵盤音色與音量、各伴奏層設定、鼓組、貝斯與三項效果都會一併還原。</ListItem>
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
                  <strong>AI 智慧轉位:</strong> 在「和弦進行」面板中，點擊「🧠 AI 智慧轉位」按鈕。AI 會分析整個和弦進行，不僅讓最高音的旋律線條更平滑，同時也會維持整體的音高穩定性，避免不自然的八度跳躍，讓編曲聽起來更專業、更悅耳。
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

          <div className="text-center pt-4 mt-4 border-t border-surface-line">
            <p className="text-lg font-semibold text-accent-ai">開始探索吧！</p>
            <p className="text-gray-300">結合不同的樂器、節奏和效果，創造出屬於您獨一無二的音樂！</p>
          </div>
      </div>
    </Modal>
  );
};

export default TutorialModal;
