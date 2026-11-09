// Playback: <audio> for Deezer / Apple 30-second previews (CORS → analyser works),
// the official SoundCloud widget for SoundCloud links (full tracks).
'use strict';

class Player {
  static BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  constructor() {
    this.audio = new Audio(); this.audio.crossOrigin = 'anonymous'; this.audio.preload = 'auto';
    this.track = null; this.kind = null; this.volume = .8; this.scPos = 0; this.scDur = 0; this.scPlaying = false;
    this.onEnd = null; this.onState = null; this.onError = null;
    const a = this.audio;
    a.addEventListener('ended', () => this.onEnd && this.onEnd());
    a.addEventListener('play', () => this.emit()); a.addEventListener('pause', () => this.emit());
    a.addEventListener('error', () => this.handleError());
  }
  emit() { this.onState && this.onState(); }
  get playing() { return this.kind === 'sc' ? this.scPlaying : this.kind === 'yt' ? this.ytState === 1 || this.ytState === 3 : (this.kind === 'audio' || this.kind === 'sca') && !this.audio.paused; }
  get duration() {
    if (this.kind === 'sc') return this.scDur / 1000;
    if (this.kind === 'yt') return (this.yt && this.yt.getDuration && this.yt.getDuration()) || (this.track ? this.track.dur : 0);
    return isFinite(this.audio.duration) ? this.audio.duration : (this.track ? Math.min(30, this.track.dur) : 0);
  }
  position() { return this.kind === 'sc' ? this.scPos / 1000 : this.kind === 'yt' ? (this.yt && this.yt.getCurrentTime ? this.yt.getCurrentTime() : 0) : this.audio.currentTime || 0; }
  isPreview() { return this.kind === 'audio'; }

  /* audio graph: source → 10-band EQ → dry + Echo Space (early reflections + soft tail) → analyser → volume → out */
  initGraph() {
    if (this.ctx) return;
    try {
      const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaElementSource(this.audio);
      this.eq = Player.BANDS.map((f, i) => { const b = ctx.createBiquadFilter(); b.type = i === 0 ? 'lowshelf' : i === Player.BANDS.length - 1 ? 'highshelf' : 'peaking'; b.frequency.value = f; b.Q.value = 1.1; b.gain.value = (this.eqGains || [])[i] || 0; return b; });
      this.eq.reduce((a, b) => (a.connect(b), b), src);
      const last = this.eq[this.eq.length - 1], mix = ctx.createGain();
      const dry = this.dry = ctx.createGain(), wet = this.wet = ctx.createGain();
      last.connect(dry); dry.connect(mix);
      // Echo Space: two ping-pong taps (the logo's echoes) feeding a short generated room
      const split = ctx.createChannelSplitter(2), merge = ctx.createChannelMerger(2);
      const dl = ctx.createDelay(1), dr = ctx.createDelay(1), fb = ctx.createGain(), tone = ctx.createBiquadFilter();
      dl.delayTime.value = .19; dr.delayTime.value = .29; fb.gain.value = .32; tone.type = 'lowpass'; tone.frequency.value = 4200;
      last.connect(split); split.connect(dl, 0); split.connect(dr, 1); dl.connect(merge, 0, 1); dr.connect(merge, 0, 0);
      merge.connect(tone); tone.connect(fb); fb.connect(dl); fb.connect(dr);
      const room = ctx.createConvolver(); room.buffer = this.makeRoom(2.4);
      tone.connect(room); tone.connect(wet); room.connect(wet); wet.connect(mix);
      this.an = ctx.createAnalyser(); this.an.fftSize = 2048; this.an.smoothingTimeConstant = .78;
      this.buf = new Uint8Array(this.an.fftSize); this.freq = new Uint8Array(this.an.frequencyBinCount);
      this.gain = ctx.createGain(); this.gain.gain.value = this.curve(this.volume);
      mix.connect(this.an); this.an.connect(this.gain); this.gain.connect(ctx.destination); this.audio.volume = 1;
      this.setSpace(this.space || 0);
    } catch (e) { console.warn('audio graph', e); this.ctx = null; }
  }
  makeRoom(sec) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
    return buf;
  }
  get fxAvailable() { return this.kind === 'audio' || this.kind === 'sca'; }
  setEq(gains) { this.eqGains = gains.slice(); if (this.eq) this.eq.forEach((b, i) => b.gain.setTargetAtTime(gains[i] || 0, this.ctx.currentTime, .04)); }
  setSpace(v) {
    this.space = v; if (!this.wet) return;
    const t = this.ctx.currentTime; this.wet.gain.setTargetAtTime(v * .55, t, .08); this.dry.gain.setTargetAtTime(1 - v * .18, t, .08);
  }
  spectrum() { if (!this.an || !this.fxAvailable || !this.playing) return null; this.an.getByteFrequencyData(this.freq); return this.freq; }
  bass() { const f = this.spectrum(); if (!f) return 0; let s = 0; for (let i = 1; i < 8; i++) s += f[i]; return s / (7 * 255); }
  level() {
    if (this.kind === 'sc' || this.kind === 'yt') return this.playing ? .35 + Math.sin(performance.now() / 260) * .12 : 0; // embedded players' audio is not readable
    if (!this.an || this.audio.paused) return 0;
    this.an.getByteTimeDomainData(this.buf); let s = 0; for (const v of this.buf) { const x = (v - 128) / 128; s += x * x; }
    return Math.min(1, Math.sqrt(s / this.buf.length) * 3.2);
  }

  // full = { kind:'sc', url } | { kind:'yt', id } | null (→ 30-second preview)
  async load(t, full) {
    this.stopAll(); this.track = t; this.retried = false;
    if (full && full.kind === 'sca') { this.via = full.via || 'sc'; return this.loadPreview(t, full.audio, 'sca'); }
    if (full && full.kind === 'yt') { this.kind = 'yt'; this.ytIds = full.ids.slice(); this.emit(); return this.loadYt(this.ytIds.shift()); }
    if ((full && full.kind === 'sc') || (t.src.sc && !t.preview)) { this.kind = 'sc'; this.emit(); return this.loadSc(full ? full.url : t.src.sc.url); }
    return this.loadPreview(t);
  }
  async loadPreview(t, src, kind = 'audio') {
    this.stopAll(); this.track = t; this.kind = kind;
    this.initGraph(); this.ctx && this.ctx.resume();
    this.audio.src = src || t.preview; if (!this.gain) this.audio.volume = this.curve(this.volume);
    try { await this.audio.play(); } catch (e) { if (e.name !== 'AbortError') this.handleError(); }
    this.emit();
  }
  async handleError() {
    const t = this.track; if (!t) return;
    if (this.kind === 'sca') { this.onFullError && this.onFullError(t); return; }
    if (this.kind !== 'audio') return;
    if (!this.retried && t.src.dz) { // Deezer preview links expire: ask for a fresh one once
      this.retried = true;
      try { const f = await Api.freshTrack(t.src.dz.id); t.preview = f.preview; this.audio.src = f.preview; await this.audio.play(); return; } catch { }
    }
    this.onError && this.onError(t);
  }
  toggle() {
    if (this.kind === 'sc') { this.scPlaying ? this.widget.pause() : this.widget.play(); return; }
    if (this.kind === 'yt') { this.playing ? this.yt.pauseVideo() : this.yt.playVideo(); return; }
    if (this.audio.paused) { this.ctx && this.ctx.resume(); this.audio.play().catch(() => { }); } else this.audio.pause();
  }
  pause() { if (this.kind === 'sc') this.widget && this.widget.pause(); else if (this.kind === 'yt') this.yt && this.yt.pauseVideo && this.yt.pauseVideo(); else this.audio.pause(); }
  seek(sec) { if (this.kind === 'sc') this.widget.seekTo(sec * 1000); else if (this.kind === 'yt') this.yt.seekTo(sec, true); else if (isFinite(this.audio.duration)) this.audio.currentTime = sec; }
  curve(v) { return v * v; } // perceptual: the slider feels even from quiet to loud
  setVolume(v) {
    this.volume = v;
    if (this.gain) this.gain.gain.setTargetAtTime(this.curve(v), this.ctx.currentTime, .03); else this.audio.volume = this.curve(v); this.widget && this.widget.setVolume(Math.round(v * 100)); this.yt && this.yt.setVolume && this.yt.setVolume(Math.round(v * 100)); }
  stopAll() {
    this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load();
    if (this.widget) { try { this.widget.pause(); } catch { } }
    if (this.yt && this.yt.pauseVideo) { try { this.yt.pauseVideo(); } catch { } } this.ytState = -1;
    this.scPlaying = false; this.scPos = 0; this.scDur = 0;
  }

  /* YouTube: official embedded player, always visible (YouTube's rules), min 200×200 */
  loadYtApi() {
    if (window.YT && YT.Player) return Promise.resolve();
    return this.ytApi || (this.ytApi = new Promise(res => { window.onYouTubeIframeAPIReady = res; const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s); }));
  }
  async loadYt(id) {
    this.ytId = id;
    await this.loadYtApi();
    if (this.kind !== 'yt') return;
    if (!this.yt) {
      await new Promise(res => {
        this.yt = new YT.Player('ytFrame', {
          videoId: id, host: 'https://www.youtube.com', playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3 },
          events: {
            onReady: e => { e.target.setVolume(Math.round(this.volume * 100)); e.target.playVideo(); res(); },
            onStateChange: e => { this.ytState = e.data; if (e.data === 0 && this.kind === 'yt') this.onEnd && this.onEnd(); this.emit(); },
            onError: e => {
              if (this.kind !== 'yt') return;
              const bad = this.ytId; Api.dropYt(this.track, bad);
              if (this.ytIds && this.ytIds.length) return this.loadYt(this.ytIds.shift()); // e.g. 150: label blocks embedding → next candidate
              this.onFullError && this.onFullError(this.track, e.data);
            },
          },
        });
      });
    } else this.yt.loadVideoById(id);
  }

  loadScApi() {
    if (window.SC && SC.Widget) return Promise.resolve();
    return this.scApi || (this.scApi = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://w.soundcloud.com/player/api.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }));
  }
  async loadSc(url) {
    await this.loadScApi();
    const W = SC.Widget, opts = { auto_play: true, visual: false, show_artwork: false, buying: false, sharing: false, download: false, show_comments: false };
    if (!this.widget) {
      const f = document.createElement('iframe'); f.allow = 'autoplay; encrypted-media'; f.title = 'SoundCloud';
      f.style.cssText = 'position:fixed;width:1px;height:1px;left:-10px;bottom:0;opacity:0;pointer-events:none;border:0';
      f.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url) + '&' + new URLSearchParams(opts);
      document.body.appendChild(f); this.widget = W(f);
      const E = W.Events;
      this.widget.bind(E.READY, () => { this.widget.setVolume(Math.round(this.volume * 100)); this.widget.play(); });
      this.widget.bind(E.PLAY, () => { this.scPlaying = true; this.widget.getDuration(d => { this.scDur = d; this.emit(); }); this.emit(); });
      this.widget.bind(E.PAUSE, () => { this.scPlaying = false; this.emit(); });
      this.widget.bind(E.PLAY_PROGRESS, e => { this.scPos = e.currentPosition; });
      this.widget.bind(E.FINISH, () => { this.scPlaying = false; this.onEnd && this.onEnd(); });
      this.widget.bind(E.ERROR, () => this.onError && this.onError(this.track));
    } else {
      this.widget.load(url, { ...opts, callback: () => { this.widget.setVolume(Math.round(this.volume * 100)); this.widget.play(); } });
    }
  }
}

/* cover colours (images are CORS-enabled on Deezer / Apple / SoundCloud CDNs) */
const colorCache = new Map();
function coverColors(url) {
  if (!url) return Promise.resolve(null);
  if (colorCache.has(url)) return colorCache.get(url);
  const p = new Promise(res => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 24; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 24, 24);
        const d = g.getImageData(0, 0, 24, 24).data, bins = new Array(24).fill(0);
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), ch = mx - mn, l = (mx + mn) / 2;
          if (ch < .1) continue;
          let h = mx === r ? ((gg - b) / ch) % 6 : mx === gg ? (b - r) / ch + 2 : (r - gg) / ch + 4; h = (h * 60 + 360) % 360;
          bins[Math.floor(h / 15)] += ch * (1 - Math.abs(l - .5));
        }
        if (Math.max(...bins) < .5) return res(['hsl(240,12%,72%)', 'hsl(240,8%,52%)']); // greyscale cover → calm neutral
        const b1 = bins.indexOf(Math.max(...bins)); let b2 = -1, best = 0;
        bins.forEach((v, i) => { const dd = Math.min(Math.abs(i - b1), 24 - Math.abs(i - b1)); if (dd >= 3 && v * dd > best) { best = v * dd; b2 = i; } });
        if (b2 < 0) b2 = (b1 + 2) % 24;
        res([`hsl(${b1 * 15 + 7},70%,66%)`, `hsl(${b2 * 15 + 7},58%,56%)`]);
      } catch { res(null); }
    };
    img.onerror = () => res(null); img.src = url;
  });
  colorCache.set(url, p); return p;
}
