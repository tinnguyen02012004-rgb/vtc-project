// ============================================================
// File: js/modules/filter.js
// Mô tả: Logic lọc, tìm kiếm và sắp xếp novels.
// Export: getFiltered, getSorted, filterStatus, setView
// ============================================================

import { state }     from './state.js';
import { renderAll } from './ui.js';

// ── Lấy danh sách novels đã lọc ───────────────────────────
export function getFiltered() {
  const q  = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const gf = document.getElementById('genreFilter')?.value || '';

  return state.novels.filter(n => {
    const matchStatus = state.currentFilter === 'all' || n.status === state.currentFilter;
    const matchQuery  = !q
      || n.title.toLowerCase().includes(q)
      || (n.author || '').toLowerCase().includes(q)
      || (n.genres || []).some(g => g.toLowerCase().includes(q));
    const matchGenre  = !gf || (n.genres || []).includes(gf);
    return matchStatus && matchQuery && matchGenre;
  });
}

// ── Sắp xếp mảng novels ───────────────────────────────────
export function getSorted(arr) {
  const s = document.getElementById('sortSelect')?.value || 'date-desc';
  return [...arr].sort((a, b) => {
    switch (s) {
      case 'date-desc':   return (b.addedAt  || 0) - (a.addedAt  || 0);
      case 'date-asc':    return (a.addedAt  || 0) - (b.addedAt  || 0);
      case 'rating-desc': return (b.rating   || 0) - (a.rating   || 0);
      case 'title-asc':   return (a.title    || '').localeCompare(b.title || '', 'vi');
      default:            return 0;
    }
  });
}

// ── Đổi filter khi bấm tab nav ────────────────────────────
export function filterStatus(btn, filter) {
  state.currentFilter = filter;
  document.querySelectorAll('#statusNav button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAll();
}

// ── Đổi chế độ xem grid / list ───────────────────────────
export function setView(mode, btn) {
  state.viewMode = mode;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAll();
}
