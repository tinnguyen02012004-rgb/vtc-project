// ============================================================
// File: js/modules/state.js
// Mô tả: Biến trạng thái toàn cục dùng chung giữa các module.
//        Export object `state` để các module import và mutate
//        cùng một tham chiếu (reference sharing).
// ============================================================

// ── Shared mutable state ──────────────────────────────────
export const state = {
  // Firebase / data
  currentUser:   null,
  unsubDb:       null,      // hàm unsubscribe Firestore novels
  unsubChat:     null,      // hàm unsubscribe Firestore chat
  novels:        [],

  // UI / filter
  currentFilter: 'all',
  viewMode:      'grid',

  // Form
  editId:        null,
  currentRating: 0,
  genreTags:     [],
  pairTags:      [],

  // Chat
  chatOpen:      false,
  unreadCount:   0,
  chatInited:    false,
};

// ── Constants ─────────────────────────────────────────────
export const EMOJIS = [
  '📖','🌸','⚔️','🌙','🔥','💫','🏯','🌊',
  '🎭','✨','🐉','🌺','🌿','❄️','🦋',
];

// ── Utility: generate unique ID ───────────────────────────
export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Utility: random emoji for cover ──────────────────────
export function randomEmoji() {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}
