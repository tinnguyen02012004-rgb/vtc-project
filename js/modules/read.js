/**
 * File: js/read.js
 * Mô tả: Logic trang đọc truyện + comment theo đoạn (read.html)
 * 👉 Đặt file này vào thư mục js/ trong project
 *
 * Chức năng:
 *  - Đọc storyId từ URL (?id=...)
 *  - Load nội dung truyện từ Firestore
 *  - Tách nội dung thành đoạn theo "\n"
 *  - Mỗi đoạn có nút comment
 *  - Lưu / load comment theo paragraphIndex
 *  - Setting: cỡ chữ, giãn dòng, theme
 */

import { initializeApp }  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  doc, getDoc,
  collection,
  addDoc,
  onSnapshot,
  query, orderBy,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/* ── Firebase config ─────────────────────────────────────────── */
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
let currentUser  = null;
let storyData    = null;   // { id, title, content, authorUid, ... }
let storyOwnerId = null;   // uid của người viết truyện

// Map: paragraphIndex → mảng comments
// Dùng để render khi có comment mới
const commentsMap = {};

// Map: paragraphIndex → hàm unsubscribe listener comments
const unsubComments = {};

/* ── DOM helpers ─────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

/* ── Đọc storyId từ URL ─────────────────────────────────────── */
const urlParams  = new URLSearchParams(window.location.search);
const storyId    = urlParams.get('id');

/* ── Khởi động ──────────────────────────────────────────────── */
if (!storyId) {
  // Không có id → về trang danh sách
  showError('Không tìm thấy truyện.', true);
} else {
  // Lắng nghe auth rồi load truyện
  onAuthStateChanged(auth, user => {
    currentUser = user;
    loadStory(storyId);
  });
}

/* ═══════════════════════════════════════════════════════════════
   FIRESTORE: Load nội dung truyện
   Document: users/{ownerUid}/novels/{storyId}
   Vì không biết ownerUid, ta cần lưu ownerUid trong story
   hoặc pass qua URL. Ở đây ta query bằng storyId từ URL.

   💡 Giải pháp đơn giản: truyện thuộc về currentUser
      (trang này chỉ đọc truyện của mình)
      Nếu muốn đọc truyện public → cần thêm collectionGroup query
═══════════════════════════════════════════════════════════════ */
async function loadStory(id) {
  // Chờ auth state
  // currentUser có thể null (chưa đăng nhập) → vẫn cho đọc
  // nhưng không được comment

  // Lấy owner uid: ưu tiên từ URL param, fallback currentUser
  const ownerUid = urlParams.get('uid') || (currentUser ? currentUser.uid : null);

  if (!ownerUid) {
    showError('Vui lòng đăng nhập để đọc truyện.');
    return;
  }

  storyOwnerId = ownerUid;

  try {
    const storyRef  = doc(db, `users/${ownerUid}/novels/${id}`);
    const storySnap = await getDoc(storyRef);

    if (!storySnap.exists()) {
      showError('Truyện không tồn tại hoặc đã bị xóa.', true);
      return;
    }

    storyData = {
      id:        storySnap.id,
      title:     storySnap.data().title   || 'Không có tiêu đề',
      content:   storySnap.data().content || '',
      createdAt: storySnap.data().createdAt,
    };

    renderStory(storyData);

  } catch (err) {
    console.error('Lỗi load truyện:', err);
    showError('Lỗi tải truyện: ' + err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════
   RENDER: Hiển thị nội dung truyện theo đoạn
═══════════════════════════════════════════════════════════════ */
function renderStory(story) {
  const wrap = $('readerWrap');

  // Cập nhật title trên tab và top bar
  document.title     = story.title + ' · 云书阁';
  $('navTitle').textContent = story.title;

  // Tách nội dung thành đoạn (filter bỏ dòng trắng)
  const paragraphs = story.content
    .split('\n')
    .filter(p => p.trim().length > 0);

  if (!paragraphs.length) {
    wrap.innerHTML =
      '<div class="story-header">' +
        `<div class="story-main-title">${escHtml(story.title)}</div>` +
        '<div class="story-divider"></div>' +
      '</div>' +
      '<div class="state-msg"><div class="icon">📄</div><p>Truyện chưa có nội dung.</p></div>';
    return;
  }

  // Format thời gian
  const timeStr = formatTime(story.createdAt);

  // Build HTML
  let html =
    '<div class="story-header">' +
      `<div class="story-main-title">${escHtml(story.title)}</div>` +
      `<div class="story-author-meta">` +
        `<span>📅 ${timeStr}</span>` +
        `<span>📝 ${paragraphs.length} đoạn</span>` +
      '</div>' +
      '<div class="story-divider"></div>' +
    '</div>';

  // Render từng đoạn
  paragraphs.forEach((para, index) => {
    html +=
      `<div class="para-block" id="para-${index}" data-index="${index}">` +

        // Nội dung đoạn văn
        `<div class="para-text">${escHtml(para)}</div>` +

        // Nút comment (hiện khi hover)
        `<button class="para-comment-btn"
                 onclick="toggleComments(${index})"
                 title="Comment đoạn này">💬</button>` +

        // Hiển thị số comment (sẽ được cập nhật sau)
        `<div class="para-comment-count" onclick="toggleComments(${index})"
              id="count-${index}"></div>` +

        // Vùng comment (ẩn mặc định, toggle khi click)
        `<div class="para-comments" id="comments-${index}">` +
          `<div class="comment-list" id="comment-list-${index}">` +
            // Comments sẽ được inject bằng JS
          '</div>' +
          buildCommentInput(index) +
        '</div>' +

      '</div>';
  });

  wrap.innerHTML = html;

  // Sau khi render xong → load comments cho từng đoạn
  paragraphs.forEach((_, index) => {
    listenComments(storyOwnerId, story.id, index);
  });

  // Restore reading settings từ localStorage
  restoreSettings();
}

/* ── Build comment input HTML ────────────────────────────────── */
function buildCommentInput(paraIndex) {
  if (!currentUser) {
    // Chưa đăng nhập → hiện hint
    return `<div class="comment-login-hint">
      <a href="index.html" style="color:var(--accent)">Đăng nhập</a>
      để bình luận đoạn này.
    </div>`;
  }
  return `
    <div class="comment-input-wrap">
      <textarea
        class="comment-textarea"
        id="cinput-${paraIndex}"
        placeholder="Bình luận đoạn này..."
        rows="1"
        oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();submitComment(${paraIndex});}"
      ></textarea>
      <button class="comment-send"
              id="csend-${paraIndex}"
              onclick="submitComment(${paraIndex})"
              title="Gửi (Enter)">➤</button>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════
   FIRESTORE: Lắng nghe comments của một đoạn (realtime)
   SubCollection: users/{uid}/novels/{novelId}/comments
   Filter: paragraphIndex == index
   Order:  createdAt asc (cũ trước)
═══════════════════════════════════════════════════════════════ */
function listenComments(ownerUid, novelId, paraIndex) {
  // Hủy listener cũ nếu có
  if (unsubComments[paraIndex]) {
    unsubComments[paraIndex]();
  }

  const commentsRef = collection(db, `users/${ownerUid}/novels/${novelId}/comments`);

  // Query: lấy tất cả comments của đoạn này, sắp xếp theo thời gian
  const q = query(
    commentsRef,
    orderBy('createdAt', 'asc')
  );

  unsubComments[paraIndex] = onSnapshot(q, snap => {
    // Lọc comments có paragraphIndex === paraIndex
    const comments = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(c => c.paragraphIndex === paraIndex);

    commentsMap[paraIndex] = comments;
    renderComments(paraIndex, comments);
  });
}

/* ═══════════════════════════════════════════════════════════════
   RENDER: Hiển thị comments của một đoạn
═══════════════════════════════════════════════════════════════ */
function renderComments(paraIndex, comments) {
  const list  = $(`comment-list-${paraIndex}`);
  const count = $(`count-${paraIndex}`);
  if (!list) return;

  // Cập nhật badge đếm
  if (count) {
    count.innerHTML = comments.length
      ? `💬 ${comments.length} bình luận`
      : '';
  }

  if (!comments.length) {
    list.innerHTML = '';
    return;
  }

  list.innerHTML = comments.map(c => {
    const time   = formatTime(c.createdAt);
    const photo  = c.authorPhoto || '';
    const letter = (c.authorName || '?')[0].toUpperCase();

    return `
      <div class="comment-item">
        <div class="comment-avatar">
          ${photo
            ? `<img src="${photo}" onerror="this.style.display='none'">`
            : letter}
        </div>
        <div class="comment-body">
          <div class="comment-author">${escHtml(c.authorName || 'Ẩn danh')}</div>
          <div class="comment-text">${escHtml(c.text)}</div>
          <div class="comment-time">${time}</div>
        </div>
      </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════════════════════
   FIRESTORE: Gửi comment mới
   Lưu vào: users/{ownerUid}/novels/{novelId}/comments/{auto-id}
═══════════════════════════════════════════════════════════════ */
window.submitComment = async (paraIndex) => {
  if (!currentUser) { showToast('⚠️ Đăng nhập để bình luận!'); return; }
  if (!storyData || !storyOwnerId) return;

  const textarea = $(`cinput-${paraIndex}`);
  const sendBtn  = $(`csend-${paraIndex}`);
  if (!textarea) return;

  const text = textarea.value.trim();
  if (!text) { showToast('⚠️ Nhập nội dung bình luận!'); return; }

  // Disable nút gửi khi đang gửi
  if (sendBtn) sendBtn.disabled = true;

  try {
    const commentsRef = collection(
      db,
      `users/${storyOwnerId}/novels/${storyData.id}/comments`
    );

    await addDoc(commentsRef, {
      text,
      paragraphIndex: paraIndex,          // index đoạn văn
      authorUid:    currentUser.uid,
      authorName:   currentUser.displayName || 'Ẩn danh',
      authorPhoto:  currentUser.photoURL   || '',
      createdAt:    serverTimestamp(),
    });

    // Xóa input sau khi gửi thành công
    textarea.value = '';
    textarea.style.height = 'auto';

    // Mở section comments để thấy comment mới
    openComments(paraIndex);

  } catch (err) {
    console.error('Lỗi gửi comment:', err);
    showToast('❌ Lỗi: ' + err.message);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
};

/* ═══════════════════════════════════════════════════════════════
   UI: Toggle hiện/ẩn section comments của một đoạn
═══════════════════════════════════════════════════════════════ */
window.toggleComments = (paraIndex) => {
  const section = $(`comments-${paraIndex}`);
  if (!section) return;
  if (section.classList.contains('open')) {
    section.classList.remove('open');
  } else {
    openComments(paraIndex);
  }
};

function openComments(paraIndex) {
  const section = $(`comments-${paraIndex}`);
  if (!section) return;
  section.classList.add('open');
  // Focus textarea nếu đã đăng nhập
  const ta = $(`cinput-${paraIndex}`);
  if (ta) setTimeout(() => ta.focus(), 150);
}

/* ═══════════════════════════════════════════════════════════════
   READING SETTINGS: Cỡ chữ, giãn dòng, theme
═══════════════════════════════════════════════════════════════ */

// Toggle panel settings
window.toggleSettings = () => {
  const panel = $('settingsPanel');
  const btn   = $('settingsBtn');
  panel.classList.toggle('open');
  if (btn) btn.classList.toggle('active', panel.classList.contains('open'));
};

// Đóng settings khi click ra ngoài
document.addEventListener('click', e => {
  const panel = $('settingsPanel');
  const btn   = $('settingsBtn');
  if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
    panel.classList.remove('open');
    if (btn) btn.classList.remove('active');
  }
});

window.updateFontSize = (val) => {
  document.documentElement.style.setProperty('--read-font-size', val + 'px');
  const v = $('fontVal'); if (v) v.textContent = val + 'px';
  localStorage.setItem('vtc_read_font', val);
};

window.updateLineHeight = (val) => {
  const rounded = parseFloat(val).toFixed(1);
  document.documentElement.style.setProperty('--read-line-height', rounded);
  const v = $('lineVal'); if (v) v.textContent = rounded;
  localStorage.setItem('vtc_read_line', rounded);
};

window.setTheme = (theme) => {
  document.body.className = theme === 'dark' ? '' : `theme-${theme}`;
  document.querySelectorAll('.sp-bg-btn').forEach(b => b.classList.remove('active'));
  const btn = $('theme' + theme.charAt(0).toUpperCase() + theme.slice(1));
  if (btn) btn.classList.add('active');
  localStorage.setItem('vtc_read_theme', theme);
};

function restoreSettings() {
  const font  = localStorage.getItem('vtc_read_font');
  const line  = localStorage.getItem('vtc_read_line');
  const theme = localStorage.getItem('vtc_read_theme') || 'dark';

  if (font) {
    const sl = $('fontSlider'); if (sl) sl.value = font;
    updateFontSize(font);
  }
  if (line) {
    const sl = $('lineSlider'); if (sl) sl.value = line;
    updateLineHeight(line);
  }
  setTheme(theme);
}

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════ */

/** Escape HTML */
function escHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Format Firestore Timestamp → string */
function formatTime(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('vi', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) { return ''; }
}

/** Hiện lỗi trong reader area */
function showError(msg, withBack = false) {
  const back = withBack ? '<br><a href="stories.html" style="color:var(--accent)">← Quay lại danh sách</a>' : '';
  $('readerWrap').innerHTML =
    `<div class="state-msg">
      <div class="icon">⚠️</div>
      <p>${msg}${back}</p>
    </div>`;
  document.title = 'Lỗi · 云书阁';
}

/** Toast notification */
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
