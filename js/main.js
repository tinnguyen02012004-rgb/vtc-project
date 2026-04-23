// ============================================================
// File: js/main.js
// Mô tả: Entry point của ứng dụng (ES Module).
//        Import tất cả module → expose ra window → init.
//
// Lý do expose window.*:
//   HTML dùng inline onclick="..." nên cần các hàm ở
//   global scope. ES Module không tự expose ra global,
//   phải gán tường minh window.xxx = fn.
// ============================================================

// ── Import tất cả modules ────────────────────────────────
import { initAuth, handleSignOut, toggleUserMenu }
  from './modules/auth.js';

import { renderAll, openDetail, switchTab, closeModal, showToast, addQuote, deleteQuote }
  from './modules/ui.js';

import { openAddModal, saveNovel, deleteNovel, handleTagKey, removeTag, setRating }
  from './modules/form.js';

import { filterStatus, setView }
  from './modules/filter.js';

import { sendChatMsg, toggleChat }
  from './modules/chat.js';

// ── Expose functions to window (for inline onclick in HTML) ─
// Auth
window.handleSignOut  = handleSignOut;
window.toggleUserMenu = toggleUserMenu;

// UI
window.renderAll   = renderAll;
window.openDetail  = openDetail;
window.switchTab   = switchTab;
window.closeModal  = closeModal;
window.addQuote    = addQuote;
window.deleteQuote = deleteQuote;

// Form / Novel
window.openAddModal = openAddModal;
window.saveNovel    = saveNovel;
window.deleteNovel  = deleteNovel;
window.setRating    = setRating;
window.handleTagKey = handleTagKey;
window.removeTag    = removeTag;

// Filter / View
window.filterStatus = filterStatus;
window.setView      = setView;

// Chat
window.sendChatMsg = sendChatMsg;
window.toggleChat  = toggleChat;

// ── Global keyboard shortcuts ─────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal('addModal');
    closeModal('detailModal');
  }
});

// ── Đóng modal khi click vào backdrop ────────────────────
['addModal', 'detailModal'].forEach(id => {
  document.getElementById(id).addEventListener('click', function (e) {
    if (e.target === this) closeModal(id);
  });
});

// ── Khởi động app ─────────────────────────────────────────
initAuth();

// ── Console info (dev helper) ─────────────────────────────
console.log(
  '%c云书阁 Vân Thư Các v3%c\n' +
  'Firestore Rules cần có:\n' +
  '  users/{uid}/novels → read/write nếu auth.uid == uid\n' +
  '  chat_global/{id}   → read/write nếu request.auth != null',
  'color:#4ecdc4;font-size:15px;font-weight:bold',
  'color:#6fa8b8;font-size:11px'
);
