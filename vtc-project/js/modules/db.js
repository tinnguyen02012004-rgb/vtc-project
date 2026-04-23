// ============================================================
// File: js/modules/db.js
// Mô tả: Thao tác Firestore cho novels:
//        - listenNovels()    : realtime onSnapshot
//        - saveToDb()        : setDoc (thêm/sửa)
//        - deleteFromDb()    : deleteDoc
//        - setSyncState()    : cập nhật UI chỉ báo sync
// ============================================================

import {
  collection, doc, setDoc, deleteDoc, onSnapshot, query,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

import { db }          from './config.js';
import { state }       from './state.js';
import { renderAll }   from './ui.js';
import { updateStats } from './stats.js';
import { showToast }   from './ui.js';

// ── Cập nhật chỉ báo đồng bộ ──────────────────────────────
export function setSyncState(s) {
  const dot = document.getElementById('syncDot');
  const lbl = document.getElementById('syncLabel');
  dot.className = 'sync-dot'
    + (s === 'syncing' ? ' syncing' : s === 'error' ? ' error' : '');
  lbl.textContent =
    s === 'syncing' ? 'Đang lưu...' :
    s === 'error'   ? 'Lỗi' :
                      'Đồng bộ';
}

// ── Lắng nghe thay đổi realtime từ Firestore ──────────────
// Không dùng orderBy để tránh cần Composite Index
// → sort client-side trong filter.js
export function listenNovels(uid) {
  if (state.unsubDb) state.unsubDb();

  state.unsubDb = onSnapshot(
    query(collection(db, `users/${uid}/novels`)),
    snap => {
      state.novels = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderAll();
      updateStats();
      setSyncState('synced');
    },
    err => {
      console.error('Firestore novels error:', err.code, err.message);
      setSyncState('error');
      showToast('⚠ Lỗi đồng bộ: ' + err.message);
    }
  );
}

// ── Lưu một novel vào Firestore ───────────────────────────
export async function saveToDb(novel) {
  if (!state.currentUser) return;
  setSyncState('syncing');
  try {
    await setDoc(
      doc(db, `users/${state.currentUser.uid}/novels/${novel.id}`),
      novel
    );
    setSyncState('synced');
  } catch (e) {
    setSyncState('error');
    showToast('❌ Lỗi lưu: ' + e.message);
    throw e; // re-throw để caller biết
  }
}

// ── Xóa một novel khỏi Firestore ─────────────────────────
export async function deleteFromDb(id) {
  if (!state.currentUser) return;
  setSyncState('syncing');
  try {
    await deleteDoc(doc(db, `users/${state.currentUser.uid}/novels/${id}`));
    setSyncState('synced');
  } catch (e) {
    setSyncState('error');
    showToast('❌ Lỗi xóa: ' + e.message);
  }
}
