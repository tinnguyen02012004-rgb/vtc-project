// ============================================================
// File: js/modules/ui.js
// Mô tả: Tất cả hàm render giao diện:
//        - renderAll()    : render danh sách cards
//        - cardHtml()     : template một novel card
//        - openDetail()   : mở modal chi tiết
//        - switchTab()    : chuyển tab trong detail
//        - closeModal()   : đóng modal
//        - showToast()    : hiện thông báo
//        - addQuote()     : thêm câu nói hay
//        - deleteQuote()  : xóa câu nói hay
// ============================================================

import { state, genId }               from './state.js';
import { getFiltered, getSorted }     from './filter.js';
import { saveToDb, deleteFromDb }     from './db.js';

// ── Render toàn bộ danh sách ──────────────────────────────
export function renderAll() {
  const filtered = getSorted(getFiltered());

  const stMap = {
    reading: ['status-reading', 'Đang Đọc'],
    done:    ['status-done',    'Đã Đọc'],
    plan:    ['status-plan',    'Dự Định'],
    dropped: ['status-dropped', 'Bỏ Dở'],
  };
  const secMeta = {
    reading: { label: '📖 Đang Đọc',    color: 'var(--accent)' },
    done:    { label: '✅ Đã Đọc Xong', color: 'var(--accent2)' },
    plan:    { label: '🔖 Dự Định',      color: 'var(--accent3)' },
    dropped: { label: '💔 Bỏ Dở',        color: 'var(--text-muted)' },
  };

  let html = '';

  if (state.currentFilter === 'all') {
    ['reading', 'done', 'plan', 'dropped'].forEach(st => {
      const items = filtered.filter(n => n.status === st);
      if (!items.length) return;
      const m = secMeta[st];
      html += `
        <div class="section-header">
          <div class="section-dot" style="color:${m.color};background:${m.color}"></div>
          <div class="section-title" style="color:${m.color}">${m.label}</div>
          <div class="section-line"></div>
          <div class="section-count">${items.length} truyện</div>
        </div>
        <div class="cards-grid ${state.viewMode === 'list' ? 'list-view' : ''}">
          ${items.map(n => cardHtml(n, stMap)).join('')}
        </div>`;
    });
  } else {
    if (!filtered.length) {
      html = `<div class="empty-state">
        <div class="empty-icon">📚</div>
        <div class="empty-text">Chưa có truyện nào. Nhấn <strong>+ Thêm</strong>!</div>
      </div>`;
    } else {
      html = `<div class="cards-grid ${state.viewMode === 'list' ? 'list-view' : ''}">
        ${filtered.map(n => cardHtml(n, stMap)).join('')}
      </div>`;
    }
  }

  // Welcome message nếu chưa có novel
  if (!state.novels.length) {
    html = `<div class="empty-state">
      <div class="empty-icon">🌿</div>
      <div class="empty-text" style="font-size:16px">
        Chào mừng đến <strong style="color:var(--accent)">Vân Thư Các</strong> 云书阁<br><br>
        Bắt đầu thêm truyện đầu tiên thôi! 🎉
      </div>
    </div>`;
  }

  const bc = document.getElementById('booksContainer');
  if (bc) bc.innerHTML = html;
}

// ── Template một novel card ───────────────────────────────
export function cardHtml(n, stMap) {
  const [stC, stT] = stMap[n.status] || ['', ''];
  const stars = '★'.repeat(n.rating || 0) + '☆'.repeat(5 - (n.rating || 0));
  const pct   = n.chapters
    ? Math.min(100, Math.round(((n.chapread || 0) / n.chapters) * 100))
    : 0;
  const cov = n.cover
    ? `<img src="${n.cover}" onerror="this.parentElement.innerHTML='${n.emoji || '📖'}'"`  + `>`
    : (n.emoji || '📖');
  const gT = (n.genres || []).slice(0, 2).map(t => `<span class="tag genre">${t}</span>`).join('');
  const pT = (n.pairs  || []).slice(0, 1).map(t => `<span class="tag jade">${t}</span>`).join('');
  const col = n.status === 'reading' ? 'var(--accent)'
    : n.status === 'done'    ? 'var(--accent2)'
    : n.status === 'plan'    ? 'var(--accent3)'
    : 'var(--text-muted)';

  return `
    <div class="novel-card" onclick="openDetail('${n.id}')" style="--card-color:${col}">
      <span class="card-status ${stC}">${stT}</span>
      <div class="card-header">
        <div class="card-cover">${cov}</div>
        <div class="card-meta">
          <div class="card-title">${n.title}</div>
          <div class="card-author">${n.author ? '✦ ' + n.author : ''}</div>
          <div class="card-tags">${gT}${pT}</div>
        </div>
      </div>
      ${n.synopsis ? `<div class="card-desc">${n.synopsis}</div>` : ''}
      <div class="card-footer">
        <div><span class="stars">${stars}</span>
          <span class="rating-num">${n.rating ? n.rating + '/5' : ''}</span>
        </div>
        ${n.chapters ? `<div class="card-chapters">${n.chapread || 0}/${n.chapters} · ${pct}%</div>` : ''}
      </div>
      ${n.chapters && n.status === 'reading'
        ? `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>`
        : ''}
    </div>`;
}

// ── Mở modal chi tiết ─────────────────────────────────────
export function openDetail(id) {
  const n = state.novels.find(x => x.id === id);
  if (!n) return;

  const stM = { reading:'status-reading', done:'status-done', plan:'status-plan', dropped:'status-dropped' };
  const stL = { reading:'Đang Đọc', done:'Đã Đọc Xong', plan:'Dự Định', dropped:'Bỏ Dở' };
  const stars = '★'.repeat(n.rating || 0) + '☆'.repeat(5 - (n.rating || 0));
  const pct   = n.chapters ? Math.min(100, Math.round(((n.chapread || 0) / n.chapters) * 100)) : 0;

  const cov = n.cover
    ? `<div class="detail-cover"><img src="${n.cover}" onerror="this.parentElement.innerHTML='${n.emoji || '📖'}'"></div>`
    : `<div class="detail-cover">${n.emoji || '📖'}</div>`;

  const tags = [
    ...(n.genres || []).map(t => `<span class="tag genre">${t}</span>`),
    ...(n.pairs  || []).map(t => `<span class="tag jade">${t}</span>`),
  ].join('');

  const chH = (n.chars || []).length
    ? `<div class="chars-grid">${(n.chars || []).map(c => `
        <div class="char-card">
          <div class="char-avatar">${c.name[0] || '？'}</div>
          <div class="char-name">${c.name}</div>
          <div class="char-role">${c.role || ''}</div>
          <div class="char-desc">${c.desc || ''}</div>
        </div>`).join('')}</div>`
    : `<p style="color:var(--text-muted);font-size:12px">Chưa có nhân vật.</p>`;

  const qH = (n.quotes || []).length
    ? `<div class="quotes-list">${(n.quotes || []).map(q => `
        <div class="quote-item">
          <div class="quote-text">${q.text}</div>
          ${q.source ? `<div class="quote-source">— ${q.source}</div>` : ''}
          <div class="quote-actions">
            <button class="btn-sm danger" onclick="deleteQuote('${id}','${q.id}')">✕</button>
          </div>
        </div>`).join('')}</div>`
    : '';

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-header">
      ${cov}
      <div class="detail-info">
        <div class="detail-title">${n.title}</div>
        <div class="detail-author">${n.author ? '✦ ' + n.author : ''}</div>
        <div class="detail-tags">
          ${tags}
          <span class="card-status ${stM[n.status] || ''}">${stL[n.status] || ''}</span>
        </div>
        <div class="detail-rating">
          <span class="detail-stars">${stars}</span>
          <span class="detail-rating-num">${n.rating || '—'}</span>
          <span style="font-size:11px;color:var(--text-muted)">/5</span>
        </div>
        <div class="detail-meta-row">
          ${n.chapters ? `<div class="detail-meta-item"><strong>${n.chapread || 0}</strong>/${n.chapters} chương</div>` : ''}
          ${n.year     ? `<div class="detail-meta-item">📅 <strong>${n.year}</strong></div>` : ''}
        </div>
        ${n.chapters ? `
          <div class="progress-section">
            <div class="progress-label"><span>Tiến độ đọc</span><span>${pct}%</span></div>
            <div class="progress-full"><div class="progress-fill-full" style="width:${pct}%"></div></div>
          </div>` : ''}
        <div class="detail-actions">
          <button class="btn-sm primary" onclick="closeModal('detailModal');openAddModal('${id}')">✏ Sửa</button>
          <button class="btn-sm danger"  onclick="deleteNovel('${id}')">🗑 Xóa</button>
        </div>
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;padding:3px 1.8rem 0">
      <div class="detail-tabs" style="flex:1;border-bottom:none">
        <button class="detail-tab active" onclick="switchTab(this,'t-s')">📜 Nội Dung</button>
        <button class="detail-tab"        onclick="switchTab(this,'t-c')">👥 Nhân Vật</button>
        <button class="detail-tab"        onclick="switchTab(this,'t-q')">💬 Câu Hay</button>
        <button class="detail-tab"        onclick="switchTab(this,'t-r')">⭐ Cảm Nhận</button>
      </div>
      <button class="close-btn" style="margin-right:1.4rem;flex-shrink:0" onclick="closeModal('detailModal')">✕</button>
    </div>
    <div style="height:1px;background:var(--border);margin:0 1.8rem"></div>

    <div class="detail-panel active" id="t-s">
      <p class="synopsis">${n.synopsis || '<em style="color:var(--text-muted)">Chưa có tóm tắt.</em>'}</p>
    </div>
    <div class="detail-panel" id="t-c">${chH}</div>
    <div class="detail-panel" id="t-q">
      ${qH}
      <div class="add-quote-form" style="margin-top:${(n.quotes || []).length ? '12px' : '0'}">
        <textarea id="qt-text" placeholder="Nhập câu nói hay..."></textarea>
        <input    id="qt-src"  placeholder="Nguồn (nhân vật, chương...)">
        <div style="margin-top:9px;display:flex;justify-content:flex-end">
          <button class="btn-sm primary" onclick="addQuote('${id}')">+ Thêm</button>
        </div>
      </div>
    </div>
    <div class="detail-panel" id="t-r">
      <p class="review-area">${n.review || '<em style="color:var(--text-muted)">Chưa có cảm nhận.</em>'}</p>
    </div>`;

  document.getElementById('detailModal').classList.add('open');
}

// ── Chuyển tab trong detail modal ─────────────────────────
export function switchTab(btn, tabId) {
  document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.detail-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const p = document.getElementById(tabId);
  if (p) p.classList.add('active');
}

// ── Đóng modal ────────────────────────────────────────────
export function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ── Toast notification ────────────────────────────────────
export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Thêm câu nói hay ──────────────────────────────────────
export async function addQuote(id) {
  const n = state.novels.find(x => x.id === id);
  if (!n) return;
  const text = document.getElementById('qt-text').value.trim();
  const src  = document.getElementById('qt-src').value.trim();
  if (!text) { showToast('⚠ Nhập nội dung câu nói!'); return; }

  await saveToDb({ ...n, quotes: [...(n.quotes || []), { id: genId(), text, source: src || '' }] });
  openDetail(id);
  showToast('💬 Đã thêm!');
}

// ── Xóa câu nói hay ───────────────────────────────────────
export async function deleteQuote(novelId, qId) {
  const n = state.novels.find(x => x.id === novelId);
  if (!n) return;
  await saveToDb({ ...n, quotes: (n.quotes || []).filter(q => q.id !== qId) });
  openDetail(novelId);
}
