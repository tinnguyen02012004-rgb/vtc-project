// ============================================================
// File: js/modules/stats.js
// Mô tả: Cập nhật các số liệu thống kê trên header:
//        - Tổng, điểm TB, câu hay, thể loại
//        - Badge count trên từng tab nav
//        - Dropdown lọc thể loại
// ============================================================

import { state } from './state.js';

export function updateStats() {
  const novels = state.novels;

  // Tổng số truyện
  document.getElementById('s-total').textContent = novels.length;

  // Điểm trung bình
  const rated = novels.filter(n => n.rating);
  document.getElementById('s-avg').textContent = rated.length
    ? (rated.reduce((acc, n) => acc + (n.rating || 0), 0) / rated.length).toFixed(1)
    : '—';

  // Tổng câu nói hay
  document.getElementById('s-quotes').textContent =
    novels.reduce((acc, n) => acc + (n.quotes || []).length, 0);

  // Số thể loại duy nhất
  const genres = new Set(novels.flatMap(n => n.genres || []));
  document.getElementById('s-genres').textContent = genres.size;

  // Badge count trên từng tab
  ['all', 'reading', 'done', 'plan', 'dropped'].forEach(s => {
    const count = s === 'all' ? novels.length : novels.filter(n => n.status === s).length;
    const el    = document.getElementById('cnt-' + s);
    if (el) el.textContent = count;
  });

  // Rebuild dropdown lọc thể loại
  const gSel = document.getElementById('genreFilter');
  if (!gSel) return;
  const current = gSel.value; // giữ lại lựa chọn đang chọn
  gSel.innerHTML = '<option value="">Tất cả thể loại</option>';
  [...genres].sort().forEach(g => {
    const opt = document.createElement('option');
    opt.value = g; opt.textContent = g;
    gSel.appendChild(opt);
  });
  gSel.value = current;
}
