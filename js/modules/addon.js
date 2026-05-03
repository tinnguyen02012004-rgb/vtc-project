/**
 * File: js/addon.js
 * Mô tả: JavaScript bổ sung — Vân Thư Các v3 ADDON
 * 👉 Dán vào cuối <body> của index.html, SAU tất cả <script> hiện tại:
 *    <script src="js/addon.js"></script>
 */

/* ═══════════════════════════════════════════
   1. PAGE LOADER
═══════════════════════════════════════════ */
window.addEventListener('load', function () {
  setTimeout(function () {
    var loader = document.getElementById('vtcPageLoader');
    if (!loader) return;
    loader.classList.add('hidden');
    setTimeout(function () { loader.style.display = 'none'; }, 500);
  }, 900);
});

/* ═══════════════════════════════════════════
   2. FAB BUTTONS INJECT vào .h-right
═══════════════════════════════════════════ */
(function injectFabs() {
  var hRight = document.querySelector('.h-right');
  if (!hRight) return;
  var g = document.createElement('div');
  g.className = 'vtc-fab-group';
  g.innerHTML =
    '<button class="vtc-fab" onclick="openWriteStory()" title="Viết truyện">✍️ Viết</button>' +
    '<button class="vtc-fab" onclick="openEpub()"       title="EPUB">📚 EPUB</button>' +
    '<button class="vtc-fab" onclick="openRank()"       title="Xếp hạng">🏆 Xếp Hạng</button>';
  hRight.insertBefore(g, hRight.firstChild);
})();

/* ═══════════════════════════════════════════
   3. MUSIC PLAYER UPGRADE
   Drag handle + waveform + progress bar
═══════════════════════════════════════════ */
(function upgradeMusicPlayer() {
  var player = document.getElementById('musicPlayer');
  if (!player) return;

  /* Drag handle */
  var handle = document.createElement('div');
  handle.className = 'music-drag-handle';
  handle.title = 'Kéo để di chuyển';
  player.insertBefore(handle, player.firstChild);

  /* Waveform 16 bars */
  var wave = document.createElement('div');
  wave.className = 'music-wave'; wave.id = 'musicWave';
  var bars = '';
  for (var i = 0; i < 16; i++) {
    bars += '<span style="height:' + (2 + Math.random() * 6).toFixed(1) + 'px;' +
            'animation-delay:' + (i * 0.06).toFixed(2) + 's"></span>';
  }
  wave.innerHTML = bars;
  var playlist = document.getElementById('musicPlaylist');
  if (playlist) player.insertBefore(wave, playlist);

  /* Progress bar */
  var pw = document.createElement('div');
  pw.className = 'music-progress-wrap'; pw.id = 'musicProgressWrap';
  pw.innerHTML = '<div class="music-progress-bar" id="musicProgressBar"></div>' +
                 '<div class="music-progress-thumb"></div>';
  var controls = player.querySelector('.music-controls');
  if (controls) controls.after(pw);

  /* Time display */
  var td = document.createElement('div');
  td.className = 'music-time';
  td.innerHTML = '<span id="mtCurrent">0:00</span><span id="mtTotal">0:00</span>';
  pw.after(td);

  /* Seek on click */
  pw.addEventListener('click', function (e) {
    var rect = this.getBoundingClientRect();
    var bar = document.getElementById('musicProgressBar');
    if (bar) bar.style.width = Math.min(100, Math.max(0,
      (e.clientX - rect.left) / rect.width * 100)) + '%';
  });

  /* Waveform sync */
  function syncWave() {
    var btn = document.getElementById('playBtn');
    var wv  = document.getElementById('musicWave');
    if (wv && btn) wv.classList.toggle('playing', btn.textContent.trim() === '⏸');
  }
  var playBtn = document.getElementById('playBtn');
  if (playBtn) new MutationObserver(syncWave).observe(playBtn, { childList: true, subtree: true });
  var origPP = window.playPause;
  if (typeof origPP === 'function') {
    window.playPause = function () { origPP(); setTimeout(syncWave, 80); };
  }

  /* Drag to move */
  var isDragging = false, ox = 0, oy = 0;
  handle.addEventListener('mousedown', function (e) {
    isDragging = true; player.classList.add('dragging');
    var r = player.getBoundingClientRect();
    ox = e.clientX - r.left; oy = e.clientY - r.top;
    player.style.transition = 'none';
  });
  handle.addEventListener('touchstart', function (e) {
    isDragging = true; player.classList.add('dragging');
    var r = player.getBoundingClientRect();
    ox = e.touches[0].clientX - r.left; oy = e.touches[0].clientY - r.top;
    player.style.transition = 'none';
  }, { passive: true });
  function doDrag(cx, cy) {
    if (!isDragging) return;
    player.style.left   = Math.min(Math.max(0, cx - ox), window.innerWidth  - player.offsetWidth)  + 'px';
    player.style.top    = Math.min(Math.max(0, cy - oy), window.innerHeight - player.offsetHeight) + 'px';
    player.style.bottom = 'auto';
  }
  document.addEventListener('mousemove', function (e) { doDrag(e.clientX, e.clientY); });
  document.addEventListener('touchmove', function (e) { doDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  function endDrag() {
    if (!isDragging) return;
    isDragging = false; player.classList.remove('dragging'); player.style.transition = '';
    localStorage.setItem('vtc_player_pos', JSON.stringify({ left: player.style.left, top: player.style.top }));
  }
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);

  /* Restore position */
  try {
    var s = JSON.parse(localStorage.getItem('vtc_player_pos') || 'null');
    if (s && s.left) { player.style.left = s.left; player.style.top = s.top; player.style.bottom = 'auto'; }
  } catch (e) {}
})();

/* ═══════════════════════════════════════════
   4. PAGINATION
   Tự động phân trang khi có > 12 cards
═══════════════════════════════════════════ */
(function initPagination() {
  var PER_PAGE = 12, currentPage = 1, allCards = [];
  var bc = document.getElementById('booksContainer');
  if (!bc) return;

  new MutationObserver(function () {
    allCards = Array.from(bc.querySelectorAll('.novel-card'));
    if (allCards.length > PER_PAGE) applyPagination();
    else removePagination();
  }).observe(bc, { childList: true });

  function applyPagination() {
    var total = Math.ceil(allCards.length / PER_PAGE);
    if (currentPage > total) currentPage = 1;
    allCards.forEach(function (c, i) {
      c.style.display = (i >= (currentPage-1)*PER_PAGE && i < currentPage*PER_PAGE) ? '' : 'none';
    });
    renderPgUI(total);
  }
  function removePagination() {
    allCards.forEach(function (c) { c.style.display = ''; });
    var pg = document.getElementById('vtcPagination'); if (pg) pg.remove();
  }
  function renderPgUI(total) {
    var pg = document.getElementById('vtcPagination');
    if (!pg) { pg = document.createElement('div'); pg.id = 'vtcPagination'; pg.className = 'vtc-pagination'; bc.after(pg); }
    if (total <= 1) { pg.innerHTML = ''; return; }
    function btn(label, page, dis, act) {
      return '<button class="vtc-pg-btn' + (act?' active':'') + '" ' + (dis?'disabled':'') +
             ' onclick="vtcGoPage(' + page + ')">' + label + '</button>';
    }
    var h = btn('‹', currentPage-1, currentPage===1);
    for (var i=1; i<=total; i++) {
      if (i===1||i===total||Math.abs(i-currentPage)<=2) h += btn(i,i,false,i===currentPage);
      else if (Math.abs(i-currentPage)===3) h += '<span class="vtc-pg-ellipsis">…</span>';
    }
    h += btn('›', currentPage+1, currentPage===total);
    h += '<span class="vtc-pg-info">' + allCards.length + ' truyện · ' + currentPage + '/' + total + '</span>';
    pg.innerHTML = h;
  }
  window.vtcGoPage = function (p) {
    currentPage = p;
    bc.classList.add('page-transition');
    setTimeout(function () { bc.classList.remove('page-transition'); }, 300);
    allCards = Array.from(bc.querySelectorAll('.novel-card'));
    applyPagination();
    bc.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
})();

/* ═══════════════════════════════════════════
   5. WRITE STORY
═══════════════════════════════════════════ */
var WS_KEY = 'vtc_write_stories', wsEditId = null;
function wsLoad() { try { return JSON.parse(localStorage.getItem(WS_KEY)||'[]'); } catch(e) { return []; } }
function wsSave_(a) { localStorage.setItem(WS_KEY, JSON.stringify(a)); }

window.openWriteStory = function (id) {
  wsEditId = id || null;
  var ov = document.getElementById('writeStoryOverlay'); if (!ov) return;
  ov.classList.add('open'); requestAnimationFrame(function () { ov.classList.add('visible'); });
  var t = document.getElementById('wsTitle');
  var ch = document.getElementById('wsChapter');
  var ct = document.getElementById('wsContent');
  if (wsEditId) {
    var s = wsLoad().find(function (x) { return x.id === wsEditId; });
    if (s) { t.value = s.title||''; ch.value = s.chapter||''; ct.value = s.content||''; }
  } else { t.value = ''; ch.value = ''; ct.value = ''; }
  wsSwitch('write'); wsUpdateStats();
};
window.closeWriteStory = function () {
  var ov = document.getElementById('writeStoryOverlay');
  ov.classList.remove('visible'); setTimeout(function () { ov.classList.remove('open'); }, 300);
};
window.wsSwitch = function (pane) {
  document.querySelectorAll('.ws-tab').forEach(function (t) { t.classList.remove('active'); });
  document.querySelectorAll('.ws-pane').forEach(function (p) { p.classList.remove('active'); });
  var cap = pane.charAt(0).toUpperCase() + pane.slice(1);
  var tab = document.getElementById('wsTab'+cap); if (tab) tab.classList.add('active');
  var pe  = document.getElementById('wsPane'+cap); if (pe) pe.classList.add('active');
  if (pane === 'list') wsRenderList();
};
window.wsNewStory = function () {
  if (!confirm('Xóa draft hiện tại?')) return;
  document.getElementById('wsTitle').value = '';
  document.getElementById('wsChapter').value = '';
  document.getElementById('wsContent').value = '';
  wsEditId = null; wsUpdateStats();
};
window.wsSave = function () {
  var title   = (document.getElementById('wsTitle')  ||{}).value||'';
  var chapter = (document.getElementById('wsChapter')||{}).value||'';
  var content = (document.getElementById('wsContent')||{}).value||'';
  title = title.trim(); content = content.trim();
  if (!title)   { alert('Nhập tiêu đề truyện!'); return; }
  if (!content) { alert('Chưa có nội dung!');    return; }
  var stories = wsLoad(), now = new Date().toLocaleDateString('vi');
  if (wsEditId) {
    var idx = stories.findIndex(function (x) { return x.id === wsEditId; });
    if (idx >= 0) stories[idx] = Object.assign({}, stories[idx], { title: title, chapter: chapter, content: content, updatedAt: now });
  } else {
    wsEditId = Date.now().toString(36);
    stories.unshift({ id: wsEditId, title: title, chapter: chapter, content: content, createdAt: now, updatedAt: now });
  }
  wsSave_(stories); vtcToast('💾 Đã lưu truyện!');
};
window.wsPublish = function () {
  window.wsSave();
  var title   = (document.getElementById('wsTitle')  ||{}).value||'Truyện';
  var chapter = (document.getElementById('wsChapter')||{}).value||'';
  var content = (document.getElementById('wsContent')||{}).value||'';
  var text = title + '\n' + (chapter?chapter+'\n':'') + '\n' + content;
  var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a'); a.href = url; a.download = title + '.txt'; a.click();
  URL.revokeObjectURL(url);
};
window.wsDeleteStory = function (id) {
  if (!confirm('Xóa truyện này?')) return;
  wsSave_(wsLoad().filter(function (x) { return x.id !== id; }));
  if (wsEditId === id) wsEditId = null; wsRenderList();
};
function wsRenderList() {
  var list = document.getElementById('wsStoryList'); if (!list) return;
  var stories = wsLoad();
  if (!stories.length) {
    list.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--text-muted)"><div style="font-size:36px;opacity:0.3;margin-bottom:10px">✍️</div><div style="font-size:13px">Chưa có truyện nào. Bắt đầu viết thôi!</div></div>';
    return;
  }
  list.innerHTML = stories.map(function (s) {
    var words = (s.content||'').trim().split(/\s+/).filter(Boolean).length;
    var prev  = (s.content||'').replace(/\n+/g,' ').slice(0,120);
    return '<div class="ws-story-card">' +
      '<div class="ws-story-actions">' +
        '<button class="ws-btn" onclick="openWriteStory(\'' + s.id + '\')">✏</button>' +
        '<button class="ws-btn danger" onclick="wsDeleteStory(\'' + s.id + '\')">🗑</button>' +
      '</div>' +
      '<div class="ws-story-title">' + s.title + '</div>' +
      '<div class="ws-story-meta">' +
        (s.chapter ? '<span>📑 ' + s.chapter + '</span>' : '') +
        '<span>📝 ' + words + ' từ</span>' +
        '<span>🕐 ' + (s.updatedAt||'') + '</span>' +
      '</div>' +
      '<div class="ws-story-preview">' + prev + (prev.length>=120?'…':'') + '</div>' +
    '</div>';
  }).join('');
}
function wsUpdateStats() {
  var txt = (document.getElementById('wsContent')||{}).value || '';
  var words = txt.trim() ? txt.trim().split(/\s+/).length : 0;
  var wc = document.getElementById('wsWordCount');
  var cc = document.getElementById('wsCharCount');
  var rt = document.getElementById('wsReadTime');
  if (wc) wc.textContent = words + ' từ';
  if (cc) cc.textContent = txt.length + ' ký tự';
  if (rt) rt.textContent = '~' + Math.max(1, Math.ceil(words/200)) + ' phút đọc';
}
var wsEl = document.getElementById('wsContent');
if (wsEl) wsEl.addEventListener('input', wsUpdateStats);

/* Toolbar actions */
window.wsFormat = function (cmd) {
  var ta = document.getElementById('wsContent'); if (!ta) return;
  var s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e);
  var m = { bold:['**','**'], italic:['*','*'], underline:['__','__'] }[cmd] || ['',''];
  ta.setRangeText(m[0]+sel+m[1], s, e, 'select'); wsUpdateStats();
};
window.wsInsertHR      = function () { wsIns('\n\n────────────────────\n\n'); };
window.wsInsertQuote   = function () { wsIns('\n\n❝ …trích dẫn… ❞\n\n'); };
window.wsInsertScene   = function () { wsIns('\n\n※ ※ ※\n\n'); };
window.wsInsertDiamond = function () { wsIns('\n\n◆ ◆ ◆\n\n'); };
function wsIns(text) {
  var ta = document.getElementById('wsContent'); if (!ta) return;
  ta.setRangeText(text, ta.selectionStart, ta.selectionStart, 'end'); wsUpdateStats();
}
var wsPreviewOn = false;
window.wsTogglePreview = function () {
  wsPreviewOn = !wsPreviewOn;
  var ta = document.getElementById('wsContent');
  var pv = document.getElementById('wsPreviewArea');
  var btn = document.getElementById('wsPreviewBtn');
  if (!ta || !pv) return;
  if (wsPreviewOn) {
    pv.style.display = 'block'; ta.style.display = 'none';
    if (btn) btn.textContent = '✏ Edit';
    pv.innerHTML = ta.value
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,'<em>$1</em>')
      .replace(/__(.*?)__/g,'<u>$1</u>')
      .replace(/❝(.*?)❞/g,'<blockquote style="border-left:3px solid var(--accent);padding:6px 14px;margin:10px 0;color:var(--text-sub);font-style:italic">❝$1❞</blockquote>')
      .replace(/─{4,}/g,'<hr style="border:none;border-top:1px solid var(--border);margin:16px 0">')
      .replace(/[※◆]{1,3}/g,'<div style="text-align:center;color:var(--text-muted);margin:14px 0">$&</div>')
      .replace(/\n/g,'<br>');
  } else { pv.style.display = 'none'; ta.style.display = ''; if (btn) btn.textContent = '👁 Preview'; }
};

/* ═══════════════════════════════════════════
   6. EPUB MANAGER
═══════════════════════════════════════════ */
var EPUB_KEY = 'vtc_epub_links';
function epubLoad() { try { return JSON.parse(localStorage.getItem(EPUB_KEY)||'[]'); } catch(e) { return []; } }
function epubSave(a) { localStorage.setItem(EPUB_KEY, JSON.stringify(a)); }

window.openEpub = function () {
  var ov = document.getElementById('epubOverlay'); if (!ov) return;
  ov.classList.add('open'); requestAnimationFrame(function () { ov.classList.add('visible'); });
  epubRender();
};
window.closeEpub = function () {
  var ov = document.getElementById('epubOverlay');
  ov.classList.remove('visible'); setTimeout(function () { ov.classList.remove('open'); }, 300);
};
window.epubAdd = function () {
  var name = ((document.getElementById('epubName')||{}).value||'').trim();
  var url  = ((document.getElementById('epubUrl') ||{}).value||'').trim();
  var note = ((document.getElementById('epubNote')||{}).value||'').trim();
  if (!url) { alert('Nhập link!'); return; }
  var list = epubLoad();
  list.unshift({ id: Date.now().toString(36), name: name||url, url: url, note: note, addedAt: new Date().toLocaleDateString('vi') });
  epubSave(list);
  document.getElementById('epubName').value = '';
  document.getElementById('epubUrl').value  = '';
  document.getElementById('epubNote').value = '';
  epubRender(); vtcToast('📚 Đã thêm!');
};
window.epubDelete = function (id) {
  if (!confirm('Xóa link này?')) return;
  epubSave(epubLoad().filter(function (x) { return x.id !== id; })); epubRender();
};
function epubRender() {
  var list = document.getElementById('epubList'); if (!list) return;
  var epubs = epubLoad();
  if (!epubs.length) {
    list.innerHTML = '<div class="epub-empty"><div class="epub-empty-icon">📚</div><div>Chưa có link nào!</div></div>'; return;
  }
  list.innerHTML = epubs.map(function (e) {
    return '<div class="epub-item">' +
      '<div class="epub-icon">📗</div>' +
      '<div class="epub-info">' +
        '<div class="epub-name">' + e.name + '</div>' +
        '<div class="epub-url">'  + e.url  + '</div>' +
        (e.note ? '<div class="epub-added">📝 ' + e.note + '</div>' : '') +
        '<div class="epub-added">🕐 ' + e.addedAt + '</div>' +
      '</div>' +
      '<div class="epub-actions">' +
        '<a href="' + e.url + '" target="_blank" class="epub-btn open-btn">🔗 Mở</a>' +
        '<a href="' + e.url + '" download class="epub-btn dl-btn">⬇ Tải</a>' +
        '<button class="epub-btn del-btn" onclick="epubDelete(\'' + e.id + '\')">🗑</button>' +
      '</div></div>';
  }).join('');
}

/* ═══════════════════════════════════════════
   7. RANKING PANEL
═══════════════════════════════════════════ */
var rankSeg = 'novel', rankSortKey = 'rating';
var LIKES_KEY = 'vtc_char_likes';
function getLikes() { try { return JSON.parse(localStorage.getItem(LIKES_KEY)||'{}'); } catch(e) { return {}; } }
function saveLikes(o) { localStorage.setItem(LIKES_KEY, JSON.stringify(o)); }

window.openRank = function () {
  var ov = document.getElementById('rankOverlay'); if (!ov) return;
  ov.classList.add('open'); requestAnimationFrame(function () { ov.classList.add('visible'); });
  rankRender();
};
window.closeRank = function () {
  var ov = document.getElementById('rankOverlay');
  ov.classList.remove('visible'); setTimeout(function () { ov.classList.remove('open'); }, 300);
};
window.rankSwitchSeg = function (seg, btn) {
  rankSeg = seg;
  document.querySelectorAll('.rank-seg-btn').forEach(function (b) { b.classList.remove('active'); });
  btn.classList.add('active');
  var sb = document.getElementById('rankSortBar');
  if (sb) sb.style.display = seg === 'novel' ? 'flex' : 'none';
  rankRender();
};
window.rankSort = function (key, btn) {
  rankSortKey = key;
  document.querySelectorAll('.rank-sort-btn').forEach(function (b) { b.classList.remove('active'); });
  btn.classList.add('active'); rankRender();
};
window.rankToggleLike = function (key, btn) {
  var likes = getLikes();
  likes[key] = !likes[key]; saveLikes(likes);
  btn.classList.toggle('liked', !!likes[key]);
  var h = btn.querySelector('.like-heart');
  var c = btn.querySelector('.like-count');
  if (h) h.textContent = likes[key] ? '❤️' : '🤍';
  if (c) c.textContent = Object.values(likes).filter(Boolean).length;
};
function rankRender() {
  var list = document.getElementById('rankList'); if (!list) return;
  rankSeg === 'novel' ? rankNovels(list) : rankChars(list);
}
function rankNovels(list) {
  var novels = getAppNovels();
  if (!novels.length) { list.innerHTML = '<div class="rank-empty">Chưa có truyện nào!</div>'; return; }
  var sorted = novels.slice();
  if (rankSortKey==='rating')   sorted.sort(function(a,b){return(b.rating||0)-(a.rating||0);});
  if (rankSortKey==='title')    sorted.sort(function(a,b){return(a.title||'').localeCompare(b.title||'','vi');});
  if (rankSortKey==='progress') sorted.sort(function(a,b){
    return ((b.chapters?(b.chapread||0)/b.chapters:0))-(a.chapters?(a.chapread||0)/a.chapters:0);});
  if (rankSortKey==='quotes')   sorted.sort(function(a,b){return(b.quotes||[]).length-(a.quotes||[]).length;});
  var medals=['🥇','🥈','🥉'];
  var bc=['r1','r2','r3','rN'];
  list.innerHTML = sorted.map(function(n,i){
    var stars='★'.repeat(n.rating||0)+'☆'.repeat(5-(n.rating||0));
    var pct=n.chapters?Math.min(100,Math.round(((n.chapread||0)/n.chapters)*100)):0;
    var gt=(n.genres||[]).slice(0,2).map(function(t){return'<span class="tag genre" style="font-size:9px">'+t+'</span>';}).join('');
    var cov=n.cover?'<div class="rank-cover-mini"><img src="'+n.cover+'" onerror="this.parentElement.innerHTML=\''+(n.emoji||'📖')+'\'"></div>':'<div class="rank-cover-mini">'+(n.emoji||'📖')+'</div>';
    var stIco={reading:'📖',done:'✅',plan:'🔖',dropped:'💔'}[n.status]||'';
    return '<div class="rank-item" data-rank="'+(i+1)+'" style="animation-delay:'+(i*0.04)+'s">'+
      '<div class="rank-badge '+(bc[Math.min(i,3)]||'rN')+'">'+(i<3?medals[i]:i+1)+'</div>'+cov+
      '<div class="rank-info"><div class="rank-title">'+n.title+'</div>'+
      '<div class="rank-sub">'+(n.author?'✦ '+n.author+' ':'')+stIco+(n.chapters?' · '+pct+'% đã đọc':'')+'</div>'+
      '<div class="rank-tags">'+gt+'</div></div>'+
      '<div class="rank-score"><div class="rank-score-num">'+(n.rating||'—')+'</div>'+
      '<div class="rank-score-stars">'+stars+'</div>'+
      '<div class="rank-score-label">'+(n.quotes||[]).length+' câu hay</div></div></div>';
  }).join('');
}
function rankChars(list) {
  var novels = getAppNovels();
  var likes = getLikes();
  var chars = [];
  novels.forEach(function(n){
    (n.chars||[]).forEach(function(c){
      var key=n.id+'_'+c.name;
      chars.push(Object.assign({},c,{novelTitle:n.title,key:key}));
    });
  });
  if (!chars.length) { list.innerHTML = '<div class="rank-empty">Chưa có nhân vật nào!</div>'; return; }
  chars.sort(function(a,b){return(likes[b.key]?1:0)-(likes[a.key]?1:0)||(a.name||'').localeCompare(b.name||'');});
  var medals=['🥇','🥈','🥉'];
  var bc=['r1','r2','r3','rN'];
  var total=Object.values(likes).filter(Boolean).length;
  list.innerHTML = chars.map(function(c,i){
    var liked=!!likes[c.key];
    return '<div class="char-rank-item" style="animation-delay:'+(i*0.04)+'s">'+
      '<div class="rank-badge '+(bc[Math.min(i,3)]||'rN')+'">'+(i<3?medals[i]:i+1)+'</div>'+
      '<div class="char-rank-avatar">'+((c.name||'?')[0])+'</div>'+
      '<div class="char-rank-info">'+
        '<div class="char-rank-name">'+c.name+'</div>'+
        '<div class="char-rank-novel">📖 '+c.novelTitle+'</div>'+
        '<div class="char-rank-role">'+(c.role||'')+'</div>'+
      '</div>'+
      '<button class="char-rank-like'+(liked?' liked':'')+'" onclick="rankToggleLike(\''+c.key+'\',this)">'+
        '<span class="like-heart">'+(liked?'❤️':'🤍')+'</span>'+
        '<span class="like-count">'+(liked?total:0)+'</span>'+
      '</button></div>';
  }).join('');
}
function getAppNovels() {
  try { if (window.__vtcNovels&&window.__vtcNovels.length) return window.__vtcNovels; } catch(e){}
  try { var c=localStorage.getItem('vtc_novels_cache'); if(c) return JSON.parse(c); } catch(e){}
  return [];
}

/* ═══════════════════════════════════════════
   8. NOVEL CACHE — sync mỗi 2 giây
═══════════════════════════════════════════ */
setInterval(function () {
  try {
    if (window.state && window.state.novels && window.state.novels.length) {
      window.__vtcNovels = window.state.novels;
      localStorage.setItem('vtc_novels_cache', JSON.stringify(window.state.novels));
    }
  } catch (e) {}
}, 2000);

/* ═══════════════════════════════════════════
   9. SCROLL REVEAL
═══════════════════════════════════════════ */
(function () {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  function obs() {
    document.querySelectorAll('.novel-card:not(.vtc-reveal),.stat-card:not(.vtc-reveal)').forEach(function (c) {
      c.classList.add('vtc-reveal'); io.observe(c);
    });
  }
  var bc = document.getElementById('booksContainer');
  if (bc) new MutationObserver(obs).observe(bc, { childList: true, subtree: true });
  obs();
})();

/* ═══════════════════════════════════════════
   10. CARD RIPPLE
═══════════════════════════════════════════ */
document.addEventListener('click', function (e) {
  var card = e.target.closest('.novel-card'); if (!card) return;
  var rect = card.getBoundingClientRect();
  var r = document.createElement('span'); r.className = 'vtc-ripple';
  var size = Math.max(rect.width, rect.height);
  r.style.cssText = 'width:'+size+'px;height:'+size+'px;left:'+(e.clientX-rect.left-size/2)+'px;top:'+(e.clientY-rect.top-size/2)+'px;';
  card.appendChild(r); setTimeout(function () { r.remove(); }, 550);
});

/* ═══════════════════════════════════════════
   11. SKELETON LOADER
═══════════════════════════════════════════ */
(function () {
  var bc = document.getElementById('booksContainer'); if (!bc) return;
  var t = null;
  new MutationObserver(function () {
    var hasCard = !!bc.querySelector('.novel-card');
    var hasEmpty = !!bc.querySelector('.empty-state');
    if (!hasCard && !hasEmpty) {
      clearTimeout(t);
      t = setTimeout(function () {
        if (!bc.querySelector('.novel-card') && !bc.querySelector('.empty-state')) {
          bc.innerHTML = Array(6).fill(0).map(function () {
            return '<div class="vtc-skeleton-card"><div class="vtc-sk-row">'+
              '<div class="vtc-skeleton vtc-sk-cover"></div>'+
              '<div style="flex:1;display:flex;flex-direction:column;gap:8px">'+
              '<div class="vtc-skeleton vtc-sk-line"></div>'+
              '<div class="vtc-skeleton vtc-sk-line short"></div>'+
              '<div class="vtc-skeleton vtc-sk-line xshort"></div>'+
              '</div></div>'+
              '<div class="vtc-skeleton vtc-sk-line"></div>'+
              '<div class="vtc-skeleton vtc-sk-line short"></div></div>';
          }).join('');
        }
      }, 300);
    } else { clearTimeout(t); }
  }).observe(bc, { childList: true });
})();

/* ═══════════════════════════════════════════
   12. TOAST HELPER
═══════════════════════════════════════════ */
function vtcToast(msg) {
  var t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 2800);
}

/* ═══════════════════════════════════════════
   13. KEYBOARD SHORTCUTS
   Esc        = đóng tất cả panel
   Ctrl+Shift+W = Viết truyện
   Ctrl+Shift+R = Xếp hạng
   Ctrl+Shift+E = EPUB
═══════════════════════════════════════════ */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    if (window.closeWriteStory) window.closeWriteStory();
    if (window.closeEpub)       window.closeEpub();
    if (window.closeRank)       window.closeRank();
  }
  if ((e.ctrlKey||e.metaKey) && e.shiftKey) {
    if (e.key==='W') { e.preventDefault(); window.openWriteStory && window.openWriteStory(); }
    if (e.key==='R') { e.preventDefault(); window.openRank       && window.openRank(); }
    if (e.key==='E') { e.preventDefault(); window.openEpub       && window.openEpub(); }
  }
});

console.log('%c🌿 VTC Addon loaded%c\nCtrl+Shift+W=✍️  Ctrl+Shift+R=🏆  Ctrl+Shift+E=📚',
  'color:#4ecdc4;font-weight:bold','color:#6fa8b8;font-size:11px');
