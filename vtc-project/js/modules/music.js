/*
 * ============================================================
 * File: js/modules/music.js
 * Mô tả: Mini music player — playlist nhạc chill lofi.
 *        Script thông thường (không phải ES Module) để expose
 *        các hàm playPause, nextTrack... ra window global.
 *
 * Nhạc từ Pixabay (Pixabay License — miễn phí thương mại):
 *   https://pixabay.com/music/
 * ============================================================
 */
(function () {

  // ── Playlist ──────────────────────────────────────────────
  const PLAYLIST = [
    {
      title:  'Peaceful Journey',
      artist: 'Lofi Chill',
      url:    'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    },
    {
      title:  'Morning Calm',
      artist: 'Asian Lofi',
      url:    'https://cdn.pixabay.com/download/audio/2022/10/25/audio_946a699c52.mp3?filename=lofi-rain-112268.mp3',
    },
    {
      title:  'Sakura Dreams',
      artist: 'Chill Vibes',
      url:    'https://cdn.pixabay.com/download/audio/2023/09/05/audio_b1e2027c3f.mp3?filename=lo-fi-background-112192.mp3',
    },
    {
      title:  'Moonlit Reading',
      artist: 'Night Lofi',
      url:    'https://cdn.pixabay.com/download/audio/2022/08/02/audio_884fe92c21.mp3?filename=lofi-chill-medium-version-159456.mp3',
    },
    {
      title:  '茶 Tea Time',
      artist: 'Chinese Chill',
      url:    'https://cdn.pixabay.com/download/audio/2024/02/14/audio_eb3c2c4e08.mp3?filename=chinese-lofi-194012.mp3',
    },
  ];

  // ── State ─────────────────────────────────────────────────
  let curIdx      = parseInt(localStorage.getItem('vtc_music_idx') || '0');
  let isPlaying   = false;
  let isCollapsed = false;

  const audio = new Audio();
  audio.volume = parseFloat(localStorage.getItem('vtc_vol') || '0.5');

  // ── DOM helpers ──────────────────────────────────────────
  const $ = id => document.getElementById(id);

  // ── Load và optionally play một track ────────────────────
  function loadTrack(idx, autoplay) {
    if (idx < 0) idx = PLAYLIST.length - 1;
    if (idx >= PLAYLIST.length) idx = 0;
    curIdx = idx;

    const track = PLAYLIST[idx];
    audio.src = track.url;
    $('musicTitle').textContent  = track.title;
    $('musicArtist').textContent = track.artist;
    localStorage.setItem('vtc_music_idx', idx);
    renderPlaylist();

    if (autoplay) {
      audio.play()
        .then(()  => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  }

  // ── Cập nhật trạng thái UI ────────────────────────────────
  function setPlaying(v) {
    isPlaying = v;
    $('playBtn').textContent          = v ? '⏸' : '▶';
    $('musicEq').style.display        = v ? 'flex' : 'none';
    $('musicToggleBtn').textContent   = v ? '🎶' : '🎵';
  }

  // ── Render danh sách bài trong player ─────────────────────
  function renderPlaylist() {
    $('musicPlaylist').innerHTML = PLAYLIST.map((t, i) => `
      <div class="pl-item ${i === curIdx ? 'active' : ''}" onclick="loadTrackGlobal(${i})">
        <span class="pl-item-num">
          ${i === curIdx && isPlaying ? '<span style="color:var(--accent)">▶</span>' : i + 1}
        </span>
        <span>${t.title}</span>
      </div>`).join('');
  }

  // ── Audio events ──────────────────────────────────────────
  audio.addEventListener('ended', () => loadTrack(curIdx + 1, true));
  audio.addEventListener('error', () => setTimeout(() => loadTrack(curIdx + 1, isPlaying), 1000));

  // ── Global functions (gọi từ HTML onclick) ────────────────
  window.playPause = () => {
    if (!audio.src) { loadTrack(curIdx, true); return; }
    if (isPlaying) { audio.pause(); setPlaying(false); }
    else           { audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  };

  window.nextTrack = () => loadTrack(curIdx + 1, isPlaying);
  window.prevTrack = () => loadTrack(curIdx - 1, isPlaying);

  window.setVolume = v => {
    audio.volume = v;
    localStorage.setItem('vtc_vol', v);
  };

  window.collapseMusicPlayer = () => {
    isCollapsed = !isCollapsed;
    $('musicPlayer').classList.toggle('mini', isCollapsed);
  };

  window.toggleMusicPlayer = () => {
    if (isCollapsed) {
      isCollapsed = false;
      $('musicPlayer').classList.remove('mini');
    } else {
      window.playPause();
    }
  };

  // Gọi từ playlist click
  window.loadTrackGlobal = idx => loadTrack(idx, true);

  // ── Restore volume slider & load track ───────────────────
  const volSlider = $('volSlider');
  if (volSlider) volSlider.value = audio.volume;
  loadTrack(curIdx, false);

})();
