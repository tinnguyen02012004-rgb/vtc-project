// ============================================================
// File: js/modules/chat.js
// Mô tả: Chat realtime dùng Firestore collection `chat_global`
//        - initChat()          : khởi tạo listener
//        - renderChatMessages(): render tin nhắn vào DOM
//        - sendChatMsg()       : gửi tin nhắn
//        - toggleChat()        : mở/đóng panel
//
// Firestore Rules cần thêm:
//   match /chat_global/{msgId} {
//     allow read, write: if request.auth != null;
//   }
// ============================================================

import {
  collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { db }       from './config.js';
import { state }    from './state.js';
import { showToast }from './ui.js';

// ── Escape HTML để tránh XSS ──────────────────────────────
function escapeHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Khởi tạo listener chat ────────────────────────────────
export function initChat() {
  if (state.chatInited) return;
  state.chatInited = true;

  const q = query(
    collection(db, 'chat_global'),
    orderBy('ts', 'desc'),
    limit(50)
  );

  state.unsubChat = onSnapshot(q, snap => {
    // Đảo ngược để hiển thị theo thứ tự cũ → mới
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
    renderChatMessages(msgs);

    // Hiện badge nếu panel đang đóng và có tin nhắn mới từ người khác
    if (!state.chatOpen && msgs.length) {
      const last = msgs[msgs.length - 1];
      if (last.uid !== state.currentUser?.uid) {
        state.unreadCount++;
        const badge = document.getElementById('chatBadge');
        badge.textContent = state.unreadCount > 9 ? '9+' : state.unreadCount;
        badge.classList.add('show');
      }
    }
  });
}

// ── Render danh sách tin nhắn vào DOM ─────────────────────
function renderChatMessages(msgs) {
  const container = document.getElementById('chatMessages');
  // Giữ scroll nếu đang ở cuối
  const atBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 40;

  container.innerHTML = '<div class="chat-system">Vân Thư Lounge 🌸 — Chia sẻ cảm nhận đam mỹ!</div>';

  msgs.forEach(m => {
    const isMe = m.uid === state.currentUser?.uid;
    const time = m.ts?.toDate
      ? new Date(m.ts.toDate()).toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit' })
      : '';

    const div = document.createElement('div');
    div.className = 'chat-msg ' + (isMe ? 'me' : 'them');
    div.innerHTML = `
      <div class="chat-bubble">${escapeHtml(m.text)}</div>
      <div class="chat-meta">
        ${!isMe
          ? `<img class="chat-avatar-mini" src="${m.photo || ''}" onerror="this.style.display='none'">
             <span>${escapeHtml(m.name || 'Ẩn danh')}</span>`
          : ''}
        <span>${time}</span>
      </div>`;
    container.appendChild(div);
  });

  if (atBottom) container.scrollTop = container.scrollHeight;
}

// ── Gửi tin nhắn ──────────────────────────────────────────
export async function sendChatMsg() {
  if (!state.currentUser) {
    showToast('⚠ Vui lòng đăng nhập để chat!');
    return;
  }
  const inp  = document.getElementById('chatInput');
  const text = inp.value.trim();
  if (!text) return;

  inp.value = '';
  inp.style.height = 'auto';

  try {
    await addDoc(collection(db, 'chat_global'), {
      text,
      uid:   state.currentUser.uid,
      name:  state.currentUser.displayName || 'Ẩn danh',
      photo: state.currentUser.photoURL    || '',
      ts:    serverTimestamp(),
    });
  } catch (e) {
    showToast('❌ Gửi thất bại: ' + e.message);
  }
}

// ── Toggle chat panel ─────────────────────────────────────
export function toggleChat() {
  state.chatOpen = !state.chatOpen;
  document.getElementById('chatPanel').classList.toggle('open', state.chatOpen);

  if (state.chatOpen) {
    // Reset badge
    state.unreadCount = 0;
    const badge = document.getElementById('chatBadge');
    badge.textContent = '0';
    badge.classList.remove('show');

    // Init nếu chưa (trường hợp chưa đăng nhập khi mở lần đầu)
    if (!state.chatInited && state.currentUser) initChat();

    // Cuộn xuống cuối
    setTimeout(() => {
      const c = document.getElementById('chatMessages');
      c.scrollTop = c.scrollHeight;
    }, 100);
  }
}
