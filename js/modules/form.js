// ============================================================
// File: js/modules/form.js
// Mô tả: Xử lý form thêm/sửa novel:
//        - openAddModal()  : mở form
//        - saveNovel()     : lưu vào Firestore
//        - deleteNovel()   : xóa khỏi Firestore
//        - handleTagKey()  : thêm tag khi Enter/comma
//        - removeTag()     : xóa tag pill
//        - setRating()     : chọn sao đánh giá
//        - renderPills()   : render tag pills trong wrap
// ============================================================

import { state, genId, randomEmoji } from './state.js';
import { saveToDb, deleteFromDb }    from './db.js';
import { closeModal, showToast, openDetail } from './ui.js';

// ── Mở form thêm mới / sửa ────────────────────────────────
export function openAddModal(id = null) {
  state.editId        = id;
  state.currentRating = 0;
  state.genreTags     = [];
  state.pairTags      = [];

  document.getElementById('formTitle').textContent = id ? 'Chỉnh Sửa' : 'Thêm Truyện Mới';

  // Reset tất cả input
  ['title','author','chapters','chapread','cover','synopsis','chars','review','year'].forEach(f => {
    const el = document.getElementById('f-' + f);
    if (el) el.value = '';
  });
  document.getElementById('f-status').value = 'plan';
  document.querySelectorAll('#starPicker span').forEach(s => s.classList.remove('on'));
  renderPills('genreTagWrap', state.genreTags, 'genre', 'genreTagInput');
  renderPills('pairTagWrap',  state.pairTags,  'pair',  'pairTagInput');

  // Điền dữ liệu nếu đang edit
  if (id) {
    const n = state.novels.find(x => x.id === id);
    if (n) {
      ['title','author','synopsis','review'].forEach(f => {
        const el = document.getElementById('f-' + f);
        if (el) el.value = n[f] || '';
      });
      document.getElementById('f-status').value   = n.status   || 'plan';
      document.getElementById('f-chapters').value = n.chapters || '';
      document.getElementById('f-chapread').value = n.chapread || '';
      document.getElementById('f-cover').value    = n.cover    || '';
      document.getElementById('f-year').value     = n.year     || '';
      document.getElementById('f-chars').value    = (n.chars || [])
        .map(c => `${c.name}|${c.role}|${c.desc}`).join('\n');

      state.genreTags = [...(n.genres || [])];
      state.pairTags  = [...(n.pairs  || [])];
      renderPills('genreTagWrap', state.genreTags, 'genre', 'genreTagInput');
      renderPills('pairTagWrap',  state.pairTags,  'pair',  'pairTagInput');
      setRating(n.rating || 0);
    }
  }

  document.getElementById('addModal').classList.add('open');
}

// ── Lưu novel ─────────────────────────────────────────────
export async function saveNovel() {
  const title = document.getElementById('f-title').value.trim();
  if (!title) { showToast('⚠ Nhập tên truyện!'); return; }

  const charsRaw = document.getElementById('f-chars').value.trim();
  const chars = charsRaw
    ? charsRaw.split('\n').filter(Boolean).map(line => {
        const p = line.split('|').map(s => s.trim());
        return { name: p[0] || '', role: p[1] || '', desc: p[2] || '' };
      })
    : [];

  const ex = state.editId ? state.novels.find(x => x.id === state.editId) : null;

  const novel = {
    id:       state.editId || genId(),
    title,
    author:   document.getElementById('f-author').value.trim(),
    status:   document.getElementById('f-status').value,
    chapters: parseInt(document.getElementById('f-chapters').value) || 0,
    chapread: parseInt(document.getElementById('f-chapread').value) || 0,
    cover:    document.getElementById('f-cover').value.trim(),
    synopsis: document.getElementById('f-synopsis').value.trim(),
    chars,
    review:   document.getElementById('f-review').value.trim(),
    year:     document.getElementById('f-year').value.trim(),
    rating:   state.currentRating,
    genres:   [...state.genreTags],
    pairs:    [...state.pairTags],
    quotes:   ex ? (ex.quotes || []) : [],
    emoji:    ex ? (ex.emoji || randomEmoji()) : randomEmoji(),
    addedAt:  ex ? (ex.addedAt || Date.now()) : Date.now(),
  };

  try {
    await saveToDb(novel);
    closeModal('addModal');
    showToast(state.editId ? '✅ Đã cập nhật!' : '✨ Đã thêm truyện!');
  } catch (_) {
    // Lỗi đã toast trong saveToDb
  }
}

// ── Xóa novel ─────────────────────────────────────────────
export async function deleteNovel(id) {
  if (!confirm('Xóa truyện này?')) return;
  await deleteFromDb(id);
  closeModal('detailModal');
  showToast('🗑 Đã xóa.');
}

// ── Xử lý nhập tag (Enter / dấu phẩy) ────────────────────
export function handleTagKey(e, type) {
  if (e.key !== 'Enter' && e.key !== ',') return;
  e.preventDefault();
  const val = e.target.value.trim();
  if (!val) return;

  if (type === 'genre') {
    if (!state.genreTags.includes(val)) {
      state.genreTags.push(val);
      renderPills('genreTagWrap', state.genreTags, 'genre', 'genreTagInput');
    }
  } else {
    if (!state.pairTags.includes(val)) {
      state.pairTags.push(val);
      renderPills('pairTagWrap', state.pairTags, 'pair', 'pairTagInput');
    }
  }
  e.target.value = '';
}

// ── Xóa một tag ───────────────────────────────────────────
export function removeTag(type, idx) {
  if (type === 'genre') {
    state.genreTags.splice(idx, 1);
    renderPills('genreTagWrap', state.genreTags, 'genre', 'genreTagInput');
  } else {
    state.pairTags.splice(idx, 1);
    renderPills('pairTagWrap', state.pairTags, 'pair', 'pairTagInput');
  }
}

// ── Render tag pills trong wrapper ───────────────────────
export function renderPills(wrapId, arr, type, inputId) {
  const wrap  = document.getElementById(wrapId);
  const input = document.getElementById(inputId);
  wrap.innerHTML = '';
  arr.forEach((t, i) => {
    const pill = document.createElement('span');
    pill.className = 'tag-pill';
    pill.innerHTML = `${t}<button onclick="removeTag('${type}',${i})">✕</button>`;
    wrap.appendChild(pill);
  });
  wrap.appendChild(input);
  input.focus();
}

// ── Chọn sao đánh giá ─────────────────────────────────────
export function setRating(n) {
  state.currentRating = n;
  document.querySelectorAll('#starPicker span')
    .forEach((s, i) => s.classList.toggle('on', i < n));
}
