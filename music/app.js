'use strict';
/* Echo Music 0.2 — real catalogue (Deezer + Apple + SoundCloud), one collection for everything. */

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const svg = id => `<svg><use href="#${id}"/></svg>`;
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const lab = t => `<span class="lab" data-t="${t}">${t}</span>`; // label that rises on hover, its echo follows
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return (m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c); };
const nTracks = n => `${n} ${plural(n, 'трек', 'трека', 'треков')}`;
const nFans = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + ' млн' : n >= 1e3 ? Math.round(n / 1e3) + ' тыс.' : String(n);

/* ---------------- state ---------------- */
const KEY = 'echo-music-v2';
const DEFAULT_WAVE = { mood: 'any', act: 'any', genres: [], eras: [], lang: 'any', tempo: 'any', novelty: 50 };
const S = Object.assign({ liked: [], playlists: [], albums: [], savedPl: [], artists: [], history: [], skips: {}, wave: { ...DEFAULT_WAVE }, volume: 80, shuffle: false, repeat: 'off' }, JSON.parse(localStorage.getItem(KEY) || '{}'));
S.wave = Object.assign({ ...DEFAULT_WAVE }, S.wave); delete S._draft;
// the collection lives in a file on disk in the desktop app (survives any port / cache change), localStorage elsewhere
let saveT, libReady = false;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => {
  const data = JSON.stringify({ ...S, _draft: undefined });
  try { localStorage.setItem(KEY, data); } catch { }
  if (LOCAL && libReady) fetch('/api/library', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: data }).catch(() => { });
}, 250); };
const slim = t => ({ ymAlbum: t.ymAlbum, key: t.key, title: t.title, version: t.version, artist: t.artist, artistId: t.artistId, artistAm: t.artistAm, album: t.album, albumId: t.albumId, cover: t.cover, coverXL: t.coverXL, dur: t.dur, preview: t.preview, explicit: t.explicit, src: t.src });

const T = new Map(); // key -> track (everything rendered)
const reg = t => { const have = T.get(t.key); if (have) { Object.assign(have.src, t.src); return have; } T.set(t.key, t); return t; };
[...S.liked, ...S.playlists.flatMap(p => p.tracks), ...S.history.map(h => h.t)].forEach(reg);
const isLiked = k => S.liked.some(t => t.key === k);
const lists = {};

const player = new Player(); player.setVolume(S.volume / 100);
const P = { queue: [], qi: -1, ctx: '', href: '', isWave: false, track: null, waveBuf: [] };

/* ---------------- dictionaries ---------------- */
const GENRES = [
  { id: 132, name: 'Поп', q: 'поп', g: 'linear-gradient(135deg,#e5486e,#8d2a6b)' },
  { id: 116, name: 'Хип-хоп', q: 'рэп', g: 'linear-gradient(135deg,#f08a24,#a63c12)' },
  { id: 152, name: 'Рок', q: 'рок', g: 'linear-gradient(135deg,#8e1f1f,#2b0d0d)' },
  { id: 113, name: 'Танцевальная', q: 'dance', g: 'linear-gradient(135deg,#4a63ff,#1d1f7a)' },
  { id: 106, name: 'Электроника', q: 'электроника', g: 'linear-gradient(135deg,#1fb5a8,#0c4b52)' },
  { id: 85, name: 'Альтернатива', q: 'альтернатива', g: 'linear-gradient(135deg,#6b7a3a,#26300f)' },
  { id: 165, name: 'R&B', q: 'r&b', g: 'linear-gradient(135deg,#9b5de5,#3c1b6b)' },
  { id: 129, name: 'Джаз', q: 'jazz', g: 'linear-gradient(135deg,#c9a227,#5a4208)' },
  { id: 464, name: 'Метал', q: 'metal', g: 'linear-gradient(135deg,#5b5b66,#16161a)' },
  { id: 169, name: 'Соул и фанк', q: 'soul funk', g: 'linear-gradient(135deg,#e07a5f,#7a2e1d)' },
  { id: 98, name: 'Классика', q: 'классическая музыка', g: 'linear-gradient(135deg,#a8a29e,#44403c)' },
  { id: 466, name: 'Фолк', q: 'folk', g: 'linear-gradient(135deg,#7fb069,#2d4a22)' },
];
const MOODS = [{ id: 'energetic', name: 'Бодрое', q: 'энергичная' }, { id: 'happy', name: 'Весёлое', q: 'хорошее настроение' }, { id: 'calm', name: 'Спокойное', q: 'chill спокойная' }, { id: 'sad', name: 'Грустное', q: 'грустные песни' }];
const ACTS = [{ id: 'work', name: 'Работа', q: 'для работы' }, { id: 'sport', name: 'Спорт', q: 'для тренировки' }, { id: 'drive', name: 'Дорога', q: 'в машину' }, { id: 'sleep', name: 'Сон', q: 'для сна' }, { id: 'party', name: 'Вечеринка', q: 'вечеринка' }];
const ERAS = [{ id: 80, name: '80-е', q: '80-х' }, { id: 90, name: '90-е', q: '90-х' }, { id: 0, name: '00-е', q: '2000-х' }, { id: 10, name: '10-е', q: '2010-х' }, { id: 20, name: 'Новинки', q: 'новинки 2026' }];
const LANGS = [{ id: 'any', name: 'Любой' }, { id: 'ru', name: 'Русский', q: 'русские' }, { id: 'en', name: 'Зарубежный', q: 'english' }, { id: 'none', name: 'Без слов', q: 'instrumental' }];
const TEMPOS = [{ id: 'any', name: 'Любой' }, { id: 'slow', name: 'Медленный', q: 'медленные' }, { id: 'mid', name: 'Средний' }, { id: 'fast', name: 'Быстрый', q: 'быстрые' }];

/* ---------------- wave ---------------- */
function waveQueries(w = S.wave) {
  const lang = LANGS.find(l => l.id === w.lang).q || '', qs = [];
  const eras = w.eras.map(e => ERAS.find(x => x.id === e).q);
  const gs = w.genres.map(g => GENRES.find(x => x.id === g));
  for (const g of (gs.length ? gs : [null])) for (const e of (eras.length ? eras : [''])) { const q = [lang, g ? g.q : '', e].filter(Boolean).join(' '); if (q) qs.push(q); }
  const mood = w.mood !== 'any' ? MOODS.find(m => m.id === w.mood).q : '', act = w.act !== 'any' ? ACTS.find(a => a.id === w.act).q : '';
  const tempo = (TEMPOS.find(t => t.id === w.tempo) || {}).q || '';
  const mq = [lang, mood, act, tempo].filter(Boolean).join(' ');
  if (mood || act || tempo) qs.push(mq);
  return qs;
}
function waveSummary(w = S.wave) {
  const p = [];
  if (w.mood !== 'any') p.push(MOODS.find(m => m.id === w.mood).name);
  if (w.act !== 'any') p.push(ACTS.find(a => a.id === w.act).name.toLowerCase());
  if (w.genres.length) p.push(w.genres.map(g => GENRES.find(x => x.id === g).name.toLowerCase()).join(', '));
  if (w.eras.length) p.push(w.eras.map(e => ERAS.find(x => x.id === e).name.toLowerCase()).join(', '));
  if (w.lang !== 'any') p.push(LANGS.find(l => l.id === w.lang).name.toLowerCase());
  if (w.tempo !== 'any') p.push(TEMPOS.find(t => t.id === w.tempo).name.toLowerCase() + ' темп');
  if (w.novelty >= 75) p.push('больше нового'); else if (w.novelty <= 25) p.push('больше знакомого');
  const n = S.liked.length + S.disliked.length, learned = n ? `учтено ${n} ${plural(n, 'оценка', 'оценки', 'оценок')}` : '';
  if (p.length) return p.join(' · ') + (learned ? ' · ' + learned : '');
  return n ? `Подстраивается под тебя — ${learned}, пропуски и дослушивания` : 'Ставь ♡ и «Не нравится» — волна будет понимать тебя лучше';
}
/* ---------------- taste: likes, dislikes, skips and full listens move an artist's score ---------------- */
S.taste = S.taste || { a: {}, ids: {} }; S.disliked = S.disliked || [];
if (S.skips && Object.keys(S.skips).length) { for (const [a, n] of Object.entries(S.skips)) S.taste.a[a] = (S.taste.a[a] || 0) - n; S.skips = {}; }
const FEEL = { like: 3, unlike: -3, dislike: -4, undislike: 4, full: 1, skip: -1 }, BAN = -6;
const aKey = name => mainArtistName(name);
function feel(t, kind) {
  const a = aKey(t.artist); S.taste.a[a] = Math.max(-12, Math.min(30, (S.taste.a[a] || 0) + FEEL[kind]));
  if (t.artistId) S.taste.ids[a] = t.artistId; save();
}
const artistScore = name => S.taste.a[aKey(name)] || 0;
const artistBanned = name => artistScore(name) <= BAN;
const dislikedSet = () => new Set(S.disliked.map(matchKey));
const isDisliked = t => S.disliked.some(x => x.key === t.key || matchKey(x) === matchKey(t));
const tasteWeight = t => Math.exp(Math.max(-6, Math.min(10, artistScore(t.artist))) * .22);
const byTaste = arr => arr.map(t => [t, Math.random() * tasteWeight(t)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
function likedArtistIds() {
  const scored = Object.entries(S.taste.a).filter(([a, v]) => v > 0 && S.taste.ids[a]).map(([a, v]) => [S.taste.ids[a], v]);
  const ids = [...S.artists.map(a => [a.id, 6]), ...scored, ...S.liked.filter(t => t.artistId).map(t => [t.artistId, 2])];
  const w = new Map(); ids.forEach(([id, v]) => w.set(id, (w.get(id) || 0) + v));
  // weighted pick without replacement: artists you like more come up more often
  return [...w.entries()].map(([id, v]) => [id, Math.pow(Math.random(), 1 / v)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
}
/* Yandex «Моя волна» is the base when your account is connected: it knows years of your listening.
   Echo sends it what you skip / finish, adds discoveries from other services and removes your dislikes. */
const YM_MOOD = { any: 'all', energetic: 'active', happy: 'fun', calm: 'calm', sad: 'sad' };
const ymWaveOn = async () => { const c = await Api.cfg; return !!(c.local && c.ym && c.ym.connected); };
let ymBatch = null, ymLastId = null;
async function ymWaveSettings() {
  if (!(await ymWaveOn())) return;
  const w = S.wave;
  await fetch('/api/ym/wave/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mood: YM_MOOD[w.mood] || 'all', diversity: w.novelty <= 25 ? 'favorite' : w.novelty >= 75 ? 'discover' : 'default', language: w.lang === 'ru' ? 'russian' : w.lang === 'en' || w.lang === 'none' ? 'not-russian' : 'any' }) }).catch(() => { });
}
function ymFeedback(type, t, played) {
  if (!t || !t.src || !t.src.ym || !LOCAL) return;
  fetch('/api/ym/wave/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, trackId: t.src.ym.id, batchId: t.ymBatch || ymBatch, played }) }).catch(() => { });
}
async function ymWaveTracks() {
  try {
    const d = await fetch('/api/ym/wave' + (ymLastId ? '?queue=' + ymLastId : '')).then(r => r.json());
    if (!d || !Array.isArray(d.tracks)) return [];
    ymBatch = d.batchId; const ts = d.tracks.map(fromYm).map(t => (t.ymBatch = d.batchId, t));
    if (ts.length) ymLastId = ts[ts.length - 1].src.ym.id;
    return ts;
  } catch { return []; }
}
async function waveBatch() {
  if (await ymWaveOn()) {
    const [base, extra] = await Promise.all([ymWaveTracks(), echoWaveBatch(6)]);
    const dis = dislikedSet(), seen = new Set();
    const ok = t => !dis.has(matchKey(t)) && !artistBanned(t.artist) && !seen.has(matchKey(t)) && seen.add(matchKey(t));
    const b = base.filter(ok).map(reg), e = extra.filter(ok);
    if (b.length) { const out = []; b.forEach((t, i) => { out.push(t); if (i % 3 === 2 && e.length) out.push(e.shift()); }); return out; } // every 4th track — a discovery from elsewhere
  }
  return echoWaveBatch(16);
}
async function echoWaveBatch(N = 16) {
  const w = S.wave, queries = waveQueries(w), fam = [], fresh = [];
  const jobs = [];
  const arts = likedArtistIds().slice(0, 3);
  arts.forEach(id => jobs.push(Api.artistRadio(id).then(ts => fam.push(...ts)).catch(() => { })));
  for (const q of shuffle(queries).slice(0, 3)) jobs.push(Api.findPlaylists(q, 8).then(async pls => { const p = shuffle(pls.slice(0, 5))[0]; if (p) fresh.push(...(await Api.playlist(p.id)).tracks); }).catch(() => { }));
  w.genres.slice(0, 2).forEach(id => { if (!queries.length || Math.random() < .5) jobs.push(Api.genreChart(id).then(ts => fresh.push(...ts)).catch(() => { })); });
  if (!queries.length && !arts.length) jobs.push(Api.chart().then(c => fresh.push(...c.tracks)).catch(() => { }));
  if (!queries.length && arts.length) {
    jobs.push(Api.chart().then(c => fresh.push(...shuffle(c.tracks).slice(0, 8))).catch(() => { }));
    // discovery: artists similar to the ones you love, but not yet in your collection
    const mine = new Set([...S.liked.map(t => aKey(t.artist)), ...S.artists.map(a => aKey(a.name))]);
    arts.slice(0, 2).forEach(id => jobs.push(DZ(`/artist/${id}/related?limit=15`, 120).then(async d => {
      const fresh3 = shuffle(d.data.filter(a => !mine.has(aKey(a.name)) && !artistBanned(a.name))).slice(0, 3);
      const tops = await Promise.all(fresh3.map(a => DZ(`/artist/${a.id}/top?limit=6`, 120).then(x => x.data.map(t => fromDz(t))).catch(() => [])));
      fresh.push(...tops.flat());
    }).catch(() => { })));
  }
  await Promise.all(jobs);
  // explicit filters (genre/era/language/mood) win over taste: liked-artist radio only seasons the mix
  const famShare = !arts.length ? 0 : (queries.length ? .3 : .7) * (1 - w.novelty / 100); // at the default slider: ~35% familiar, 65% new
  const known = new Set([...S.liked.map(matchKey), ...S.history.map(h => matchKey(h.t))]);
  const recent = new Set([...S.history.slice(0, 40).map(h => matchKey(h.t)), ...P.queue.slice(P.qi).map(matchKey), ...P.waveBuf.map(matchKey)]);
  const dis = dislikedSet();
  const ok = t => canPlay(t) && !recent.has(matchKey(t)) && !dis.has(matchKey(t)) && !artistBanned(t.artist);
  const famPool = byTaste([...fam, ...(w.novelty < 60 && !queries.length ? S.liked : [])].filter(ok));
  const cyr = t => /[а-яё]/i.test(t.artist + t.title);
  let newPool = byTaste(fresh.filter(t => ok(t) && (w.novelty < 50 || !known.has(matchKey(t)))));
  if (w.lang === 'ru') newPool = [...newPool.filter(cyr), ...newPool.filter(t => !cyr(t)).slice(0, 3)];
  if (w.lang === 'en' || w.lang === 'none') newPool = newPool.filter(t => !cyr(t));
  const out = [], seen = new Set();
  const take = (pool, n) => { for (const t of pool) { if (n <= 0) break; const k = matchKey(t); if (seen.has(k)) continue; const perArtist = out.filter(x => x.artist === t.artist).length; if (perArtist >= 2) continue; seen.add(k); out.push(reg(t)); n--; } };
  take(famPool, Math.round(N * famShare)); take(newPool, N - out.length); take(famPool, N - out.length);
  return byTaste(out);
}
let waveFilling = null; // one refill at a time — parallel refills used to queue the same tracks twice
async function fillWaveBuf() {
  if (P.waveBuf.length >= 4) return P.waveBuf;
  if (!waveFilling) waveFilling = waveBatch().then(b => { const have = new Set([...P.queue, ...P.waveBuf].map(matchKey)); P.waveBuf.push(...b.filter(t => !have.has(matchKey(t)))); }).finally(() => { waveFilling = null; });
  await waveFilling; return P.waveBuf;
}
async function startWave() {
  if (!(P.isWave && P.track)) { ymBatch = null; ymLastId = null; ymWaveSettings().then(() => { }); }
  if (P.isWave && P.track) return player.toggle();
  toast('Собираю волну…');
  try { await fillWaveBuf(); } catch { }
  if (!P.waveBuf.length) return toast('Не получилось собрать волну — проверь интернет');
  const first = P.waveBuf.splice(0, 6);
  startQueue(first, 0, 'Моя волна', '#home', true);
}
async function rebuildWave() {
  P.waveBuf = []; ymLastId = null; await ymWaveSettings();
  if (P.isWave && P.track) { P.queue.length = P.qi + 1; await fillWaveBuf(); P.queue.push(...P.waveBuf.splice(0, 6)); renderQueue(); toast('Волна перестроена'); }
  else { fillWaveBuf().then(() => updateWaveCovers()); }
}

/* ---------------- smart lists from your listening ---------------- */
const SMART = {
  liked: { name: 'Мне нравится', ids: () => S.liked },
  recent: { name: 'Недавно играли', ids: () => { const seen = new Set(); return S.history.map(h => h.t).filter(t => !seen.has(t.key) && seen.add(t.key)).slice(0, 50); } },
  top: { name: 'Часто слушаю', ids: () => { const c = {}, by = {}; S.history.forEach(h => { c[h.t.key] = (c[h.t.key] || 0) + 1; by[h.t.key] = h.t; }); return Object.entries(c).filter(x => x[1] >= 2).sort((a, b) => b[1] - a[1]).map(x => by[x[0]]).slice(0, 40); } },
  forgotten: { name: 'Давно не включал', ids: () => { const last = {}; S.history.forEach(h => last[h.t.key] = Math.max(last[h.t.key] || 0, h.at)); const old = Date.now() - 14 * 864e5; return S.liked.filter(t => (last[t.key] || 0) < old && S.history.length > 30).slice(0, 40); } },
};

/* ---------------- render helpers ---------------- */
const SRC_NAME = { ym: 'Яндекс', sc: 'SoundCloud', ytm: 'YT Music', yt: 'YouTube', sp: 'Spotify', dz: 'Deezer', am: 'Apple' };
const srcText = t => { const k = Object.keys(SRC_NAME).filter(x => t.src && t.src[x]); return k.length ? `<span class="srcs-t">${k.map(x => SRC_NAME[x]).join(' · ')}</span>` : ''; };
const badges = t => srcText(t) + `<span class="srcs">${Object.keys(t.src).filter(s => SOURCES[s]).map(s => `<span class="src" title="${SOURCES[s].name}">${SOURCES[s].short}</span>`).join('')}</span>`;
const artistHref = t => t.artistId ? `#artist/${t.artistId}` : `#artist-name/${encodeURIComponent(mainArtistName(t.artist))}`;
const mainArtistName = a => String(a).split(/,| & | feat\.? | ft\.? /i)[0].trim();
function row(t, list, i, opt = {}) {
  t = reg(t);
  const now = P.track && P.track.key === t.key, liked = isLiked(t.key);
  return `<div class="tr${now ? ' now' : ''}${isDisliked(t) ? ' dis' : ''}" data-k="${esc(t.key)}" data-list="${list}" data-i="${i}">
    ${opt.num ? `<span class="n">${opt.num}</span>` : ''}
    <div class="art">${t.cover ? `<img loading="lazy" src="${esc(t.cover)}" alt="">` : ''}${now ? '<span class="eq"><i></i><i></i><i></i></span>' : ''}</div>
    <div class="tr-text"><b><span>${esc(t.title)}</span>${t.version ? `<i>${esc(t.version)}</i>` : ''}${t.explicit ? '<span class="ex" title="Ненормативная лексика">E</span>' : ''}</b>
      <div class="tr-sub"><span><a href="${artistHref(t)}">${esc(t.artist)}</a></span>${opt.noSrc ? '' : badges(t)}</div></div>
    ${t.albumId ? `<a class="alb" href="#album/${t.albumId}">${esc(t.album)}</a>` : `<span class="alb">${esc(t.album || '')}</span>`}
    <button class="ib hv${liked ? ' liked' : ''}" data-act="like" aria-label="${liked ? 'Убрать из любимых' : 'Нравится'}">${svg(liked ? 'i-heart-f' : 'i-heart')}</button>
    <span class="dur">${t.dur ? fmt(t.dur) : ''}</span>
    <button class="ib" data-act="menu" aria-label="Ещё">${svg('i-dots')}</button>
  </div>`;
}
function trackList(tracks, key, opt = {}) {
  lists[key] = { tracks: tracks.map(reg), name: opt.name || '', href: opt.href || location.hash };
  if (!tracks.length) return `<p class="empty">${opt.empty || 'Пока пусто'}</p>`;
  // long lists (a 1000+ track collection) render in pages as you scroll
  const PAGE = 120, first = tracks.slice(0, PAGE);
  lists[key].opt = opt;
  return `<div class="${opt.cls || 'tracks'}">${first.map((t, i) => row(t, key, i, { num: opt.numbers ? i + 1 : 0, noSrc: opt.noSrc })).join('')}</div>${tracks.length > PAGE ? `<div class="more-rows" data-list="${key}" data-at="${PAGE}"><span class="mono">ещё ${tracks.length - PAGE}</span></div>` : ''}`;
}
const pager = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) moreRows(e.target); }), { root: document.querySelector('#main'), rootMargin: '0px 0px 900px 0px' }) : null;
function moreRows(m) {
  const L = lists[m.dataset.list]; if (!L) return; const at = +m.dataset.at, next = L.tracks.slice(at, at + 200), o = L.opt || {};
  m.previousElementSibling.insertAdjacentHTML('beforeend', next.map((t, i) => row(t, m.dataset.list, at + i, { num: o.numbers ? at + i + 1 : 0, noSrc: o.noSrc })).join(''));
  m.dataset.at = at + next.length;
  if (+m.dataset.at >= L.tracks.length) { pager && pager.unobserve(m); m.remove(); } else m.querySelector('span').textContent = 'ещё ' + (L.tracks.length - m.dataset.at);
  refreshRows();
}
const card = (href, img, title, sub, opt = {}) => `<a class="card${opt.round ? ' round' : ''}" href="${href}"><div class="pic"><img loading="lazy" src="${esc(img)}" alt="">${opt.play ? `<span class="go" data-act="${opt.play}" data-id="${opt.id}" role="button" aria-label="Слушать">${svg('i-play')}</span>` : ''}</div><b>${esc(title)}</b><small>${esc(sub)}</small></a>`;
const albumCard = a => card(`#album/${a.id}`, a.cover_medium || a.cover_big, a.title, [a.artist && a.artist.name, a.release_date && a.release_date.slice(0, 4), a.record_type === 'single' ? 'сингл' : a.record_type === 'ep' ? 'EP' : ''].filter(Boolean).join(' · '), { play: 'play-album', id: a.id });
const artistCard = a => card(`#artist/${a.id}`, a.picture_medium || a.picture_big, a.name, a.nb_fan ? nFans(a.nb_fan) + ' поклонников' : 'Исполнитель', { round: true });
const plCard = p => card(`#playlist/${p.id}`, p.picture_medium || p.picture_big, p.title, nTracks(p.nb_tracks || 0), { play: 'play-pl', id: p.id });
const sk = (n, cls = '', h = 56) => Array.from({ length: n }, () => `<div class="sk ${cls}" style="height:${h}px;margin-bottom:8px"></div>`).join('');
const skRow = (n = 7, round) => `<div class="row-scroll">${Array.from({ length: n }, () => `<div><div class="sk" style="aspect-ratio:1;${round ? 'border-radius:50%' : ''}"></div><div class="sk" style="height:12px;margin-top:10px;width:70%"></div></div>`).join('')}</div>`;
const errBox = (msg = 'Не удалось загрузить') => `<div class="err">${msg}. <button data-act="retry">Повторить</button></div>`;
const extLinks = t => `
  <a href="${LINKS.apple(t)}" target="_blank" rel="noopener">${svg('i-ext')}Apple Music</a>
  <a href="${LINKS.yandex(t)}" target="_blank" rel="noopener">${svg('i-ext')}Яндекс Музыка</a>
  <a href="${LINKS.deezer(t)}" target="_blank" rel="noopener">${svg('i-ext')}Deezer</a>
  <a href="${t.src.sc ? t.src.sc.url : LINKS.soundcloud(t)}" target="_blank" rel="noopener">${svg('i-ext')}SoundCloud</a>`;

/* ---------------- router ---------------- */
const main = $('#main'); let route = '', renderId = 0;
async function render(keepScroll) {
  const h = location.hash.slice(1) || 'home'; const id = ++renderId;
  const [v, ...rest] = h.split('/'); const arg = decodeURIComponent(rest.join('/'));
  const changed = h !== route; route = h;
  const top = main.scrollTop;
  const view = document.createElement('div'); view.className = 'view';
  main.replaceChildren(view);
  if (!changed || keepScroll) view.style.animation = 'none';
  if (v !== 'search') $('#topSearch').value = '';
  const tab = { home: 'home', search: 'search', library: 'library', smart: 'library', pl: 'library', 'artist-name': 'search' }[v] || (v === 'home' ? 'home' : '');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('on', b.dataset.view === tab));
  const ctx = { el: view, alive: () => id === renderId }; routeBar(true);
  try {
    if (v === 'search') await viewSearch(ctx, arg);
    else if (v === 'library') await viewLibrary(ctx, arg || 'tracks');
    else if (v === 'artist') await viewArtist(ctx, arg);
    else if (v === 'artist-name') { view.innerHTML = sk(1, '', 300); const a = await Api.artistByName(arg); if (ctx.alive()) a ? location.replace('#artist/' + a.id) : (view.innerHTML = '<p class="empty">Исполнитель не найден</p>'); }
    else if (v === 'album') await viewAlbum(ctx, arg);
    else if (v === 'playlist') await viewDzPlaylist(ctx, arg);
    else if (v === 'pl') viewUserPl(ctx, arg);
    else if (v === 'smart') viewSmart(ctx, arg);
    else if (v === 'genre') await viewGenre(ctx, arg);
    else if (v === 'chart') await viewChart(ctx);
    else await viewHome(ctx);
  } catch (e) { if (ctx.alive()) view.innerHTML = errBox('Не удалось загрузить. Проверь интернет'); console.error(e); }
  if (!changed || keepScroll) main.scrollTop = top; else main.scrollTop = 0;
  renderRail(); refreshRows(); reveal(view); startField(); routeBar(false);
}
/* ---------- motion: reveal on scroll, echo field, route progress ---------- */
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root: main, rootMargin: '0px 0px -40px 0px', threshold: 0 }) : null;
function reveal(root) {
  if (!io || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('.more-rows').forEach(m => { if (!m.dataset.obs && pager) { m.dataset.obs = 1; pager.observe(m); } });
  root.querySelectorAll('.sec, .row-scroll, .tracks, .chart-cols, .genres, .cols2, .side-chart, .actions, .top-res, .ext-row').forEach(el => {
    if (el.children.length > 60) return; // big lists show at once
    if (el.closest('.sheet') || el.dataset.rv) return; el.dataset.rv = 1; el.classList.add('rv');
    [...el.children].slice(0, 24).forEach((c, i) => c.style.setProperty('--i', i));
    io.observe(el);
  });
}
new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && n.querySelector) reveal(n.closest('.view') || n); }).observe(main, { childList: true, subtree: true });
function routeBar(on) { const b = $('#routeBar'); if (!b) return; b.classList.toggle('go', on); if (!on) { b.classList.add('done'); setTimeout(() => b.classList.remove('done'), 400); } }
let fieldRaf = 0;
function startField() {
  cancelAnimationFrame(fieldRaf);
  const c = $('#waveField'); if (!c) return;
  const hero = $('#wave'), g = c.getContext('2d'), DPR = Math.min(2, devicePixelRatio || 1); let lvl = 0, kick = 0, prev = 0;
  hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); hero.style.setProperty('--mx', (e.clientX - r.left) + 'px'); hero.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
  const loop = now => {
    if (!c.isConnected) return;
    const w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * DPR)) { c.width = Math.round(w * DPR); c.height = Math.round(h * DPR); }
    lvl += (player.level() - lvl) * .16;
    const f = player.spectrum(); if (f) { let e = 0; for (let i = 1; i < 10; i++) e += f[i]; e /= 9 * 255; if (e - prev > .05) kick = 1; prev = e; } kick *= .9;
    const t = now / 1000, live = player.playing, cx = w > 700 ? w * .74 : w * .85, cy = h * .52;
    g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, w, h); g.strokeStyle = '#ecebe7';
    for (let i = 0; i < 12; i++) {
      const ph = (t * (live ? .08 : .028) + i / 12) % 1, r = 40 + ph * Math.max(w, h) * 1.05;
      const a = Math.pow(1 - ph, 1.7) * (.07 + lvl * .22 + kick * .12);
      g.lineWidth = 1 + kick * (1 - ph); g.globalAlpha = a; g.beginPath(); g.arc(cx, cy, r + kick * 14 * (1 - ph), -Math.PI * .45, Math.PI * .45); g.stroke();
      g.globalAlpha = a * .3; g.beginPath(); g.arc(cx, cy, r, Math.PI * .55, Math.PI * 1.45); g.stroke();
    }
    g.globalAlpha = 1; fieldRaf = requestAnimationFrame(loop);
  };
  fieldRaf = requestAnimationFrame(loop);
}
window.addEventListener('hashchange', () => { closeSheet(); if (!$('#player').hidden) closePlayer(); render(); });

/* ---------------- home ---------------- */
function greetText() { const h = new Date().getHours(); return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'; }
function quickTiles(chartCover) {
  const recent = SMART.recent.ids(), tile = (href, img, name, sub, extra = '', uname = '') => `<a class="qtile" href="${href}"${extra}>${img}<span><b${uname}>${esc(name)}</b><small${uname}>${esc(sub)}</small></span></a>`;
  const pic = src => src ? `<img src="${esc(src)}" alt="" loading="lazy">` : `<i class="qph"></i>`;
  const tiles = [
    tile('#smart/liked', `<i class="qph qlike">${svg('i-heart-f')}</i>`, 'Мне нравится', nTracks(S.liked.length)),
    tile('#smart/recent', pic(recent[0] && recent[0].cover), 'Недавно играли', recent.length ? recent[0].artist : 'пока пусто', '', recent.length ? ' data-sub-name' : ''),
    tile('#chart', pic(chartCover), 'Чарт', 'топ-50 сейчас'),
    ...S.playlists.slice(-2).reverse().map(p => tile('#pl/' + p.id, pic(p.tracks[0] && p.tracks[0].cover), p.name, nTracks(p.tracks.length), '', ' class="uname"')),
    tile('#library/playlists', `<i class="qph">${svg('i-link')}</i>`, 'Перенести плейлист', 'Spotify, Яндекс, Deezer…', ' data-act="import"'),
  ];
  return tiles.slice(0, 6).join('');
}
async function viewHome({ el, alive }) {
  const mine = Object.entries(SMART).map(([k, s]) => [k, s, s.ids()]).filter(x => x[2].length >= 3);
  el.innerHTML = `
  <div class="hh-top"><span class="hh-greet">${greetText()}</span><span class="eyebrow mono"><span class="dot"></span>Echo Music</span></div>
  <section class="wave wave-xl" id="wave">
    <div class="wave-bg" id="waveBg"></div><canvas class="field" id="waveField" aria-hidden="true"></canvas><div class="spot"></div>
    <div class="wave-info">
      <span class="eyebrow mono"><span class="eq"><i></i><i></i><i></i></span>Персональный поток</span>
      <h1 class="wave-title-xl">Моя волна</h1><p id="waveSum">${esc(waveSummary())}</p>
      <div class="row"><button class="btn pri wave-go" data-act="wave" id="waveBtn">${svg('i-play')}${lab('Слушать')}</button><button class="btn quiet" data-act="tune">${svg('i-tune')}${lab('Настроить')}</button></div>
      <div class="wave-moods" role="group" aria-label="Настроение">${[{ id: 'any', name: 'Любое' }, ...MOODS].map(m => `<button class="${S.wave.mood === m.id ? 'on' : ''}" data-act="mood" data-v="${m.id}">${m.name}</button>`).join('')}</div>
    </div>
    <div class="wave-next" id="waveNext"></div>
  </section>
  <div class="quick" id="quick">${quickTiles()}</div>
  </section>
  ${mine.length ? `<div class="sec"><h2>Твоё</h2></div><div class="row-scroll">${mine.map(([k, s, ts]) => `<a class="card smart" href="#smart/${k}"><div class="pic"><div class="mosaic${ts.length < 4 ? ' one' : ''}">${ts.slice(0, ts.length < 4 ? 1 : 4).map(t => `<img loading="lazy" src="${esc(t.coverXL || t.cover)}" alt="">`).join('')}</div><span>${s.name}</span></div><b>${s.name}</b><small>${nTracks(ts.length)}</small></a>`).join('')}</div>` : ''}
  <div class="sec"><h2>Чарт</h2><a class="more" href="#chart">Все 50</a></div><div id="chart">${sk(4)}</div>
  <div class="sec"><h2>Русские хиты</h2><small>подборки слушателей Deezer</small></div><div id="ruHits">${sk(4)}</div>
  <div class="sec"><h2>Популярные исполнители</h2></div><div id="artists">${skRow(7, true)}</div>
  <div class="sec"><h2>Популярные альбомы</h2></div><div id="albums">${skRow()}</div>
  <div class="sec"><h2>Подборки</h2></div><div id="pls">${skRow()}</div>
  <div class="sec"><h2>Жанры</h2></div><div class="genres">${GENRES.map(g => `<a class="genre" href="#genre/${g.id}" style="--g:${g.g}" data-gid="${g.id}">${g.name}</a>`).join('')}</div>`;
  updateWaveButton();
  fillWaveBuf().then(() => alive() && updateWaveCovers()).catch(() => { });
  Api.genres().then(gs => { if (!alive()) return; gs.forEach(g => { const a = el.querySelector(`[data-gid="${g.id}"]`); if (a && g.picture_medium) a.insertAdjacentHTML('beforeend', `<img loading="lazy" src="${esc(g.picture_medium)}" alt="">`); }); }).catch(() => { });
  Api.findPlaylists('русские хиты 2026', 6).then(async pls => {
    const best = pls.sort((a, b) => b.nb_tracks - a.nb_tracks)[0]; if (!best) throw 0;
    const { tracks } = await Api.playlist(best.id); if (!alive()) return;
    $('#ruHits').innerHTML = trackList(tracks.filter(t => t.preview).slice(0, 12), 'ruhits', { cls: 'chart-cols plain', name: 'Русские хиты', href: '#playlist/' + best.id });
  }).catch(() => alive() && ($('#ruHits').innerHTML = errBox()));
  try {
    const c = await Api.chart(); if (!alive()) return;
    const q = $('#quick'); if (q) q.innerHTML = quickTiles(c.tracks[0] && c.tracks[0].cover);
    $('#chart').innerHTML = trackList(c.tracks.slice(0, 15), 'chart', { cls: 'chart-cols', numbers: true, name: 'Чарт', href: '#chart' });
    $('#artists').innerHTML = `<div class="row-scroll">${c.artists.map(artistCard).join('')}</div>`;
    $('#albums').innerHTML = `<div class="row-scroll">${c.albums.map(albumCard).join('')}</div>`;
    $('#pls').innerHTML = `<div class="row-scroll">${c.playlists.map(plCard).join('')}</div>`;
    refreshRows();
  } catch { if (alive()) ['#chart', '#artists', '#albums', '#pls'].forEach(s => $(s).innerHTML = errBox()); }
}
function updateWaveCovers() {
  const next = (P.isWave ? P.queue.slice(P.qi, P.qi + 3) : P.waveBuf.slice(0, 3));
  const n = $('#waveNext'), bg = $('#waveBg'); if (!n) return;
  const a = next[0];
  n.innerHTML = a ? `<div class="wn-stack">${next.slice(0, 3).reverse().map(t => `<img src="${esc(t.coverXL || t.cover)}" alt="">`).join('')}</div>
    <div class="wn-cap"><small>${P.isWave && P.track ? 'Сейчас' : 'Первым будет'}</small><b>${esc(a.title)}</b><span>${esc(a.artist)}</span></div>` : '';
  bg.innerHTML = a ? `<img src="${esc(a.cover)}" alt="">` : '';
}
function updateWaveButton() {
  const b = $('#waveBtn'); if (!b) return;
  const on = P.isWave && player.playing; const w = $('#wave'); if (w) w.classList.toggle('live', on);
  b.innerHTML = svg(on ? 'i-pause' : 'i-play') + lab(on ? 'Пауза' : P.isWave && P.track ? 'Продолжить' : 'Слушать');
  const s = $('#waveSum'); if (s) s.textContent = waveSummary();
}
/* ---------------- chart / genre ---------------- */
async function viewChart({ el, alive }) {
  el.innerHTML = `<h1 class="page-title echo-word" data-t="Чарт"><span>Чарт</span></h1>${sk(10)}`;
  const c = await Api.chart(); if (!alive()) return;
  el.innerHTML = `<h1 class="page-title echo-word" data-t="Чарт"><span>Чарт</span></h1><div class="actions"><button class="btn pri" data-act="play-list" data-list="chartAll">${svg('i-play')}${lab('Слушать')}</button><button class="btn" data-act="shuffle-list" data-list="chartAll">${svg('i-shuffle')}${lab('Вперемешку')}</button></div>${trackList(c.tracks, 'chartAll', { numbers: true, name: 'Чарт' })}`;
}
async function viewGenre({ el, alive }, id) {
  const g = GENRES.find(x => x.id === +id) || { name: 'Жанр', g: '#333' };
  el.innerHTML = `<div class="hero" style="background:${g.g};min-height:240px"><small>Жанр</small><h1>${g.name}</h1></div>${sk(8)}`;
  const [tracks, arts] = await Promise.all([Api.genreChart(id), DZ(`/genre/${id}/artists?limit=20`, 60).then(d => d.data).catch(() => [])]);
  if (!alive()) return;
  el.innerHTML = `<div class="hero" style="background:${g.g};min-height:240px"><small>Жанр · чарт</small><h1>${g.name}</h1><p>${nTracks(tracks.length)}</p></div>
  <div class="actions"><button class="btn pri" data-act="play-list" data-list="genre">${svg('i-play')}${lab('Слушать')}</button><button class="btn" data-act="genre-wave" data-id="${id}">${svg('i-home')}Волна по жанру</button></div>
  ${arts.length ? `<div class="sec"><h2>Исполнители</h2></div><div class="row-scroll">${arts.map(artistCard).join('')}</div>` : ''}
  <div class="sec"><h2>Популярное</h2></div>${trackList(tracks, 'genre', { numbers: true, cls: 'cols2', name: g.name })}`;
}

/* ---------------- search ---------------- */
let searchT;
async function viewSearch({ el, alive }, q) {
  q = q || '';
  const ts = $('#topSearch'); if (document.activeElement !== ts) ts.value = q;
  el.innerHTML = `<div class="search-box"><label>${svg('i-search')}<input id="q" type="search" placeholder="Трек, исполнитель или ссылка SoundCloud" value="${esc(q)}" autocomplete="off" enterkeyhint="search"></label></div><div id="results"></div>`;
  const qi = el.querySelector('#q'); qi.oninput = () => onQuery(qi.value);
  if (!q && el.isConnected) setTimeout(() => (matchMedia('(min-width:980px)').matches ? ts : qi).focus({ preventScroll: true }), 60);
  const R = el.querySelector('#results');
  if (!q.trim()) {
    const recent = SMART.recent.ids().slice(0, 6);
    R.innerHTML = `${recent.length ? `<div class="sec"><h2>Ты недавно слушал</h2></div>${trackList(recent, 'srecent', { name: 'Недавнее' })}` : ''}
    <div class="sec"><h2>Жанры</h2><small>ищем во всех сервисах сразу</small></div>
    <div class="genres">${GENRES.map(g => `<a class="genre" href="#genre/${g.id}" style="--g:${g.g}">${g.name}</a>`).join('')}</div>`;
    return;
  }
  R.innerHTML = sk(6);
  const res = await Api.search(q).catch(() => null); if (!alive()) return;
  if (!res) { R.innerHTML = errBox('Поиск не ответил'); return; }
  const fixed = res.usedQ && norm(res.usedQ) !== norm(q) ? `<p class="hint" style="color:var(--mute);margin:4px 0 8px">Показаны результаты по запросу «${esc(res.usedQ)}»</p>` : '';
  const ext = `<div class="ext-row">Нет нужного? Поискать в:
    <a href="https://music.yandex.ru/search?text=${encodeURIComponent(q)}" target="_blank" rel="noopener">${svg('i-ext')}Яндекс Музыке</a>
    <a href="https://soundcloud.com/search?q=${encodeURIComponent(q)}" target="_blank" rel="noopener">${svg('i-ext')}SoundCloud</a>
    <a href="https://music.apple.com/ru/search?term=${encodeURIComponent(q)}" target="_blank" rel="noopener">${svg('i-ext')}Apple Music</a></div>`;
  if (!res.tracks.length && !res.artists.length) { R.innerHTML = `${fixed}<p class="empty">Ничего не нашли по «${esc(q)}»</p>${ext}`; return; }
  if (res.spotify && res.spotify.type !== 'track') {
    const d = res.spotify; lists.spsearch = { tracks: d.tracks.map(reg), name: d.name, href: location.hash };
    R.innerHTML = `<div class="sp-card"><img src="${esc(d.cover)}" alt=""><div><small class="mono">Spotify · ${d.type === 'album' ? 'альбом' : 'плейлист'}</small><h3>${esc(d.name)}</h3><p>${esc(d.by || '')} · ${nTracks(d.tracks.length)} · играем полностью из Яндекса, SoundCloud и YouTube</p>
      <div class="actions"><button class="btn pri" data-act="play-list" data-list="spsearch">${svg('i-play')}${lab('Слушать')}</button><button class="btn" data-act="sp-save">${svg('i-plus')}${lab('В коллекцию')}</button></div></div></div>
      ${trackList(d.tracks, 'spsearch', { numbers: true, name: d.name, noSrc: true })}`;
    lastSearch = { res }; refreshRows(); return;
  }
  lastSearch = { res, q, fixed, ext, R };
  drawSearch();
  refreshRows();
}
let lastSearch = null, searchSrc = 'all', fullOnly = true;
const isFull = t => !!(t.src.yt || t.src.sc || t.src.ym || (LOCAL && (t.src.ytm || t.src.sp)));
const audioOnly = ts => ts.filter(t => !t.key.startsWith('yt'));
function videoGrid(list, key) {
  lists[key] = { tracks: list.map(reg), name: 'Видео', href: location.hash };
  return `<div class="vgrid">${list.map((t, i) => `<button class="vcard" data-k="${esc(t.key)}" data-list="${key}" data-i="${i}">
    <span class="vthumb"><img loading="lazy" src="${esc(t.coverXL || t.cover)}" alt=""><span class="vdur">${fmt(t.dur)}</span><span class="vplay">${svg('i-play')}</span></span>
    <b>${esc(t.rawTitle || t.title)}</b><small>${esc(t.uploader || t.artist)}</small></button>`).join('')}</div>`;
}
function drawSearch() {
  const { res, q, fixed, ext, R } = lastSearch;
  // web: by default only what plays in full; previews one tap away
  if (!LOCAL && !res._all) { res._all = res.tracks; }
  if (!LOCAL) res.tracks = fullOnly ? res._all.filter(isFull) : res._all.slice().sort((a, b) => isFull(b) - isFull(a));
  const fullBar = LOCAL ? '' : `<div class="full-toggle"><button class="${fullOnly ? 'on' : ''}" data-act="fullonly" data-v="1">Только полные · ${res._all.filter(isFull).length}</button><button class="${fullOnly ? '' : 'on'}" data-act="fullonly" data-v="0">Все, включая фрагменты · ${res._all.length}</button></div>`;
  const counts = Object.fromEntries(Object.keys(SOURCES).map(k => [k, res.tracks.filter(t => t.src[k]).length]));
  if (searchSrc !== 'all' && !counts[searchSrc]) searchSrc = 'all';
  const tabs = `<div class="src-tabs" role="tablist">${[['all', 'Все', res.tracks.length], ...Object.keys(SOURCES).map(k => [k, SOURCES[k].name, counts[k]])].filter(x => x[2] || x[0] === 'all')
    .map(([k, n, c]) => `<button class="${searchSrc === k ? 'on' : ''}" data-act="srcf" data-s="${k}">${n}<i>${c}</i></button>`).join('')}</div>`;
  if (searchSrc === 'yt') {
    R.innerHTML = `${fixed}${tabs}${videoGrid(res.tracks.filter(t => t.key.startsWith('yt')), 'svideo')}${ext}`; refreshRows(); return;
  }
  if (searchSrc !== 'all') {
    const list = res.tracks.filter(t => t.src[searchSrc]);
    R.innerHTML = `${fixed}${tabs}${trackList(list, 'search', { name: 'Поиск: ' + q, cls: 'tracks with-src' })}${ext}`;
    refreshRows(); return;
  }
  const top = res.top;
  R.innerHTML = `${fixed}${fullBar}${tabs}
  <div class="${top ? 'home-top' : ''}">
    ${top ? `<div><div class="sec" style="margin-top:6px"><h2>Лучший результат</h2></div><a class="top-res" href="#artist/${top.id}"><img src="${esc(top.picture_big)}" alt=""><div><small>Исполнитель</small><h3>${esc(top.name)}</h3><p>${nFans(top.nb_fan || 0)} поклонников · ${top.nb_album || 0} альбомов</p></div></a></div>` : ''}
    <div><div class="sec" style="margin-top:6px"><h2>Треки</h2><small>${res.tracks.length} из ${Object.keys(SOURCES).filter(k => counts[k]).length} сервисов</small></div>${trackList(audioOnly(res.tracks).slice(0, top ? 5 : 40), 'search', { name: 'Поиск: ' + q, cls: 'tracks with-src' })}</div>
  </div>
  ${top && audioOnly(res.tracks).length > 5 ? `<div class="cols2 with-src">${trackList(audioOnly(res.tracks).slice(5, 35), 'search2', { name: 'Поиск: ' + q }).replace(/^<div class="tracks">|<\/div>$/g, '')}</div>` : ''}
  ${res.tracks.some(t => t.key.startsWith('yt')) ? `<div class="sec"><h2>Видео</h2><button class="more" data-act="srcf" data-s="yt">Все видео</button></div>${videoGrid(res.tracks.filter(t => t.key.startsWith('yt')).slice(0, 8), 'svideo8')}` : ''}
  ${res.artists.length ? `<div class="sec"><h2>Исполнители</h2></div><div class="row-scroll">${res.artists.map(artistCard).join('')}</div>` : ''}
  ${res.albums.length ? `<div class="sec"><h2>Альбомы</h2></div><div class="row-scroll">${res.albums.map(albumCard).join('')}</div>` : ''}
  ${ext}`;
  refreshRows();
}
function onQuery(v) {
  clearTimeout(searchT);
  searchT = setTimeout(() => {
    const h = '#search/' + encodeURIComponent(v.trim());
    if (location.hash.startsWith('#search')) { history.replaceState(null, '', h); route = h.slice(1); const id = ++renderId; viewSearchResultsOnly(v, id); }
    else location.hash = h;
  }, 320);
}
async function viewSearchResultsOnly(v, id) {
  const view = main.querySelector('.view'); if (!view) return;
  const ctx = { el: document.createElement('div'), alive: () => id === renderId };
  await viewSearch(ctx, v);
  if (!ctx.alive()) return;
  const R = view.querySelector('#results'), nr = ctx.el.querySelector('#results');
  if (R && nr) { R.replaceWith(nr); refreshRows(); }
}

/* ---------------- artist / album / playlists ---------------- */
async function viewArtist({ el, alive }, id) {
  el.innerHTML = `<div class="hero"><div class="sk" style="height:60px;width:50%"></div></div>${sk(6)}`;
  const { a, top, albums, related } = await Api.artist(id); if (!alive()) return;
  const following = S.artists.some(x => x.id === a.id);
  const albs = albums.filter(x => x.record_type === 'album'), singles = albums.filter(x => x.record_type !== 'album');
  el.innerHTML = `<div class="hero"><img class="hbg" src="${esc(a.picture_xl)}" alt=""><small>Исполнитель</small><h1>${esc(a.name)}</h1><p>${nFans(a.nb_fan || 0)} поклонников на Deezer · ${a.nb_album || 0} ${plural(a.nb_album || 0, 'релиз', 'релиза', 'релизов')}</p></div>
  <div class="actions">
    <button class="btn pri round" data-act="play-list" data-list="atop" aria-label="Слушать">${svg('i-play')}</button>
    <button class="btn" data-act="artist-wave" data-id="${a.id}" data-name="${esc(a.name)}">${svg('i-home')}Волна по исполнителю</button>
    <button class="btn ${following ? '' : 'ghost'}" data-act="follow" data-id="${a.id}">${svg(following ? 'i-check' : 'i-plus')}${following ? 'В коллекции' : 'В коллекцию'}</button>
    <span class="ext-row" style="margin:0"><a href="https://music.yandex.ru/search?text=${encodeURIComponent(a.name)}&type=artists" target="_blank" rel="noopener">${svg('i-ext')}Яндекс Музыка</a><a href="https://soundcloud.com/search/people?q=${encodeURIComponent(a.name)}" target="_blank" rel="noopener">${svg('i-ext')}SoundCloud</a></span>
  </div>
  <div class="sec"><h2>Популярные треки</h2></div>${trackList(top.slice(0, 10), 'atop', { numbers: true, cls: 'cols2', noSrc: true, name: a.name })}
  ${albs.length ? `<div class="sec"><h2>Альбомы</h2></div><div class="row-scroll">${albs.map(x => albumCard({ ...x, artist: null })).join('')}</div>` : ''}
  ${singles.length ? `<div class="sec"><h2>Синглы и EP</h2></div><div class="row-scroll">${singles.map(x => albumCard({ ...x, artist: null })).join('')}</div>` : ''}
  ${related.length ? `<div class="sec"><h2>Похожие исполнители</h2></div><div class="row-scroll">${related.map(artistCard).join('')}</div>` : ''}`;
  coverColors(a.picture_medium).then(c => c && !P.track && setColors(c));
}
async function viewAlbum({ el, alive }, id) {
  el.innerHTML = `<div class="hero blur"><div class="sk" style="height:132px;width:132px"></div></div>${sk(8)}`;
  const { a, tracks } = await Api.album(id); if (!alive()) return;
  const saved = S.albums.some(x => x.id === a.id), total = tracks.reduce((s, t) => s + t.dur, 0);
  el.innerHTML = `<div class="hero blur"><img class="hbg" src="${esc(a.cover_medium)}" alt=""><div class="hero-row"><img class="hcover" src="${esc(a.cover_xl)}" alt=""><div style="min-width:0">
    <small>${a.record_type === 'single' ? 'Сингл' : a.record_type === 'ep' ? 'EP' : 'Альбом'}</small><h1 style="font-size:clamp(24px,5vw,52px)">${esc(a.title)}</h1>
    <p><a href="#artist/${a.artist.id}" style="color:var(--fg);font-weight:600">${esc(a.artist.name)}</a> · ${(a.release_date || '').slice(0, 4)} · ${nTracks(tracks.length)}, ${Math.round(total / 60)} мин</p></div></div></div>
  <div class="actions"><button class="btn pri round" data-act="play-list" data-list="album" aria-label="Слушать">${svg('i-play')}</button><button class="btn" data-act="shuffle-list" data-list="album">${svg('i-shuffle')}${lab('Вперемешку')}</button>
    <button class="btn ${saved ? '' : 'ghost'}" data-act="save-album" data-id="${a.id}">${svg(saved ? 'i-check' : 'i-plus')}${saved ? 'В коллекции' : 'В коллекцию'}</button></div>
  ${trackList(tracks, 'album', { numbers: true, noSrc: true, name: a.title })}
  ${a.label ? `<p style="color:var(--mute);font-size:12px;margin-top:16px">${esc(a.release_date || '')} · ${esc(a.label)}</p>` : ''}`;
  el.dataset.album = JSON.stringify({ id: a.id, title: a.title, artist: a.artist.name, cover: a.cover_medium });
}
async function viewDzPlaylist({ el, alive }, id) {
  el.innerHTML = `<div class="hero blur"><div class="sk" style="height:132px;width:132px"></div></div>${sk(8)}`;
  const { p, tracks } = await Api.playlist(id); if (!alive()) return;
  const saved = S.savedPl.some(x => x.id === p.id);
  el.innerHTML = `<div class="hero blur"><img class="hbg" src="${esc(p.picture_medium)}" alt=""><div class="hero-row"><img class="hcover" src="${esc(p.picture_xl)}" alt=""><div style="min-width:0">
    <small>Подборка</small><h1 style="font-size:clamp(24px,5vw,52px)">${esc(p.title)}</h1><p>${esc(p.creator ? p.creator.name : '')} · ${nTracks(tracks.length)}</p></div></div></div>
  <div class="actions"><button class="btn pri round" data-act="play-list" data-list="dzpl" aria-label="Слушать">${svg('i-play')}</button><button class="btn" data-act="shuffle-list" data-list="dzpl">${svg('i-shuffle')}${lab('Вперемешку')}</button>
  <button class="btn ${saved ? '' : 'ghost'}" data-act="save-pl" data-id="${p.id}" data-title="${esc(p.title)}" data-pic="${esc(p.picture_medium)}" data-n="${tracks.length}">${svg(saved ? 'i-check' : 'i-plus')}${saved ? 'В коллекции' : 'В коллекцию'}</button></div>
  ${trackList(tracks, 'dzpl', { numbers: true, name: p.title })}`;
}
function viewUserPl({ el }, id) {
  const p = S.playlists.find(x => x.id === id); if (!p) { el.innerHTML = '<p class="empty">Плейлист не найден</p>'; return; }
  const cov = p.tracks[0] ? p.tracks[0].coverXL || p.tracks[0].cover : '';
  el.innerHTML = `<div class="hero blur">${cov ? `<img class="hbg" src="${esc(p.tracks[0].cover)}" alt="">` : ''}<div class="hero-row">${cov ? `<img class="hcover" src="${esc(cov)}" alt="">` : `<div class="hcover sk" style="animation:none;display:grid;place-items:center">${svg('i-lib')}</div>`}<div style="min-width:0">
    <small>Твой плейлист</small><h1 style="font-size:clamp(24px,5vw,52px)">${esc(p.name)}</h1><p>${nTracks(p.tracks.length)}${p.from ? ' · перенесён из ' + esc(p.from) : ''}</p></div></div></div>
  <div class="actions">${p.tracks.length ? `<button class="btn pri round" data-act="play-list" data-list="upl" aria-label="Слушать">${svg('i-play')}</button><button class="btn" data-act="shuffle-list" data-list="upl">${svg('i-shuffle')}${lab('Вперемешку')}</button>` : ''}
  <button class="ib" data-act="pl-menu" data-pl="${p.id}" aria-label="Ещё">${svg('i-dots')}</button></div>
  ${trackList(p.tracks, 'upl', { numbers: true, name: p.name, empty: 'Добавляй треки через ⋯ → «Добавить в плейлист»' })}`;
  lists.upl.pl = p.id;
}
function viewSmart({ el }, k) {
  const s = SMART[k]; if (!s) { location.replace('#library'); return; }
  const ts = s.ids();
  el.innerHTML = `<div class="hero blur">${ts[0] ? `<img class="hbg" src="${esc(ts[0].cover)}" alt="">` : ''}<small>${k === 'liked' ? 'Коллекция' : 'Собирается само'}</small><h1>${s.name}</h1><p>${nTracks(ts.length)}${k === 'liked' ? ' из всех сервисов' : ''}</p></div>
  <div class="actions">${ts.length ? `<button class="btn pri round" data-act="play-list" data-list="smart" aria-label="Слушать">${svg('i-play')}</button><button class="btn" data-act="shuffle-list" data-list="smart">${svg('i-shuffle')}${lab('Вперемешку')}</button>` : ''}</div>
  ${trackList(ts, 'smart', { name: s.name, empty: k === 'liked' ? 'Нажимай ♡ у треков — они соберутся здесь' : 'Пока пусто' })}`;
}

/* ---------------- library ---------------- */
async function viewLibrary({ el }, tab) {
  const tabs = [['tracks', 'Треки'], ['playlists', 'Плейлисты'], ['albums', 'Альбомы'], ['artists', 'Исполнители'], ['hidden', 'Скрытое']];
  let body = '';
  if (tab === 'tracks') {
    const counts = Object.fromEntries(Object.keys(SOURCES).map(s => [s, S.liked.filter(t => t.src[s]).length]));
    body = S.liked.length ? `<div class="actions"><button class="btn pri" data-act="play-list" data-list="lib">${svg('i-play')}${lab('Слушать')}</button><button class="btn" data-act="shuffle-list" data-list="lib">${svg('i-shuffle')}${lab('Вперемешку')}</button>
      <span style="color:var(--mute);font-size:12.5px;margin-left:6px">${S.liked.length} всего · ${Object.entries(counts).filter(x => x[1]).map(([k, n]) => `${SOURCES[k].name} ${n}`).join(' · ')}</span></div>${trackList(S.liked, 'lib', { name: 'Мне нравится' })}`
      : `<div class="empty">Здесь будут все любимые треки — из любого сервиса.<br>Жми ♡ у трека или перенеси плейлист.<div class="actions" style="justify-content:center"><button class="btn pri" data-act="import">${svg('i-plus')}Перенести плейлист</button><a class="btn" href="#home">Включить волну</a></div></div>`;
  } else if (tab === 'playlists') {
    body = `<button class="pick" data-act="new-pl"><span class="ph">${svg('i-plus')}</span><span><b>Новый плейлист</b></span></button>
    <button class="pick" data-act="import"><span class="ph">${svg('i-link')}</span><span><b>Перенести из другого сервиса</b><small>Ссылка Deezer / SoundCloud или список треков из Яндекс Музыки, Apple Music, Spotify…</small></span></button>
    <a class="pick" href="#smart/liked"><span class="ph" style="background:linear-gradient(135deg,var(--c1),var(--c2))">${svg('i-heart-f')}</span><span><b>Мне нравится</b><small>${nTracks(S.liked.length)}</small></span></a>
    ${S.playlists.map(p => `<a class="pick" href="#pl/${p.id}">${p.tracks[0] ? `<img src="${esc(p.tracks[0].cover)}" alt="">` : `<span class="ph">${svg('i-lib')}</span>`}<span><b class="uname">${esc(p.name)}</b><small>${nTracks(p.tracks.length)}</small></span></a>`).join('')}
    ${S.savedPl.map(p => `<a class="pick" href="#playlist/${p.id}"><img src="${esc(p.pic)}" alt=""><span><b class="uname">${esc(p.title)}</b><small>Подборка · ${nTracks(p.n)}</small></span></a>`).join('')}`;
  } else if (tab === 'albums') {
    body = S.albums.length ? `<div class="row-scroll" style="grid-auto-flow:row;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));overflow:visible;margin:0;padding:0">${S.albums.map(a => card('#album/' + a.id, a.cover, a.title, a.artist)).join('')}</div>` : '<p class="empty">Нажми «В коллекцию» на странице альбома</p>';
  } else if (tab === 'hidden') {
    const bannedA = Object.entries(S.taste.a).filter(([, v]) => v <= BAN).map(([a]) => a);
    body = `<p class="hint" style="color:var(--mute);margin:6px 0 14px">Волна не ставит то, что здесь. Нажми «Вернуть», если передумал.</p>
    ${bannedA.length ? `<div class="sec" style="margin-top:8px"><h2>Исполнители</h2></div>${bannedA.map(a => `<div class="pick"><span class="ph">${svg('i-user')}</span><span style="flex:1"><b>${esc(a)}</b><small>не рекомендуем</small></span><button class="btn" data-act="unban" data-a="${esc(a)}">Вернуть</button></div>`).join('')}` : ''}
    <div class="sec"><h2>Треки с дизлайком</h2><small>${S.disliked.length}</small></div>
    ${S.disliked.length ? `<div class="tracks">${S.disliked.map((t, i) => row(t, 'hidden', i, { noSrc: true }).replace('class="ib hv', 'class="ib').replace('data-act="like"', 'data-act="undislike" title="Вернуть"').replace(/<svg><use href="#i-heart(-f)?"\/><\/svg>/, svg('i-undo'))).join('')}</div>` : '<p class="empty">Пока ничего — жми «Не нравится» у треков, которые не заходят</p>'}`;
    lists.hidden = { tracks: S.disliked.map(reg), name: 'Скрытое', href: '#library/hidden' };
  } else {
    body = S.artists.length ? `<div class="row-scroll" style="grid-auto-flow:row;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));overflow:visible;margin:0;padding:0">${S.artists.map(a => card('#artist/' + a.id, a.picture, a.name, 'Исполнитель', { round: true })).join('')}</div>` : '<p class="empty">Нажми «В коллекцию» на странице исполнителя</p>';
  }
  el.innerHTML = `<div class="page-head"><h1 class="page-title echo-word" data-t="Коллекция"><span>Коллекция</span></h1><button class="btn" data-act="services">${svg('i-tune')}${lab('Сервисы')}</button></div><div class="chips scroll" style="margin-bottom:6px">${tabs.map(([k, n]) => `<a class="chip${tab === k ? ' on' : ''}" href="#library/${k}">${n}</a>`).join('')}</div>${body}`;
}
function renderRail() {
  $('#railLists').innerHTML = `<small>Коллекция</small>
    <a href="#smart/liked"><span class="ph" style="background:linear-gradient(135deg,var(--c1),var(--c2))">${svg('i-heart-f')}</span><span><b>Мне нравится</b><i>${nTracks(S.liked.length)}</i></span></a>
    ${S.playlists.map(p => `<a href="#pl/${p.id}">${p.tracks[0] ? `<img src="${esc(p.tracks[0].cover)}" alt="">` : `<span class="ph">${svg('i-lib')}</span>`}<span><b class="uname">${esc(p.name)}</b><i>Плейлист</i></span></a>`).join('')}
    ${S.savedPl.map(p => `<a href="#playlist/${p.id}"><img src="${esc(p.pic)}" alt=""><span><b class="uname">${esc(p.title)}</b><i>Подборка</i></span></a>`).join('')}
    ${S.albums.map(a => `<a href="#album/${a.id}"><img src="${esc(a.cover)}" alt=""><span><b class="uname">${esc(a.title)}</b><i class="uname">${esc(a.artist)}</i></span></a>`).join('')}
    ${S.artists.map(a => `<a class="round" href="#artist/${a.id}"><img src="${esc(a.picture)}" alt=""><span><b class="uname">${esc(a.name)}</b><i>Исполнитель</i></span></a>`).join('')}
    <button data-act="new-pl"><span class="ph">${svg('i-plus')}</span><span><b>Новый плейлист</b></span></button>
    <button data-act="import"><span class="ph">${svg('i-link')}</span><span><b>Перенести плейлист</b></span></button>
    <button data-act="services"><span class="ph">${svg('i-tune')}</span><span><b>Сервисы</b><i>Яндекс · SoundCloud · YouTube</i></span></button>`;
}

/* ---------------- playback ---------------- */
if (/[?&]app=desktop/.test(location.search)) document.documentElement.classList.add('desktop-app');
let LOCAL = false; Api.cfg.then(c => { LOCAL = !!c.local; document.body.classList.toggle('local', LOCAL); });
const canPlay = t => !!(t.preview || t.src.sc || t.src.yt || LOCAL);
function setColors(c) { const st = document.documentElement.style; st.setProperty('--c1', c[0]); st.setProperty('--c2', c[1]); }
function startQueue(tracks, i, ctx, href, isWave = false) {
  const start = tracks[i];
  tracks = tracks.filter(canPlay);
  if (!tracks.length) return toast('У этих треков нет доступного звука');
  P.queue = tracks.slice(); P.qi = Math.max(0, tracks.indexOf(start)); P.trackWave = null; P.ctx = ctx; P.href = href || ''; P.isWave = isWave;
  playCurrent();
}
let errStreak = 0;
function playCurrent() {
  const t = P.queue[P.qi]; if (!t) return;
  P.track = t; loadTrack(t); if (P.isWave) ymFeedback('trackStarted', t); stopClip(); if (!playerEl.hidden) startClip(t);
  S.history.unshift({ t: slim(t), at: Date.now() }); S.history.length = Math.min(S.history.length, 400); save();
  coverColors(t.cover).then(c => c && P.track === t && setColors(c));
  if (P.trackWave && P.qi >= P.queue.length - 3) trackWaveBatch().then(b => { P.queue.push(...b); renderQueue(); }).catch(() => { });
  if (P.isWave && P.qi >= P.queue.length - 3) fillWaveBuf().then(() => { P.queue.push(...P.waveBuf.splice(0, 6)); renderQueue(); updateWaveCovers(); }).catch(() => { });
  updatePlayerUI(true); refreshRows(); mediaSession(t); updateWaveCovers();
  if (LY.on) loadLyrics(t);
}
// find a full version (SoundCloud / YouTube via Echo server); don't make the user wait more than ~4 s
let playTok = 0;
async function loadTrack(t) {
  const tok = ++playTok; player.stopAll(); player.track = t; player.kind = 'loading'; updatePlayerUI(true); placeYt();
  // a track with a 30 s preview may start it after 8 s; one without waits up to 25 s for the full version (slow VPN / proxy)
  const full = await Promise.race([Api.resolveFull(t).catch(() => null), new Promise(r => setTimeout(() => r('timeout'), t.preview ? 8000 : 25000))]);
  if (tok !== playTok) return;
  if (full === 'timeout' || !full) {
    if (t.preview) { await player.load(t, null); updatePlayerUI(true); placeYt(); return; }
    player.kind = null; return player.onError(t);
  }
  await player.load(t, full); updatePlayerUI(true); placeYt();
}
player.onFullError = t => { Api.forgetFull(t); if (P.track !== t) return; if (t.preview) { player.loadPreview(t); toast('Полная версия недоступна — играю фрагмент'); } else next(false, true); };
player.onState = () => { updatePlayerUI(); refreshRows(); placeYt(); syncClip(); if (player.kind === 'yt') stopClip(); errStreak = player.playing ? 0 : errStreak; };
player.onEnd = () => { if (P.track) { feel(P.track, 'full'); if (P.isWave) ymFeedback('trackFinished', P.track, player.duration); } next(false); };
player.onError = () => { if (++errStreak > 4) { errStreak = 0; return toast('Не удаётся воспроизвести — проверь интернет'); } toast('Трек недоступен — играю следующий'); next(false, true); };
function toggle() { if (!P.track) return startWave(); player.toggle(); }
function next(user = true, force) {
  if (!P.queue.length) return;
  if (user && P.track && !force) { const pos = player.position(), d = player.duration || 30; if (P.isWave && pos < 12) feel(P.track, 'skip'); else if (pos > d * .8) feel(P.track, 'full'); if (P.isWave) ymFeedback(pos > d * .8 ? 'trackFinished' : 'skip', P.track, pos); }
  if (!user && !force && S.repeat === 'one') return playCurrent();
  if (P.qi >= P.queue.length - 1 && (P.isWave || P.trackWave)) { // endless streams never wrap around: fetch more and go on
    const more = P.isWave ? (fillWaveBuf().then(() => P.waveBuf.splice(0, 6))) : trackWaveBatch();
    more.then(b => { if (b && b.length) { P.queue.push(...b); P.qi++; playCurrent(); } else { player.pause(); toast('Волна закончилась — нажми «Слушать» ещё раз'); } }).catch(() => player.pause());
    return;
  }
  if (P.qi < P.queue.length - 1) P.qi++;
  else if (S.repeat === 'all' || user) P.qi = 0;
  else { player.pause(); updatePlayerUI(); return; }
  playCurrent();
}
function prev() { if (player.position() > 4 || P.qi === 0) { player.seek(0); return; } P.qi--; playCurrent(); }
function playList(key, shuf) {
  const L = lists[key]; if (!L || !L.tracks.length) return;
  startQueue(shuf ? shuffle(L.tracks) : L.tracks, 0, L.name, L.href);
}

/* ---------------- player UI ---------------- */
const bar = $('#bar'), playerEl = $('#player');
function likeBtn(b, on) { b.classList.toggle('liked', on); b.innerHTML = svg(on ? 'i-heart-f' : 'i-heart'); b.setAttribute('aria-label', on ? 'Убрать из любимых' : 'Нравится'); }
function updatePlayerUI(full) {
  const t = P.track; if (!t) return;
  bar.hidden = false;
  const playing = player.playing, ic = playing ? 'i-pause' : 'i-play';
  for (const b of [$('#barPlay'), $('#pPlay')]) { b.innerHTML = svg(ic); b.setAttribute('aria-label', playing ? 'Пауза' : 'Играть'); }
  playerEl.classList.toggle('paused', !playing); document.body.classList.toggle('paused', !playing);
  likeBtn($('#pLike'), isLiked(t.key)); likeBtn($('#barLike'), isLiked(t.key));
  for (const b of [$('#pDis'), $('#barDis')]) b.classList.toggle('disl', isDisliked(t));
  for (const b of [$('#pShuffle'), $('#barShuffle')]) b.classList.toggle('on', S.shuffle);
  for (const b of [$('#pRepeat'), $('#barRepeat')]) { b.classList.toggle('on', S.repeat !== 'off'); b.setAttribute('aria-label', { off: 'Повтор выключен', all: 'Повтор очереди', one: 'Повтор трека' }[S.repeat]); b.innerHTML = svg('i-repeat') + (S.repeat === 'one' ? '<small style="position:absolute;font-size:8.5px;font-weight:700">1</small>' : ''); }
  const kind = player.kind, label = kind === 'audio' ? 'фрагмент 30 сек' : kind === 'yt' || kind === 'sc' || kind === 'sca' ? 'полный' : kind === 'loading' ? 'ищу полную версию…' : '';
  for (const e of [$('#barPv'), $('#pPv')]) { e.hidden = !label; e.textContent = label; e.classList.toggle('full', kind === 'yt' || kind === 'sc' || kind === 'sca'); }
  if (full) {
    $('#barTitle').textContent = $('#pTitle').textContent = t.title;
    $('#barArtist').textContent = t.artist; const pa = $('#pArtist'); pa.textContent = t.artist; pa.href = artistHref(t);
    $('#barCover').src = t.cover || BLANK; $('#pmCover').src = t.cover || BLANK; $('#pGhost1').src = $('#pGhost2').src = t.coverXL || t.cover || BLANK; $('#pCtx').textContent = P.ctx;
    $('#pFull').innerHTML = kind === 'sca' && player.via === 'ym' ? '' : (kind === 'sc' || kind === 'sca') && t.src.sc ? `<a href="${esc(t.src.sc.url)}" target="_blank" rel="noopener">${svg('i-ext')}Открыть в SoundCloud</a>`
      : kind === 'yt' ? '' : kind === 'audio' ? `<span>Полный трек — в своём сервисе:</span>${extLinks(t)}` : '';
    if (!playerEl.hidden) { $('#pCover').src = t.coverXL || t.cover || BLANK; $('#pBg').src = t.cover || BLANK; renderQueue(); }
  }
  updateWaveButton();
}
function refreshRows() {
  document.querySelectorAll('.tr').forEach(r => {
    const now = P.track && r.dataset.k === P.track.key; r.classList.toggle('now', !!now);
    const art = r.querySelector('.art'), eq = art.querySelector('.eq');
    if (now && !eq) art.insertAdjacentHTML('beforeend', '<span class="eq"><i></i><i></i><i></i></span>');
    if (!now && eq) eq.remove();
    const lb = r.querySelector('[data-act="like"]'), on = isLiked(r.dataset.k);
    if (lb && lb.classList.contains('liked') !== on) { lb.classList.toggle('liked', on); lb.innerHTML = svg(on ? 'i-heart-f' : 'i-heart'); }
  });
}
let dragging = false;
function tick() {
  if (P.track && !dragging) {
    const pos = player.position(), d = player.duration || 1, f = Math.min(1, pos / d);
    $('#barLine').style.setProperty('--p', f);
    for (const s of [$('#barSeek'), $('#pSeek')]) { s.value = Math.round(f * 1000); s.style.setProperty('--v', f * 100 + '%'); }
    $('#pTime').textContent = $('#barTime').textContent = fmt(pos);
    $('#pDur').textContent = $('#barDur').textContent = fmt(d);
  }
  syncLyrics();
  setTimeout(tick, 250);
}
for (const s of [$('#barSeek'), $('#pSeek')]) {
  s.addEventListener('input', () => { dragging = true; s.style.setProperty('--v', s.value / 10 + '%'); $('#pTime').textContent = $('#barTime').textContent = fmt(s.value / 1000 * player.duration); });
  s.addEventListener('change', () => { dragging = false; player.seek(s.value / 1000 * player.duration); });
}
const vol = $('#vol'); vol.value = S.volume; vol.style.setProperty('--v', S.volume + '%');
function setVol(v, quiet) {
  v = Math.max(0, Math.min(100, Math.round(v))); if (v > 0) S.lastVol = v;
  S.volume = v; vol.value = v; vol.style.setProperty('--v', v + '%'); player.setVolume(v / 100); save();
  $('#volBtn').innerHTML = svg(v ? 'i-vol' : 'i-mute'); $('#volBtn').setAttribute('aria-label', v ? 'Выключить звук' : 'Включить звук');
  if (!quiet) { const b = $('#bar'); b.dataset.vol = v; b.classList.add('vol-show'); clearTimeout(setVol.t); setVol.t = setTimeout(() => b.classList.remove('vol-show'), 900); }
}
vol.addEventListener('input', () => setVol(+vol.value, true));
$('#volBtn').onclick = () => setVol(S.volume ? 0 : (S.lastVol || 70));
$('#bar').querySelector('.volume').addEventListener('wheel', e => { e.preventDefault(); setVol(S.volume + (e.deltaY < 0 ? 5 : -5)); }, { passive: false });
setVol(S.volume, true);

function openPlayer() {
  if (!P.track) return;
  playerEl.hidden = false; playerEl.classList.remove('closing');
  $('#pCover').src = P.track.coverXL || P.track.cover; $('#pBg').src = P.track.cover; renderQueue();
  placeYt(); setTimeout(() => placeYt(), 470);
  startCoverEcho();
  startClip(P.track);
}
function closePlayer() {
  stopClip(); playerEl.classList.add('closing'); $('#queue').classList.remove('open'); setTimeout(() => { playerEl.hidden = true; playerEl.classList.remove('closing'); placeYt(); }, 280); placeYt(true); }
// YouTube's player must stay visible (≥200×200): over the cover in the big player, a small tile otherwise
function placeYt(floating) {
  const b = $('#ytBox'); if (!b) return;
  const on = player.kind === 'yt', open = !playerEl.hidden && !floating && !$('#queue').classList.contains('open');
  if (LOCAL) { // desktop app: the YouTube video is the living background of the player, never a box
    playerEl.classList.toggle('yt-bg', on && open); playerEl.classList.remove('is-video'); $('#pCover').style.visibility = '';
    b.classList.toggle('off', !on); b.classList.remove('tile');
    b.classList.toggle('as-bg', on && open); b.classList.toggle('stash', on && !open);
    b.removeAttribute('style'); return;
  }
  const open2 = open && !LY.on;
  b.classList.toggle('off', !on || (!open2 && !player.playing));
  $('#pCover').style.visibility = on && open2 ? 'hidden' : '';
  playerEl.classList.toggle('is-video', on);
  if (open2) { const r = $('#pVideo').getBoundingClientRect(); Object.assign(b.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', right: 'auto', bottom: 'auto' }); b.classList.remove('tile'); }
  else { b.removeAttribute('style'); b.classList.add('tile'); }
}
window.addEventListener('resize', () => placeYt());
$('#ytClose').onclick = () => player.pause();
function renderQueue() {
  const up = P.queue.slice(P.qi + 1, P.qi + 41);
  lists.queue = { tracks: P.queue, name: P.ctx, href: P.href };
  $('#queueList').innerHTML = up.length ? `<div class="tracks">${up.map((t, k) => row(t, 'queue', P.qi + 1 + k, { noSrc: true })).join('')}</div>` : '<p class="empty">Дальше ничего нет</p>';
}
function mediaSession(t) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album || P.ctx, artwork: [{ src: t.coverXL || t.cover, sizes: '1000x1000', type: 'image/jpeg' }] });
  const h = (a, f) => { try { navigator.mediaSession.setActionHandler(a, f); } catch { } };
  h('play', toggle); h('pause', toggle); h('nexttrack', () => next()); h('previoustrack', prev); h('seekto', d => player.seek(d.seekTime));
}

/* ---------------- lyrics: synced lines, the current one echoes ---------------- */
const LY = { key: null, data: null, idx: -1, on: false };
async function loadLyrics(t) {
  const box = $('#lyrics'); if (!box || !t) return;
  if (LY.key === t.key && LY.data) return;
  LY.key = t.key; LY.data = null; LY.idx = -1;
  box.innerHTML = `<div class="ly-state mono">Ищу текст…</div>`;
  const d = await Api.lyrics(t).catch(() => null);
  if (LY.key !== t.key) return;
  LY.data = d;
  if (!d || d.none || !d.lines.length) { box.innerHTML = `<div class="ly-state"><b>Текста пока нет</b><span class="mono">${d ? 'не нашли в открытой базе' : 'нет связи с базой текстов'}</span></div>`; return; }
  box.innerHTML = `<div class="ly-head mono">${d.synced ? 'Текст · идёт в такт' : 'Текст'}<span>${esc(t.artist)} — ${esc(t.title)}</span></div>
    <div class="ly-lines${d.synced ? ' synced' : ''}">${d.lines.map((l, i) => l.text ? `<p data-i="${i}"${l.t != null ? ` data-t="${l.t}"` : ''}>${esc(l.text)}</p>` : '<p class="gap" aria-hidden="true">·</p>').join('')}</div>
    <div class="ly-foot mono">lrclib.net</div>`;
  box.scrollTop = 0; syncLyrics(true);
}
function syncLyrics(force) {
  if (!LY.on || !LY.data || !LY.data.synced || player.kind === 'audio') return; // 30-second previews have no known offset
  const pos = player.position() + .25, lines = LY.data.lines; let i = -1;
  for (let k = 0; k < lines.length; k++) { if (lines[k].t != null && lines[k].t <= pos) i = k; else if (lines[k].t > pos) break; }
  if (i === LY.idx && !force) return;
  LY.idx = i; const box = $('#lyrics'), ps = box.querySelectorAll('.ly-lines p');
  ps.forEach(p => { const k = +p.dataset.i; p.classList.toggle('now', k === i); p.classList.toggle('past', k < i); });
  const cur = box.querySelector('.ly-lines p.now');
  if (cur && !LY.userScroll) box.scrollTo({ top: cur.offsetTop - box.clientHeight * .36, behavior: force ? 'auto' : 'smooth' });
}
function toggleLyrics(on) {
  LY.on = on ?? !LY.on; playerEl.classList.toggle('lyr-on', LY.on);
  $('#lyricsToggle').classList.toggle('on', LY.on); $('#barLyrics').classList.toggle('on', LY.on);
  if (LY.on && P.track) { loadLyrics(P.track); setTimeout(() => syncLyrics(true), 60); }
  placeYt();
}
$('#lyrics').addEventListener('click', e => { const p = e.target.closest('p[data-t]'); if (p && player.kind !== 'audio') { player.seek(+p.dataset.t); LY.idx = -2; LY.userScroll = false; } });
$('#lyrics').addEventListener('wheel', () => { LY.userScroll = true; clearTimeout(LY.us); LY.us = setTimeout(() => LY.userScroll = false, 3500); }, { passive: true });
$('#lyrics').addEventListener('touchmove', () => { LY.userScroll = true; clearTimeout(LY.us); LY.us = setTimeout(() => LY.userScroll = false, 3500); }, { passive: true });
$('#lyricsToggle').onclick = () => toggleLyrics();
$('#pEq').onclick = $('#barEq').onclick = () => eqSheet();
$('#pTrackWave').onclick = () => P.track && startTrackWave(P.track);
$('#barLyrics').onclick = () => { if (!P.track) return; if ($('#player').hidden) openPlayer(); toggleLyrics(true); };

/* ---------------- sound: 10-band EQ over a live spectrum + Echo Space ---------------- */
const EQ_PRESETS = {
  flat: { name: 'Ровно', g: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  bass: { name: 'Бас', g: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0] },
  vocal: { name: 'Голос', g: [-2, -2, -1, 0, 2, 4, 4, 3, 1, 0] },
  club: { name: 'Клуб', g: [5, 4, 1, 0, -2, 0, 1, 3, 4, 5] },
  rock: { name: 'Рок', g: [4, 3, 2, 0, -1, -1, 1, 3, 4, 4] },
  night: { name: 'Ночь', g: [2, 2, 1, 0, 0, -1, -2, -3, -3, -4] },
  space: { name: 'Echo Space', g: [2, 1, 0, 0, 0, 0, 1, 2, 2, 2], space: .45 },
};
S.eq = Object.assign({ preset: 'flat', gains: EQ_PRESETS.flat.g.slice(), space: 0 }, S.eq);
player.setEq(S.eq.gains); player.setSpace(S.eq.space);
let eqRaf = 0;
function eqSheet() {
  const names = ['32', '64', '125', '250', '500', '1K', '2K', '4K', '8K', '16K'];
  openSheet(`<div class="eq-head"><div><span class="eyebrow mono">Echo · звук</span><h3>Эквалайзер</h3></div><button class="ib" data-act="close" aria-label="Закрыть">${svg('i-close')}</button></div>
    <div class="eq-stage"><canvas id="eqCanvas"></canvas><div class="eq-note mono" id="eqNote"></div></div>
    <div class="eq-freqs mono">${names.map(n => `<span>${n}</span>`).join('')}</div>
    <div class="eq-presets">${Object.entries(EQ_PRESETS).map(([k, p]) => `<button class="${S.eq.preset === k ? 'on' : ''}" data-act="eq-preset" data-p="${k}">${p.name}</button>`).join('')}</div>
    <div class="space-box"><div><b>Echo Space</b><small>Фирменное пространство Echo: звук раскрывается, как эхо в зале. Отражения идут слева и справа, а хвост мягко затухает.</small></div>
      <div class="space-ctl"><span class="mono">Сухо</span><input type="range" class="seek" id="spaceRange" min="0" max="100" value="${Math.round(S.eq.space * 100)}" style="--v:${Math.round(S.eq.space * 100)}%" aria-label="Echo Space"><span class="mono">Зал</span></div></div>`, sh => {
    sh.classList.add('eq-sheet');
    const r = sh.querySelector('#spaceRange');
    r.oninput = () => { S.eq.space = +r.value / 100; r.style.setProperty('--v', r.value + '%'); player.setSpace(S.eq.space); save(); };
    startEqCanvas(sh.querySelector('#eqCanvas'));
  });
}
function startEqCanvas(c) {
  cancelAnimationFrame(eqRaf);
  const g = c.getContext('2d'), DPR = Math.min(2, devicePixelRatio || 1), B = Player.BANDS, MAXDB = 12;
  let drag = -1, peaks = new Float32Array(96);
  const geo = () => { const w = c.clientWidth, h = c.clientHeight, pad = 22; return { w, h, pad, x: i => pad + i * (w - pad * 2) / (B.length - 1), y: db => h / 2 - db / MAXDB * (h / 2 - 20) }; };
  const pick = e => { const r = c.getBoundingClientRect(), G = geo(), px = e.clientX - r.left; let best = 0; B.forEach((_, i) => { if (Math.abs(G.x(i) - px) < Math.abs(G.x(best) - px)) best = i; }); return best; };
  const setFrom = e => { const r = c.getBoundingClientRect(), G = geo(); const db = Math.max(-MAXDB, Math.min(MAXDB, (G.h / 2 - (e.clientY - r.top)) / (G.h / 2 - 20) * MAXDB)); S.eq.gains[drag] = Math.round(db * 2) / 2; S.eq.preset = 'custom'; player.setEq(S.eq.gains); };
  c.onpointerdown = e => { drag = pick(e); c.setPointerCapture(e.pointerId); setFrom(e); document.querySelectorAll('.eq-presets button').forEach(b => b.classList.remove('on')); };
  c.onpointermove = e => { if (drag >= 0) setFrom(e); };
  c.onpointerup = c.onpointercancel = () => { if (drag >= 0) save(); drag = -1; };
  c.ondblclick = e => { const i = pick(e); S.eq.gains[i] = 0; player.setEq(S.eq.gains); save(); };
  const loop = () => {
    if (!c.isConnected) return;
    const G = geo(); if (c.width !== Math.round(G.w * DPR)) { c.width = Math.round(G.w * DPR); c.height = Math.round(G.h * DPR); }
    g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, G.w, G.h);
    // grid
    g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1;
    for (const db of [-12, -6, 0, 6, 12]) { g.setLineDash(db ? [2, 6] : []); g.beginPath(); g.moveTo(G.pad, G.y(db)); g.lineTo(G.w - G.pad, G.y(db)); g.stroke(); }
    g.setLineDash([]);
    // live spectrum: log-spaced bars, mirrored like a reflection on glass
    const f = player.spectrum(), n = peaks.length, sr = player.ctx ? player.ctx.sampleRate : 44100;
    $('#eqNote').textContent = f ? '' : player.fxAvailable || !P.track ? (player.playing ? '' : 'включи трек — увидишь спектр') : 'YouTube играет в своём плеере — эквалайзер работает для SoundCloud и Яндекса';
    for (let i = 0; i < n; i++) {
      let v = 0;
      if (f) { const f0 = 25 * Math.pow(18000 / 25, i / n), f1 = 25 * Math.pow(18000 / 25, (i + 1) / n); const b0 = Math.floor(f0 / (sr / 2) * f.length), b1 = Math.max(b0 + 1, Math.floor(f1 / (sr / 2) * f.length)); for (let k = b0; k < b1 && k < f.length; k++) v = Math.max(v, f[k]); v /= 255; }
      peaks[i] = Math.max(v, peaks[i] * .94);
      const x = G.pad + (i + .5) * (G.w - G.pad * 2) / n, hh = v * (G.h / 2 - 18), ph = peaks[i] * (G.h / 2 - 18);
      g.fillStyle = `rgba(236,235,231,${.18 + v * .6})`; g.fillRect(x - 1.5, G.h / 2 - hh, 3, hh);
      g.fillStyle = `rgba(236,235,231,${.05 + v * .12})`; g.fillRect(x - 1.5, G.h / 2, 3, hh * .6);
      g.fillStyle = 'rgba(236,235,231,.55)'; g.fillRect(x - 1.5, G.h / 2 - ph - 3, 3, 1.5);
    }
    // EQ curve: smooth line through the bands, glowing
    const pts = S.eq.gains.map((db, i) => [G.x(i), G.y(db)]);
    g.save(); g.shadowColor = 'rgba(255,255,255,.7)'; g.shadowBlur = 14; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[Math.max(0, i - 1)], [x1, y1] = pts[i], [x2, y2] = pts[i + 1], [x3, y3] = pts[Math.min(pts.length - 1, i + 2)]; g.bezierCurveTo(x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6, x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6, x2, y2); }
    g.stroke(); g.restore();
    pts.forEach(([x, y], i) => { g.beginPath(); g.arc(x, y, i === drag ? 7 : 5, 0, Math.PI * 2); g.fillStyle = '#0c0c0d'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
      if (i === drag) { g.fillStyle = '#fff'; g.font = '11px Mono, monospace'; g.textAlign = 'center'; g.fillText((S.eq.gains[i] > 0 ? '+' : '') + S.eq.gains[i] + ' dB', x, y - 14); } });
    eqRaf = requestAnimationFrame(loop);
  };
  eqRaf = requestAnimationFrame(loop);
}
function applyPreset(k) {
  const p = EQ_PRESETS[k]; S.eq.preset = k; S.eq.gains = p.g.slice(); if (p.space !== undefined) S.eq.space = p.space; else if (k === 'flat') S.eq.space = 0;
  player.setEq(S.eq.gains); player.setSpace(S.eq.space); save();
  document.querySelectorAll('.eq-presets button').forEach(b => b.classList.toggle('on', b.dataset.p === k));
  const r = $('#spaceRange'); if (r) { r.value = Math.round(S.eq.space * 100); r.style.setProperty('--v', r.value + '%'); }
}

/* ---------------- background clip: the track's music video, silent, behind the player ---------------- */
let clipPlayer = null, clipFor = null;
async function startClip(t) {
  if (!t || playerEl.hidden || player.kind === 'yt') return;
  clipFor = t.key;
  const id = await Api.clip(t); if (!id || clipFor !== t.key || playerEl.hidden || player.kind === 'yt') return;
  await player.loadYtApi();
  const start = Math.max(0, Math.floor(player.position()));
  const host = $('#pClip'); host.classList.remove('on');
  const vars = { autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0, loop: 1, playlist: id, start };
  if (!clipPlayer) {
    host.innerHTML = '<div id="pClipFrame"></div>';
    clipPlayer = new YT.Player('pClipFrame', { videoId: id, playerVars: vars, events: {
      onReady: e => { e.target.mute(); e.target.playVideo(); },
      onStateChange: e => { if (e.data === 1) host.classList.add('on'); },
      onError: () => host.classList.remove('on') } });
  } else { clipPlayer.loadVideoById({ videoId: id, startSeconds: start }); clipPlayer.mute(); }
}
function stopClip() { clipFor = null; const h = $('#pClip'); if (h) h.classList.remove('on'); try { clipPlayer && clipPlayer.pauseVideo(); } catch { } }
function syncClip() { if (!clipPlayer || !clipPlayer.getPlayerState) return; try { const st = clipPlayer.getPlayerState(); if (player.playing && st === 2) clipPlayer.playVideo(); if (!player.playing && st === 1) clipPlayer.pauseVideo(); } catch { } }

/* ---------------- echo cover: the artwork throws echoes on bass hits ---------------- */
let echoRaf = 0, bassAvg = 0, kick = 0;
function startCoverEcho() {
  cancelAnimationFrame(echoRaf);
  const art = document.querySelector('.player-art'); if (!art) return;
  const loop = () => {
    if (playerEl.hidden) return;
    const lv = player.level();
    const f = player.spectrum();
    if (f) { // onset = sudden rise of low-frequency energy compared with its recent average
      let e = 0; for (let i = 1; i < 10; i++) e += f[i]; e /= 9 * 255;
      const flux = Math.max(0, e - (startCoverEcho.prev || 0)); startCoverEcho.prev = e;
      bassAvg = bassAvg * .9 + flux * .1;
      if (flux > Math.max(.03, bassAvg * 2.2) && performance.now() - (startCoverEcho.last || 0) > 230) { kick = 1; startCoverEcho.last = performance.now(); } else kick *= .88;
    } else if (player.playing) { const ph = (performance.now() / 500) % 1; kick = ph < .05 ? 1 : kick * .9; } // YouTube audio can't be read: steady 120 bpm pulse
    else kick *= .9;
    for (const el of [art, playerEl]) { el.style.setProperty('--kick', kick.toFixed(3)); el.style.setProperty('--lvl', lv.toFixed(3)); }
    echoRaf = requestAnimationFrame(loop);
  };
  echoRaf = requestAnimationFrame(loop);
}

/* ---------------- wave from a track: the artist + similar artists, endless ---------------- */
async function startTrackWave(t) {
  toast('Собираю волну по треку…');
  let id = t.artistId; if (!id) { const a = await Api.artistByName(mainArtistName(t.artist)).catch(() => null); id = a && a.id; }
  if (!id) return toast('Не нашли исполнителя для волны');
  const rel = await DZ(`/artist/${id}/related?limit=12`, 60).then(d => d.data.map(a => a.id)).catch(() => []);
  P.trackWave = { ids: [id, ...rel], seed: t };
  const batch = await trackWaveBatch(); if (!batch.length) return toast('Похожей музыки не нашлось');
  startQueue([t, ...batch.filter(x => matchKey(x) !== matchKey(t))], 0, 'Волна: ' + t.title, '');
  P.trackWave = { ids: [id, ...rel], seed: t };
}
async function trackWaveBatch() {
  const tw = P.trackWave; if (!tw) return [];
  const pick = [tw.ids[0], ...shuffle(tw.ids.slice(1)).slice(0, 2)];
  const all = (await Promise.all(pick.map(id => Api.artistRadio(id).catch(() => [])))).flat();
  const seen = new Set([...P.queue.map(matchKey), ...dislikedSet()]);
  return byTaste(all.filter(x => canPlay(x) && !seen.has(matchKey(x)) && !artistBanned(x.artist) && seen.add(matchKey(x)))).slice(0, 14);
}

/* ---------------- sheets ---------------- */
const wrap = $('#sheetWrap'), sheet = $('#sheet'); let lastFocus;
function openSheet(html, onMount) {
  lastFocus = document.activeElement; sheet.innerHTML = html; wrap.hidden = false; sheet.classList.remove('closing');
  onMount && onMount(sheet);
  const f = sheet.querySelector('input,button'); f && setTimeout(() => f.focus({ preventScroll: true }), 60);
}
function closeSheet() { if (wrap.hidden) return; sheet.classList.add('closing'); setTimeout(() => { wrap.hidden = true; lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true }); }, 220); }
$('#sheetDim').onclick = closeSheet;
let toastT;
function toast(m, action) {
  const t = $('#toast'); t.textContent = m; t.classList.toggle('has-act', !!action);
  if (action) { const b = document.createElement('button'); b.textContent = action.label; b.onclick = () => { t.classList.remove('show'); action.fn(); }; t.append(b); }
  t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), action ? 5000 : 2600);
}

function trackMenu(t, listKey) {
  const inPl = listKey === 'upl' && lists.upl && lists.upl.pl;
  openSheet(`<div class="sheet-track"><img src="${esc(t.cover)}" alt=""><div><b>${esc(t.title)}</b><small>${esc(t.artist)}${t.album ? ' · ' + esc(t.album) : ''}</small></div></div>
    <button class="act" data-act="like" data-k="${esc(t.key)}">${svg(isLiked(t.key) ? 'i-heart-f' : 'i-heart')}${isLiked(t.key) ? 'Убрать из любимых' : 'Нравится'}</button>
    <button class="act" data-act="${isDisliked(t) ? 'undislike' : 'dislike'}" data-k="${esc(t.key)}">${svg('i-dislike')}${isDisliked(t) ? 'Убрать дизлайк' : 'Не нравится'}<small>волна учтёт</small></button>
    <button class="act" data-act="next-up" data-k="${esc(t.key)}">${svg('i-next-up')}Играть следующим</button>
    <button class="act" data-act="add-to" data-k="${esc(t.key)}">${svg('i-plus')}Добавить в плейлист</button>
    ${inPl ? `<button class="act danger" data-act="rm-from" data-k="${esc(t.key)}" data-pl="${lists.upl.pl}">${svg('i-trash')}Убрать из плейлиста</button>` : ''}
    <a class="act" href="${artistHref(t)}">${svg('i-user')}К исполнителю</a>
    ${t.albumId ? `<a class="act" href="#album/${t.albumId}">${svg('i-disc')}К альбому<small>${esc(t.album)}</small></a>` : ''}
    <a class="act" href="#" data-act="artist-wave-t" data-k="${esc(t.key)}">${svg('i-home')}Волна по треку</a>
    <button class="act danger" data-act="ban-artist" data-k="${esc(t.key)}">${svg('i-close')}Не рекомендовать ${esc(mainArtistName(t.artist))}</button>
    <div class="act-sep"></div>
    <p class="hint" style="margin:8px 4px">Слушать полностью:</p><div class="full-in" style="justify-content:flex-start">${extLinks(t)}</div>`);
}
function addToMenu(t) {
  openSheet(`<h3>Добавить в плейлист</h3><p class="hint">${esc(t.title)} — ${esc(t.artist)}</p>
    <button class="pick" data-act="new-pl" data-k="${esc(t.key)}"><span class="ph">${svg('i-plus')}</span><b>Новый плейлист</b></button>
    ${S.playlists.map(p => `<button class="pick" data-act="add-pl" data-k="${esc(t.key)}" data-pl="${p.id}">${p.tracks[0] ? `<img src="${esc(p.tracks[0].cover)}" alt="">` : `<span class="ph">${svg('i-lib')}</span>`}<span><b>${esc(p.name)}</b><small>${p.tracks.some(x => x.key === t.key) ? 'Уже здесь' : nTracks(p.tracks.length)}</small></span></button>`).join('')}`);
}
function nameSheet(title, value, onOk) {
  openSheet(`<h3>${title}</h3><form id="nameForm"><label class="field"><input type="text" id="plName" maxlength="60" value="${esc(value)}" placeholder="Название"></label>
    <div class="sheet-foot"><button type="button" class="btn" data-act="close">Отмена</button><button class="btn pri">Готово</button></div></form>`, s => {
    s.querySelector('#nameForm').onsubmit = e => { e.preventDefault(); const v = s.querySelector('#plName').value.trim(); if (!v) return toast('Введи название'); onOk(v); };
  });
}
function newPlaylist(t) {
  nameSheet('Новый плейлист', `Мой плейлист ${S.playlists.length + 1}`, name => {
    const p = { id: 'p' + Date.now().toString(36), name, tracks: t ? [slim(t)] : [] };
    S.playlists.push(p); save(); closeSheet(); toast(t ? `Добавили в «${name}»` : 'Плейлист создан');
    if (!t) location.hash = '#pl/' + p.id; else renderRail();
  });
}
function plMenu(pid) {
  const p = S.playlists.find(x => x.id === pid);
  openSheet(`<h3>${esc(p.name)}</h3><p class="hint">${nTracks(p.tracks.length)}</p>
    <button class="act" data-act="rename-pl" data-pl="${pid}">${svg('i-edit')}Переименовать</button>
    <button class="act danger" data-act="del-pl" data-pl="${pid}">${svg('i-trash')}<span>Удалить плейлист</span></button>`);
}
function chipGroup(title, key, items, multi) {
  const v = S._draft[key];
  return `<div class="ws-group"><b>${title}</b><div class="chips">${multi ? `<button class="chip${!v.length ? ' on' : ''}" data-act="ws" data-k="${key}" data-v="">Любые</button>` : ''}
    ${items.map(it => { const on = multi ? v.includes(it.id) : v === it.id; return `<button class="chip${on ? ' on' : ''}" data-act="ws" data-k="${key}" data-v="${it.id}">${it.name}</button>`; }).join('')}</div></div>`;
}
function waveSheet() {
  S._draft = S._draft || JSON.parse(JSON.stringify(S.wave)); const d = S._draft;
  openSheet(`<h3>Настроить волну</h3><p class="hint">Echo подберёт треки из подборок и чартов, а лайки и пропуски уточнят выбор.</p>
    ${chipGroup('Настроение', 'mood', [{ id: 'any', name: 'Любое' }, ...MOODS])}
    ${chipGroup('Занятие', 'act', [{ id: 'any', name: 'Любое' }, ...ACTS])}
    ${chipGroup('Жанры', 'genres', GENRES, true)}
    ${chipGroup('Эпоха', 'eras', ERAS, true)}
    ${chipGroup('Язык', 'lang', LANGS)}
    ${chipGroup('Темп', 'tempo', TEMPOS)}
    <div class="ws-group"><b>Знакомое или новое</b><div class="slider-row"><span>Знакомое</span><input type="range" class="seek" id="nov" min="0" max="100" value="${d.novelty}" style="--v:${d.novelty}%" aria-label="Знакомое или новое"><span>Новое</span></div></div>
    <div class="sheet-foot"><button class="btn" data-act="ws-reset">Сбросить</button><button class="btn pri" data-act="ws-done">Готово</button></div>`, s => {
    const n = s.querySelector('#nov'); n.oninput = () => { d.novelty = +n.value; n.style.setProperty('--v', n.value + '%'); };
  });
}
function rerenderWaveSheet() { const top = sheet.scrollTop; waveSheet(); sheet.scrollTop = top; sheet.style.animation = 'none'; requestAnimationFrame(() => sheet.style.animation = ''); }

/* ---------------- import: Echo finds the tracks itself ---------------- */
function importSheet() {
  openSheet(`<h3>Перенести плейлист</h3><p class="hint">Вставь ссылку Spotify, Deezer, SoundCloud или просто список треков — Echo сам найдёт каждую песню целиком в Яндексе, SoundCloud или на YouTube.</p>
    <form id="impForm"><label class="field"><textarea id="impText" rows="7" placeholder="Ссылка на плейлист или альбом Spotify, плейлист Deezer, трек SoundCloud&#10;— или список, по треку в строке:&#10;Земфира — Хочешь?&#10;Кино - Группа крови&#10;Arctic Monkeys – 505" style="width:100%;padding:12px 14px;border-radius:8px;background:rgba(255,255,255,.07);border:1px solid var(--line);outline:none;font:inherit;font-size:15px;color:inherit;resize:vertical"></textarea></label>
    <label class="field"><input type="text" id="impName" placeholder="Название плейлиста (необязательно)"></label>
    <p class="hint" style="font-size:12px">Список треков из Яндекс Музыки, Apple Music или Spotify можно скопировать прямо со страницы плейлиста.</p>
    <div id="impProg" class="hint"></div>
    <div class="sheet-foot"><button type="button" class="btn" data-act="close">Отмена</button><button class="btn pri" id="impGo">Перенести</button></div></form>`, s => {
    s.querySelector('#impForm').onsubmit = e => { e.preventDefault(); runImport(s.querySelector('#impText').value, s.querySelector('#impName').value.trim()); };
  });
}
async function runImport(text, name) {
  text = text.trim(); if (!text) return toast('Вставь ссылку или список');
  const prog = $('#impProg'), go = $('#impGo'); go.disabled = true;
  try {
    if (SPOTIFY_RE.test(text) && LOCAL) {
      prog.textContent = 'Читаю Spotify…';
      const d = await Api.spotify(text.match(/\S*spotify\S*/)[0]);
      if (!d.tracks.length) throw new Error('пусто');
      return finishImport(name || d.name || 'Из Spotify', d.tracks, 'Spotify');
    }
    const dz = text.match(/deezer\.com\/(?:\w+\/)?playlist\/(\d+)/);
    if (dz) { const { p, tracks } = await Api.playlist(dz[1]); return finishImport(name || p.title, tracks, 'Deezer'); }
    const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean).slice(0, 150);
    const scLinks = lines.filter(l => /soundcloud\.com\//i.test(l));
    if (scLinks.length === lines.length) {
      const ts = (await Promise.all(scLinks.map(u => Api.soundcloud(u).catch(() => null)))).filter(Boolean);
      return finishImport(name || 'Из SoundCloud', ts, 'SoundCloud');
    }
    const items = lines.map(l => l.replace(/^\d+[.)]\s*/, '').replace(/\s+\d{1,2}:\d{2}$/, '')).filter(l => l.length > 1 && !/^https?:/.test(l));
    const found = new Array(items.length); let done = 0, hit = 0;
    const work = async i => {
      const q = items[i].replace(/\s+[—–-]\s+/, ' ');
      const r = await Api.search(q).catch(() => null);
      const parts = items[i].split(/\s+[—–-]\s+/);
      let best = r && r.tracks.find(t => parts.length > 1 && norm(t.artist).includes(norm(parts[0]).slice(0, 12)) && canPlay(t)) || (r && r.tracks.find(canPlay));
      found[i] = best || null; if (best) hit++;
      prog.textContent = `Ищу: ${++done} из ${items.length} · найдено ${hit}`;
    };
    for (let i = 0; i < items.length; i += 4) await Promise.all([i, i + 1, i + 2, i + 3].filter(j => j < items.length).map(work));
    const miss = items.filter((_, i) => !found[i]);
    finishImport(name || 'Перенесённый плейлист', found.filter(Boolean), 'списка', miss);
  } catch { toast('Не получилось — проверь ссылку'); go.disabled = false; }
}
// Spotify imports carry only titles: fetch artwork (and artist/album links) in the background
async function enrichCovers(pl) {
  for (const t of pl.tracks) {
    if (!t.src.sp || t.enriched) continue;
    const c = await Api.coverFor(t); t.enriched = true;
    if (c) { Object.assign(t, c); const live = T.get(t.key); if (live) Object.assign(live, c); }
    if (pl.tracks.indexOf(t) % 6 === 5) { save(); if (route === 'pl/' + pl.id) render(true); renderRail(); }
  }
  save(); if (route === 'pl/' + pl.id) render(true); renderRail();
}
function finishImport(name, tracks, from, miss = []) {
  if (!tracks.length) { toast('Ничего не нашли'); $('#impGo').disabled = false; return; }
  const p = { id: 'p' + Date.now().toString(36), name, tracks: tracks.map(t => slim(reg(t))), from };
  S.playlists.push(p); save(); closeSheet();
  if (from === 'Spotify') enrichCovers(p);
  toast(`Перенесено ${nTracks(tracks.length)}${miss.length ? `, не нашли ${miss.length}` : ''}`);
  location.hash = '#pl/' + p.id;
}

/* ---------------- services: Yandex Music account, SoundCloud / YouTube status ---------------- */
async function servicesSheet() {
  const c = await Api.cfg, y = c.ym || { connected: false };
  const row = (short, name, status, actions) => `<div class="svc-row"><span class="svc-badge">${short}</span><div class="svc-text"><b>${name}</b><small>${status}</small></div><div class="svc-act">${actions}</div></div>`;
  openSheet(`<h3>Сервисы</h3><p class="hint">Echo ищет треки во всех сервисах сразу и включает полную версию из лучшего источника.</p>
    ${c.local ? row('ЯМ', 'Яндекс Музыка', y.connected ? `${esc(y.name || y.login || 'аккаунт подключён')} · ${y.plus ? 'Плюс активен' : 'без Плюса — только фрагменты'}` : 'Войди — поиск по Яндексу и полные треки по твоей подписке',
      y.connected ? `<button class="btn" data-act="ym-likes">${lab('Импорт «Мне нравится»')}</button><button class="btn quiet" data-act="ym-logout">${lab('Выйти')}</button>` : (c.app ? `<button class="btn pri" data-act="ym-login">${lab('Войти через Яндекс')}</button>` : ''))
      + (y.connected ? '' : `<details class="svc-token"><summary>Вставить токен вручную</summary><form id="ymTokForm"><label class="field"><input type="text" id="ymTok" placeholder="access_token=… или сам токен" autocomplete="off"></label><button class="btn">${lab('Подключить')}</button></form></details>`)
    : row('ЯМ', 'Яндекс Музыка', 'Недоступно в веб-версии', '')}
    ${c.local ? row('SP', 'Spotify', c.sp && c.sp.connected ? 'Поиск по каталогу Spotify включён · играем полностью из других сервисов' : 'Ссылки работают всегда. Для прямого поиска — бесплатный ключ разработчика',
      c.sp && c.sp.connected ? `<button class="btn quiet" data-act="sp-off">${lab('Отключить')}</button>` : '') + (c.sp && c.sp.connected ? '' : `<details class="svc-token"><summary>Подключить поиск Spotify</summary>
      <p style="margin:6px 0">developer.spotify.com/dashboard → Create app (Redirect URI: http://127.0.0.1) → Settings → скопируй Client ID и Client Secret.</p>
      <form id="spKeyForm"><label class="field"><input type="text" id="spId" placeholder="Client ID" autocomplete="off"></label><label class="field"><input type="password" id="spSecret" placeholder="Client Secret" autocomplete="off"></label><button class="btn">${lab('Подключить')}</button></form></details>`) : ''}
    ${row('SC', 'SoundCloud', c.local ? 'Работает без входа · полные треки' : 'Ссылки на треки играют полностью', '<span class="ok">✓</span>')}
    ${row('YT', 'YouTube', c.local ? 'Работает без входа · полные треки' : (c.yt ? 'Подключён' : 'Нужен ключ в config.js'), c.local || c.yt ? '<span class="ok">✓</span>' : '')}
    ${row('DZ', 'Deezer · Apple Music', 'Чарты, обложки, исполнители, альбомы', '<span class="ok">✓</span>')}
    ${c.local ? `<div class="svc-net"><b>Сеть</b><small>Если SoundCloud или YouTube открываются только с VPN: включи VPN на весь компьютер — Echo пойдёт через него сам. Если VPN работает как прокси (v2rayN, Clash, Hiddify…), впиши его адрес.</small>
      <form id="proxyForm"><label class="field"><input type="text" id="proxyIn" value="${esc(c.proxy || '')}" placeholder="127.0.0.1:10809 или socks5://127.0.0.1:10808" autocomplete="off"></label><button class="btn">${lab('Сохранить')}</button></form>
      <button class="btn" data-act="diag">${svg('i-tune')}${lab('Проверить сервисы')}</button><div id="diagOut" class="diag-out mono"></div></div>` : ''}`, s => {
    const pf = s.querySelector('#proxyForm'); if (pf) pf.onsubmit = async e => { e.preventDefault(); const v = s.querySelector('#proxyIn').value; const d = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proxy: v }) }).then(r => r.json()); (await Api.cfg).proxy = d.proxy || ''; for (const k of Object.keys(memo)) if (/^(scs|yts|ytms)/.test(k)) memo.delete(k); toast(d.proxy ? 'Прокси сохранён: ' + d.proxy : 'Прокси выключен — системные настройки'); };
    const sf = s.querySelector('#spKeyForm'); if (sf) sf.onsubmit = async e => { e.preventDefault(); const d = await Api.spKey(s.querySelector('#spId').value, s.querySelector('#spSecret').value); toast(d.connected ? 'Spotify подключён — ищу и там' : 'Ключ не подошёл' + (d.error ? ': ' + d.error : '')); for (const k of Object.keys(memo)) if (k.startsWith('dz/search') || k.startsWith('sps')) memo.delete(k); servicesSheet(); };
    const f = s.querySelector('#ymTokForm'); if (f) f.onsubmit = async e => { e.preventDefault(); try { const st = await Api.ymPost('token', { token: s.querySelector('#ymTok').value }); afterYm(st); } catch (er) { toast('Токен не подошёл: ' + er.message); } };
  });
}
function afterYm(st) {
  if (!st.connected) return toast('Не получилось войти' + (st.error ? ': ' + st.error : ''));
  for (const k of Object.keys(memo)) if (k.startsWith('yms')) memo.delete(k);
  toast(`Яндекс Музыка подключена${st.plus ? ' · Плюс активен' : ' — но без Плюса будут только фрагменты'}`);
  servicesSheet(); render(true);
}
async function importYmLikes() {
  toast('Забираю «Мне нравится» из Яндекса…');
  try {
    const ts = await Api.ymLikes(), have = new Set(S.liked.map(matchKey)); let n = 0;
    for (const t of ts.reverse()) if (!have.has(matchKey(t))) { S.liked.unshift(slim(reg(t))); feel(t, 'like'); n++; }
    save(); renderRail(); render(true);
    toast(`Перенесено ${nTracks(n)} из Яндекс Музыки${ts.length - n ? ` · ${ts.length - n} уже были` : ''}`);
  } catch (e) { toast('Не получилось: ' + e.message); }
}

/* ---------------- dislike ---------------- */
function dropUpcoming(pred) {
  P.waveBuf = P.waveBuf.filter(t => !pred(t));
  const head = P.queue.slice(0, P.qi + 1), rest = P.queue.slice(P.qi + 1).filter(t => !pred(t));
  P.queue = [...head, ...rest];
}
function dislike(t, wholeArtist) {
  if (P.isWave && P.track && P.track.key === t.key) ymFeedback('skip', t, player.position());
  const li = S.liked.findIndex(x => x.key === t.key); if (li >= 0) S.liked.splice(li, 1);
  const wasBanned = artistBanned(t.artist);
  if (wholeArtist) { S.taste.a[aKey(t.artist)] = Math.min(artistScore(t.artist), BAN); if (t.artistId) S.taste.ids[aKey(t.artist)] = t.artistId; }
  else { if (!isDisliked(t)) S.disliked.unshift(slim(t)); feel(t, 'dislike'); }
  save();
  const mk = matchKey(t), banned = artistBanned(t.artist);
  dropUpcoming(x => matchKey(x) === mk || (banned && aKey(x.artist) === aKey(t.artist)));
  const isNow = P.track && P.track.key === t.key;
  if (isNow) next(false, true); else renderQueue();
  if (banned && !wasBanned) toast(`Больше не будем ставить ${mainArtistName(t.artist)}`, { label: 'Вернуть', fn: () => unbanArtist(t.artist) });
  else toast('Понятно, такое не ставим', { label: 'Отменить', fn: () => undislike(t) });
  refreshRows(); renderRail(); updateWaveButton();
}
function undislike(t) {
  const n = S.disliked.length; S.disliked = S.disliked.filter(x => x.key !== t.key && matchKey(x) !== matchKey(t));
  if (S.disliked.length !== n) feel(t, 'undislike');
  save(); refreshRows(); if (route.startsWith('library/hidden')) render(true);
}
function unbanArtist(name) { S.taste.a[aKey(name)] = 0; save(); toast('Исполнитель снова в волне'); if (route.startsWith('library/hidden')) render(true); }

/* ---------------- events ---------------- */
const trackOf = el => { const r = el.closest('[data-k]'); return r && T.get(r.dataset.k); };
function toggleLike(t) {
  const i = S.liked.findIndex(x => x.key === t.key);
  if (i >= 0) { S.liked.splice(i, 1); feel(t, 'unlike'); } else { S.liked.unshift(slim(t)); S.disliked = S.disliked.filter(x => matchKey(x) !== matchKey(t)); feel(t, 'like'); }
  save(); toast(i >= 0 ? 'Убрали из «Мне нравится»' : 'Добавили в «Мне нравится»'); refreshRows(); updatePlayerUI(); renderRail();
}
document.addEventListener('click', async e => {
  const nav = e.target.closest('[data-view]'); if (nav) { location.hash = '#' + nav.dataset.view; return; }
  const el = e.target.closest('[data-act]');
  if (!el) {
    const r = e.target.closest('.tr, .vcard'); if (r && !e.target.closest('a')) {
      const t = T.get(r.dataset.k), L = lists[r.dataset.list];
      if (P.track && P.track.key === t.key) return toggle();
      if (r.dataset.list === 'queue') { P.qi = +r.dataset.i; return playCurrent(); }
      startQueue(L.tracks, +r.dataset.i, L.name, L.href);
    }
    return;
  }
  const a = el.dataset.act;
  if (el.tagName === 'A' && a) e.preventDefault();
  if (el.closest('.card') && a.startsWith('play-')) e.preventDefault();
  switch (a) {
    case 'like': { const t = el.dataset.k ? T.get(el.dataset.k) : trackOf(el); toggleLike(t); if (el.classList.contains('act')) closeSheet(); break; }
    case 'srcf': searchSrc = el.dataset.s; drawSearch(); break;
    case 'fullonly': fullOnly = el.dataset.v === '1'; drawSearch(); break;
    case 'sp-save': { const d = lastSearch.res.spotify; finishImport(d.name, d.tracks, 'Spotify'); break; }
    case 'services': servicesSheet(); break;
    case 'diag': {
      const out = $('#diagOut'); out.textContent = 'Проверяю SoundCloud, YouTube, Яндекс… (до минуты)';
      const d = await fetch('/api/diag').then(r => r.json()).catch(e => ({ error: e.message }));
      const line = (n, x) => !x ? '' : `${n}: ${x.ok ? (x.skipped ? '— ' + x.skipped : 'работает ✓') : 'НЕ РАБОТАЕТ — ' + x.error} (${x.ms} мс)`;
      out.innerHTML = [line('SoundCloud', d.soundcloud), line('YouTube', d.youtube), line('Яндекс', d.yandex), d.log ? 'журнал: ' + esc(d.log) : '', d.error ? esc(d.error) : ''].filter(Boolean).map(x => `<div>${esc(x)}</div>`).join('');
      break;
    }
    case 'sp-off': await Api.spKey('', ''); toast('Поиск Spotify отключён'); servicesSheet(); break;
    case 'eq-preset': applyPreset(el.dataset.p); break;
    case 'ym-login': { toast('Открываю вход в Яндекс…'); try { afterYm(await Api.ymPost('login')); } catch (er) { toast(er.message); } break; }
    case 'ym-logout': { await Api.ymPost('logout'); toast('Яндекс Музыка отключена'); servicesSheet(); break; }
    case 'ym-likes': closeSheet(); importYmLikes(); break;
    case 'menu': trackMenu(trackOf(el), el.closest('.tr').dataset.list); break;
    case 'dislike': { const t = el.dataset.k ? T.get(el.dataset.k) : trackOf(el); closeSheet(); dislike(t); break; }
    case 'undislike': { const t = el.dataset.k ? T.get(el.dataset.k) : trackOf(el); closeSheet(); undislike(t); toast('Дизлайк убран'); break; }
    case 'ban-artist': { const t = T.get(el.dataset.k); closeSheet(); dislike(t, true); break; }
    case 'unban': unbanArtist(el.dataset.a); break;
    case 'wave': startWave(); break;
    case 'tune': S._draft = null; waveSheet(); break;
    case 'mood': S.wave.mood = el.dataset.v; save(); el.parentElement.querySelectorAll('button').forEach(c => c.classList.toggle('on', c === el)); updateWaveButton(); if (P.isWave && P.track) rebuildWave(); else { P.waveBuf = []; startWave(); } break;
    case 'ws': {
      const k = el.dataset.k, v = el.dataset.v, d = S._draft;
      if (Array.isArray(d[k])) { const val = /^\d+$/.test(v) ? +v : v; d[k] = v === '' ? [] : d[k].includes(val) ? d[k].filter(x => x !== val) : [...d[k], val]; }
      else d[k] = v;
      rerenderWaveSheet(); break;
    }
    case 'ws-reset': S._draft = JSON.parse(JSON.stringify(DEFAULT_WAVE)); rerenderWaveSheet(); break;
    case 'ws-done': {
      const changed = JSON.stringify(S._draft) !== JSON.stringify(S.wave);
      S.wave = S._draft; delete S._draft; save(); closeSheet(); updateWaveButton();
      if (changed) { if (P.isWave && P.track) rebuildWave(); else { P.waveBuf = []; startWave(); } }
      break;
    }
    case 'next-up': { const t = T.get(el.dataset.k); if (!P.track) startQueue([t], 0, 'Очередь'); else { P.queue.splice(P.qi + 1, 0, t); renderQueue(); } closeSheet(); toast('Сыграет следующим'); break; }
    case 'add-to': addToMenu(T.get(el.dataset.k)); break;
    case 'add-pl': { const p = S.playlists.find(x => x.id === el.dataset.pl), t = T.get(el.dataset.k); if (p.tracks.some(x => x.key === t.key)) { toast('Уже в этом плейлисте'); break; } p.tracks.push(slim(t)); save(); closeSheet(); toast(`Добавили в «${p.name}»`); renderRail(); break; }
    case 'rm-from': { const p = S.playlists.find(x => x.id === el.dataset.pl); p.tracks = p.tracks.filter(x => x.key !== el.dataset.k); save(); closeSheet(); render(true); toast('Убрали из плейлиста'); break; }
    case 'new-pl': newPlaylist(el.dataset.k ? T.get(el.dataset.k) : null); break;
    case 'pl-menu': plMenu(el.dataset.pl); break;
    case 'rename-pl': { const p = S.playlists.find(x => x.id === el.dataset.pl); nameSheet('Переименовать', p.name, v => { p.name = v; save(); closeSheet(); render(true); }); break; }
    case 'del-pl': {
      if (el.dataset.sure) { S.playlists = S.playlists.filter(x => x.id !== el.dataset.pl); save(); closeSheet(); location.hash = '#library/playlists'; toast('Плейлист удалён'); }
      else { el.dataset.sure = 1; el.querySelector('span').textContent = 'Точно удалить? Нажми ещё раз'; }
      break;
    }
    case 'play-list': playList(el.dataset.list); break;
    case 'shuffle-list': playList(el.dataset.list, true); break;
    case 'play-album': { const { a, tracks } = await Api.album(el.dataset.id); startQueue(tracks, 0, a.title, '#album/' + a.id); break; }
    case 'play-pl': { const { p, tracks } = await Api.playlist(el.dataset.id); startQueue(tracks, 0, p.title, '#playlist/' + p.id); break; }
    case 'artist-wave': { toast('Собираю волну по исполнителю…'); const ts = await Api.artistRadio(el.dataset.id).catch(() => []); startQueue(ts, 0, 'Волна: ' + el.dataset.name, location.hash); break; }
    case 'artist-wave-t': { const t = T.get(el.dataset.k); closeSheet(); startTrackWave(t); break; }
    case 'genre-wave': { S.wave = { ...DEFAULT_WAVE, genres: [+el.dataset.id] }; save(); P.waveBuf = []; P.isWave = false; startWave(); break; }
    case 'follow': {
      const i = S.artists.findIndex(x => x.id === +el.dataset.id);
      if (i >= 0) S.artists.splice(i, 1); else { const { a } = await Api.artist(el.dataset.id); S.artists.unshift({ id: a.id, name: a.name, picture: a.picture_medium }); }
      save(); render(true); toast(i >= 0 ? 'Убрали из коллекции' : 'Исполнитель в коллекции — волна учтёт его'); break;
    }
    case 'save-album': {
      const i = S.albums.findIndex(x => x.id === +el.dataset.id);
      if (i >= 0) S.albums.splice(i, 1); else S.albums.unshift(JSON.parse(main.querySelector('[data-album]').dataset.album));
      save(); render(true); break;
    }
    case 'save-pl': {
      const id = +el.dataset.id, i = S.savedPl.findIndex(x => x.id === id);
      if (i >= 0) S.savedPl.splice(i, 1); else S.savedPl.unshift({ id, title: el.dataset.title, pic: el.dataset.pic, n: +el.dataset.n });
      save(); render(true); break;
    }
    case 'import': importSheet(); break;
    case 'retry': render(true); break;
    case 'close': closeSheet(); cancelAnimationFrame(eqRaf); break;
  }
});
$('#barOpen').onclick = openPlayer;
$('#barPlay').onclick = $('#pPlay').onclick = toggle;
$('#barNext').onclick = $('#pNext').onclick = () => next();
$('#barPrev').onclick = $('#pPrev').onclick = prev;
$('#pClose').onclick = closePlayer;
$('#pLike').onclick = $('#barLike').onclick = () => P.track && toggleLike(P.track);
$('#pDis').onclick = $('#barDis').onclick = () => P.track && dislike(P.track);
$('#pShuffle').onclick = $('#barShuffle').onclick = () => {
  S.shuffle = !S.shuffle; save();
  if (S.shuffle && !P.isWave) { const rest = shuffle(P.queue.slice(P.qi + 1)); P.queue.splice(P.qi + 1, rest.length, ...rest); renderQueue(); }
  toast(S.shuffle ? 'Вперемешку' : 'По порядку'); updatePlayerUI();
};
$('#pRepeat').onclick = $('#barRepeat').onclick = () => { S.repeat = { off: 'all', all: 'one', one: 'off' }[S.repeat]; save(); updatePlayerUI(); toast({ off: 'Повтор выключен', all: 'Повтор очереди', one: 'Повтор трека' }[S.repeat]); };
$('#pMenu').onclick = () => P.track && trackMenu(P.track);
$('#queueToggle').onclick = $('#barQueue').onclick = () => { if ($('#player').hidden) openPlayer(); renderQueue(); $('#queue').classList.add('open'); placeYt(); };
$('#queueClose').onclick = () => { $('#queue').classList.remove('open'); placeYt(); };
$('#pArtist').addEventListener('click', () => closePlayer());
$('#topSearch').addEventListener('input', e => onQuery(e.target.value));
$('#topSearch').addEventListener('focus', () => { if (!location.hash.startsWith('#search')) location.hash = '#search'; });
main.addEventListener('scroll', () => $('#topbar').classList.toggle('solid', main.scrollTop > 40), { passive: true });

let ty = null;
playerEl.addEventListener('touchstart', e => { ty = e.target.closest('.queue,input,a') ? null : e.touches[0].clientY; }, { passive: true });
playerEl.addEventListener('touchend', e => { if (ty == null) return; const dy = e.changedTouches[0].clientY - ty; ty = null; if (dy > 90) closePlayer(); else if (dy < -90) { renderQueue(); $('#queue').classList.add('open'); } });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!wrap.hidden) closeSheet(); else if ($('#queue').classList.contains('open')) $('#queue').classList.remove('open'); else if (!playerEl.hidden) closePlayer(); return; }
  if (e.target.matches('input,textarea')) return;
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  else if (e.key === 'ArrowRight' && e.shiftKey) next();
  else if (e.key === 'ArrowLeft' && e.shiftKey) prev();
  else if (e.key === 'm' || e.key === 'ь') setVol(S.volume ? 0 : (S.lastVol || 70));
  else if (e.key === 'ArrowUp' && e.shiftKey) setVol(S.volume + 5);
  else if (e.key === 'ArrowDown' && e.shiftKey) setVol(S.volume - 5);
  else if (e.key === '/') { e.preventDefault(); const ts = $('#topSearch'); if (ts.offsetParent) ts.focus(); else location.hash = '#search'; }
});

render(); tick();
Api.cfg.then(async c => {
  if (!c.local) return;
  LOCAL = true;
  try {
    const lib = await fetch('/api/library', { cache: 'no-store' }).then(r => r.json());
    if (lib && typeof lib === 'object' && Array.isArray(lib.liked)) {
      const keepLocal = S.liked.length > (lib.liked || []).length && !lib._migrated; // first run: bring what this window already had
      if (!keepLocal) { Object.assign(S, lib); S.wave = Object.assign({ ...DEFAULT_WAVE }, S.wave); S.taste = S.taste || { a: {}, ids: {} }; S.disliked = S.disliked || []; }
    }
  } catch { }
  S._migrated = true; libReady = true;
  [...S.liked, ...S.playlists.flatMap(p => p.tracks), ...S.history.map(h => h.t)].forEach(reg);
  player.setVolume(S.volume / 100); vol.value = S.volume; vol.style.setProperty('--v', S.volume + '%');
  save(); renderRail(); render(true);
});
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => { });

/* language switch: RU ⇄ EN */
{ const b = $('#langBtn'); if (b) { b.innerHTML = `<span class="${LANG === 'ru' ? 'on' : ''}">RU</span><span class="${LANG === 'en' ? 'on' : ''}">EN</span>`; b.onclick = () => setLang(LANG === 'ru' ? 'en' : 'ru'); } }
