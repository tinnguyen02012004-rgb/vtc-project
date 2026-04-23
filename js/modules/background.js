/*
 * ============================================================
 * File: js/modules/background.js
 * Mô tả: Hình nền Canvas động với 6 theme thay đổi được.
 *        Script thông thường (không phải ES Module) vì cần
 *        chạy trước khi main.js load và expose setBg() global.
 *
 * Themes:
 *   0 — 🌊 Đại Dương Đêm  (teal, stars)
 *   1 — 🌌 Ngân Hà Tím    (violet, stars)
 *   2 — 🌿 Rừng Ngọc      (green, no stars)
 *   3 — 🔥 Lửa Hoàng Hôn  (amber, no stars)
 *   4 — ❄️ Tuyết Lam       (blue, stars)
 *   5 — 🌸 Hoa Anh Đào    (pink, stars)
 * ============================================================
 */
(function () {

  const canvas = document.getElementById('bgCanvas');
  const ctx    = canvas.getContext('2d');
  let W, H, particles = [], stars = [], currentBgTheme = 0;

  // ── Theme definitions ────────────────────────────────────
  const BG_THEMES = [
    // 0: Ocean Night
    {
      bg1: '#040c14', bg2: '#071828',
      pColor: () => `hsla(${180 + Math.random() * 20},80%,${55 + Math.random() * 25}%,`,
      pCount: 120, pSpeed: 0.35,
      pSize:  () => Math.random() * 2.2 + 0.4,
      pGlow: true, stars: true,
      starColor: 'rgba(180,230,255,',
    },
    // 1: Purple Galaxy
    {
      bg1: '#0a0414', bg2: '#130828',
      pColor: () => `hsla(${270 + Math.random() * 40},75%,${60 + Math.random() * 25}%,`,
      pCount: 140, pSpeed: 0.3,
      pSize:  () => Math.random() * 2 + 0.4,
      pGlow: true, stars: true,
      starColor: 'rgba(220,180,255,',
    },
    // 2: Jade Forest
    {
      bg1: '#030e07', bg2: '#071a0f',
      pColor: () => `hsla(${140 + Math.random() * 30},70%,${50 + Math.random() * 25}%,`,
      pCount: 100, pSpeed: 0.4,
      pSize:  () => Math.random() * 2.5 + 0.5,
      pGlow: false, stars: false,
      starColor: 'rgba(180,255,200,',
    },
    // 3: Sunset Fire
    {
      bg1: '#100500', bg2: '#1e0a02',
      pColor: () => `hsla(${20 + Math.random() * 30},90%,${55 + Math.random() * 25}%,`,
      pCount: 110, pSpeed: 0.5,
      pSize:  () => Math.random() * 2 + 0.5,
      pGlow: true, stars: false,
      starColor: 'rgba(255,200,100,',
    },
    // 4: Ice Blue
    {
      bg1: '#03070f', bg2: '#060f1e',
      pColor: () => `hsla(${200 + Math.random() * 25},80%,${60 + Math.random() * 20}%,`,
      pCount: 130, pSpeed: 0.28,
      pSize:  () => Math.random() * 2 + 0.3,
      pGlow: true, stars: true,
      starColor: 'rgba(180,210,255,',
    },
    // 5: Cherry Blossom
    {
      bg1: '#0f0309', bg2: '#1a0612',
      pColor: () => `hsla(${330 + Math.random() * 30},80%,${65 + Math.random() * 20}%,`,
      pCount: 150, pSpeed: 0.25,
      pSize:  () => Math.random() * 2.2 + 0.4,
      pGlow: true, stars: true,
      starColor: 'rgba(255,180,210,',
    },
  ];

  // ── Canvas resize ────────────────────────────────────────
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  // ── Particle class ───────────────────────────────────────
  function Particle(themeIdx) {
    this.themeIdx = themeIdx;
    this._reset(true);
  }
  Particle.prototype._reset = function (init) {
    const th = BG_THEMES[this.themeIdx];
    this.x         = Math.random() * W;
    this.y         = init ? Math.random() * H : H + 10;
    this.size      = th.pSize();
    this.baseAlpha = Math.random() * 0.5 + 0.2;
    this.alpha     = this.baseAlpha;
    this.vx        = (Math.random() - 0.5) * 0.5;
    this.vy        = -(Math.random() * th.pSpeed + 0.1);
    this.life      = 0;
    this.maxLife   = Math.random() * 300 + 200;
    this.colorFn   = th.pColor;
    this.glow      = th.pGlow;
    this.twinkle   = Math.random() * Math.PI * 2;
  };
  Particle.prototype.update = function () {
    this.x += this.vx;
    this.y += this.vy;
    this.twinkle += 0.04;
    this.alpha = this.baseAlpha * (0.8 + 0.2 * Math.sin(this.twinkle));
    this.life++;
    if (this.life > this.maxLife || this.y < -20) this._reset(false);
  };
  Particle.prototype.draw = function () {
    const col = this.colorFn();
    if (this.glow) {
      const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 4);
      g.addColorStop(0, col + this.alpha + ')');
      g.addColorStop(1, col + '0)');
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 4, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = col + this.alpha + ')';
    ctx.fill();
  };

  // ── Star class ───────────────────────────────────────────
  function Star() { this._reset(); }
  Star.prototype._reset = function () {
    this.x       = Math.random() * W;
    this.y       = Math.random() * H;
    this.size    = Math.random() * 1.2 + 0.2;
    this.alpha   = Math.random() * 0.6 + 0.1;
    this.twinkle = Math.random() * Math.PI * 2;
    this.speed   = Math.random() * 0.03 + 0.01;
  };
  Star.prototype.update = function () {
    this.twinkle += this.speed;
    this.alpha = 0.2 + 0.5 * Math.abs(Math.sin(this.twinkle));
  };
  Star.prototype.draw = function (colorPrefix) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = colorPrefix + this.alpha + ')';
    ctx.fill();
  };

  // ── Init particles for a theme ───────────────────────────
  function initParticles(themeIdx) {
    currentBgTheme = themeIdx;
    const th = BG_THEMES[themeIdx];
    particles = Array.from({ length: th.pCount }, () => new Particle(themeIdx));
    stars     = th.stars ? Array.from({ length: 80 }, () => new Star()) : [];
  }

  // ── Draw gradient background ─────────────────────────────
  function drawBg(th) {
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, th.bg1);
    grd.addColorStop(1, th.bg2);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Animation loop ───────────────────────────────────────
  function loop() {
    const th = BG_THEMES[currentBgTheme];
    drawBg(th);
    stars.forEach(s     => { s.update(); s.draw(th.starColor); });
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }

  // ── Public: change background theme ─────────────────────
  window.setBg = function (idx) {
    document.querySelectorAll('.bg-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    localStorage.setItem('vtc_bg', idx);
    initParticles(idx);
  };

  // ── Init ─────────────────────────────────────────────────
  resize();
  window.addEventListener('resize', resize);

  const savedBg = parseInt(localStorage.getItem('vtc_bg') || '0');
  document.querySelectorAll('.bg-dot').forEach((d, i) => d.classList.toggle('active', i === savedBg));
  initParticles(savedBg);
  loop();

})();
