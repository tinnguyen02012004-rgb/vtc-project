/**
 * File: js/stories.js
 * Mô tả: Logic trang danh sách truyện (stories.html)
 * 👉 Đặt file này vào thư mục js/ trong project
 *
 * Chức năng:
 *  - Lắng nghe auth state → hiện/ẩn UI
 *  - Load danh sách truyện từ Firestore realtime
 *  - Tạo truyện mới (modal)
 *  - Xóa truyện
 *  - Tìm kiếm client-side
 */

import { initializeApp }  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  collection, doc,
  addDoc, deleteDoc,
  onSnapshot,
  query, orderBy,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/* ── Firebase config (giữ nguyên config của bạn) ───────────── */
const firebaseConfig = {
  apiKey:            'AIzaSyB5fHbj56aCCEXsUocpygQSRsS7OS0kUb4',
  authDomain:        'anhtrangkhuya02.firebaseapp.com',
  projectId:         'anhtrangkhuya02',
  storageBucket:     'anhtrangkhuya02.firebasestorage.app',
  messagingSenderId: '518341156099',
  appId:             '1:518341156099:web:3b44e9d73265a9be7c1d36',
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/* ── State ──────────────────────────────────────────────────── */
let currentUser  = null;   // Firebase user object
let allStories   = [];     // toàn bộ truyện đã load
let unsubStories = null;   // hàm unsubscribe Firestore listener
let editingId    = null;   // id truyện đang edit (null = thêm mới)

/* ── DOM helpers ─────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

/* ── Auth state listener ────────────────────────────────────── */
onAuthStateChanged(auth, user => {
  currentUser = user;

  if (user) {
    // Hiện UI khi đã đăng nhập
    $('userBar').style.display   = 'flex';
    $('actionBar').style.display = 'flex';
    $('loginRequired').style.display = 'none';

    // Cập nhật avatar & tên
    $('userAvatar').src  = user.photoURL  || '';
    $('userName').textContent = user.displayName || user.email;

    // Bắt đầu lắng nghe danh sách truyện
    listenStories(user.uid);
  } else {
    // Chưa đăng nhập
    $('userBar').style.display       = 'none';
    $('actionBar').style.display     = 'none';
    $('loginRequired').style.display = 'block';
    $('storiesGrid').innerHTML       = '';

    // Hủy listener nếu có
    if (unsubStories) { unsubStories(); unsubStories = null; }
    allStories = [];
  }
});

/* ── Đăng xuất ──────────────────────────────────────────────── */
window.handleLogout = async () => {
  if (unsubStories) { unsubStories(); unsubStories = null; }
  await signOut(auth);
  window.location.href = 'index.html';
};

/* ═══════════════════════════════════════════════════════════════
   FIRESTORE: Lắng nghe danh sách truyện realtime
   Collection: users/{uid}/novels
   Order: createdAt descending (mới nhất lên đầu)
═══════════════════════════════════════════════════════════════ */
function listenStories(uid) {
  // Hủy listener cũ trước khi tạo mới
  if (unsubStories) unsubStories();

  const storiesRef = collection(db, `users/${uid}/novels`);
  const q = query(storiesRef, orderBy('createdAt', 'desc'));

  // onSnapshot: gọi callback mỗi khi dữ liệu thay đổi
  unsubStories = onSnapshot(
    q,
    snap => {
      // Map Firestore docs → plain objects
      allStories = snap.docs.map(d => ({
        id:        d.id,
        title:     d.data().title    || 'Không có tiêu đề',
        content:   d.data().content  || '',
        createdAt: d.data().createdAt, // Firestore Timestamp
      }));
      renderStories(allStories);
    },
    err => {
      console.error('Lỗi load truyện:', err);
      $('storiesGrid').innerHTML =
        '<div class="empty-state"><div class="empty-icon">⚠️</div>' +
        '<div class="empty-text">Lỗi tải dữ liệu: ' + err.message + '</div></div>';
    }
  );
}

/* ═══════════════════════════════════════════════════════════════
   RENDER: Hiển thị danh sách truyện
═══════════════════════════════════════════════════════════════ */
const STORY_EMOJIS = ['📖','🌸','⚔️','🌙','🔥','💫','🏯','🌊','🎭','✨','🐉','🌺'];

function renderStories(stories) {
  const grid = $('storiesGrid');

  // Cập nhật đếm
  $('storyCount').textContent = stories.length ? `(${stories.length} truyện)` : '';

  // Empty state
  if (!stories.length) {
    grid.innerHTML =
      '<div class="empty-state">' +
      '<div class="empty-icon">✍️</div>' +
      '<div class="empty-text">Chưa có truyện nào.<br>Nhấn <strong>✨ Viết truyện mới</strong> để bắt đầu!</div>' +
      '</div>';
    return;
  }

  // Render từng card
  grid.innerHTML = stories.map((s, index) => {
    // Preview: lấy 100 ký tự đầu của content
    const preview = s.content.replace(/\n+/g, ' ').trim().slice(0, 100);
    // Emoji ngẫu nhiên nhưng ổn định theo title
    const emojiIdx = s.title.length % STORY_EMOJIS.length;
    const emoji = STORY_EMOJIS[emojiIdx];
    // Format thời gian
    const timeStr = formatTime(s.createdAt);

    return `
      <a class="story-card" href="read.html?id=${s.id}"
         style="animation-delay:${index * 0.06}s">

        <!-- Nút xóa (chặn click lan ra <a>) -->
        <div class="story-actions">
          <button class="story-act-btn del"
                  onclick="event.preventDefault(); deleteStory('${s.id}', '${escHtml(s.title)}')"
                  title="Xóa truyện">🗑</button>
        </div>

        <div class="story-emoji">${emoji}</div>
        <div class="story-title">${escHtml(s.title)}</div>
        ${preview ? `<div class="story-preview">${escHtml(preview)}${preview.length >= 100 ? '…' : ''}</div>` : ''}
        <div class="story-meta">
          <span>${countParagraphs(s.content)} đoạn</span>
          <span>${timeStr}</span>
        </div>
      </a>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   FIRESTORE: Lưu truyện mới
═══════════════════════════════════════════════════════════════ */
window.saveStory = async () => {
  const title   = $('wfTitle').value.trim();
  const content = $('wfContent').value.trim();

  if (!title) { showToast('⚠️ Nhập tiêu đề truyện!'); return; }
  if (!currentUser) { showToast('⚠️ Vui lòng đăng nhập!'); return; }

  const btn = $('saveBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Đang lưu...';

  try {
    // Thêm document mới vào sub-collection novels của user
    await addDoc(
      collection(db, `users/${currentUser.uid}/novels`),
      {
        title,
        content,
        createdAt: serverTimestamp(), // thời gian server Firebase
      }
    );

    showToast('✅ Đã lưu truyện!');
    closeWriteModal();
    // onSnapshot sẽ tự cập nhật UI — không cần render thủ công

  } catch (err) {
    console.error('Lỗi lưu truyện:', err);
    showToast('❌ Lỗi: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Lưu truyện';
  }
};

/* ═══════════════════════════════════════════════════════════════
   FIRESTORE: Xóa truyện
═══════════════════════════════════════════════════════════════ */
window.deleteStory = async (id, title) => {
  if (!confirm(`Xóa truyện "${title}"?\nHành động này không thể hoàn tác.`)) return;
  if (!currentUser) return;

  try {
    await deleteDoc(doc(db, `users/${currentUser.uid}/novels/${id}`));
    showToast('🗑 Đã xóa truyện.');
  } catch (err) {
    console.error('Lỗi xóa:', err);
    showToast('❌ Lỗi xóa: ' + err.message);
  }
};

/* ═══════════════════════════════════════════════════════════════
   TÌM KIẾM client-side
═══════════════════════════════════════════════════════════════ */
window.filterStories = (keyword) => {
  const kw = keyword.toLowerCase().trim();
  if (!kw) {
    renderStories(allStories); // hiện tất cả nếu không có keyword
    return;
  }
  const filtered = allStories.filter(s =>
    s.title.toLowerCase().includes(kw) ||
    s.content.toLowerCase().includes(kw)
  );
  renderStories(filtered);
};

/* ═══════════════════════════════════════════════════════════════
   MODAL: Mở/đóng form viết truyện
═══════════════════════════════════════════════════════════════ */
window.openWriteModal = () => {
  editingId = null;
  $('modalTitle').textContent = '✍️ Viết truyện mới';
  $('wfTitle').value   = '';
  $('wfContent').value = '';
  const modal = $('writeModal');
  modal.classList.add('open');
  requestAnimationFrame(() => modal.classList.add('visible'));
  setTimeout(() => $('wfTitle').focus(), 300);
};

window.closeWriteModal = () => {
  const modal = $('writeModal');
  modal.classList.remove('visible');
  setTimeout(() => modal.classList.remove('open'), 300);
};

// Đóng modal khi nhấn Esc
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeWriteModal();
});

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════ */

/** Escape HTML để tránh XSS */
function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Đếm số đoạn văn */
function countParagraphs(content) {
  if (!content) return 0;
  return content.split('\n').filter(p => p.trim().length > 0).length;
}

/** Format Firestore Timestamp → chuỗi thời gian */
function formatTime(ts) {
  if (!ts) return '';
  try {
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('vi', { day:'2-digit', month:'2-digit', year:'numeric' });
  } catch (e) { return ''; }
}

/** Hiện toast notification */
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
