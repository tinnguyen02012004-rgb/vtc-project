// ============================================================
// File: js/modules/auth.js
// Mô tả: Xử lý xác thực:
//        - Đăng nhập Google (signInWithPopup)
//        - Đăng xuất (signOut)
//        - Lắng nghe trạng thái auth (onAuthStateChanged)
//        - Toggle user dropdown menu
// ============================================================

import { signInWithPopup, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

import { auth, googleProvider } from './config.js';
import { state }                from './state.js';
import { listenNovels }         from './db.js';
import { initChat }             from './chat.js';
import { renderAll }            from './ui.js';
import { updateStats }          from './stats.js';
import { showToast }            from './ui.js';

// ── Khởi động xác thực ────────────────────────────────────
export function initAuth() {

  // Nút đăng nhập Google
  document.getElementById('btnGoogleLogin').onclick = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      showToast('❌ Đăng nhập thất bại: ' + e.message);
    }
  };

  // Theo dõi trạng thái đăng nhập realtime
  onAuthStateChanged(auth, user => {
    state.currentUser = user;

    if (user) {
      // Hiện app, ẩn login
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('appShell').style.display    = 'block';

      // Cập nhật avatar & tên
      document.getElementById('userAvatar').src           = user.photoURL || '';
      document.getElementById('userMenuName').textContent = user.displayName || user.email;

      // Bắt đầu lắng nghe dữ liệu
      listenNovels(user.uid);
      initChat();

    } else {
      // Hiện login, ẩn app
      document.getElementById('loginScreen').style.display = 'flex';
      document.getElementById('appShell').style.display    = 'none';

      // Reset dữ liệu
      state.novels = [];
      renderAll();
      updateStats();
    }
  });

  // Đóng user menu khi click ra ngoài
  document.addEventListener('click', e => {
    const menu = document.getElementById('userMenu');
    if (menu && !menu.contains(e.target) && e.target.id !== 'userAvatar') {
      menu.classList.remove('open');
    }
  });
}

// ── Đăng xuất ─────────────────────────────────────────────
export async function handleSignOut() {
  if (state.unsubDb)   { state.unsubDb();   state.unsubDb   = null; }
  if (state.unsubChat) { state.unsubChat(); state.unsubChat = null; }
  await signOut(auth);
  document.getElementById('userMenu').classList.remove('open');
}

// ── Toggle user dropdown ──────────────────────────────────
export function toggleUserMenu() {
  document.getElementById('userMenu').classList.toggle('open');
}
