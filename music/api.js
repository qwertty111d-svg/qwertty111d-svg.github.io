// Echo Music — real music sources, no keys needed:
//   Deezer public API (JSONP)  — charts, artists, albums, playlists, artist radio, 30 s previews
//   Apple iTunes Search (CORS) — catalogue search in the RU store, artwork up to 1000px, 30 s previews
//   SoundCloud oEmbed + Widget  — any public SoundCloud link plays in full through the official widget
// Yandex Music has no public API: Echo opens its search with the same query (deep link).
'use strict';

const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
const EN_KEYS = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`", RU_KEYS = 'йцукенгшщзхъфывапролджэячсмитьбюё';
const swapLayout = s => [...s].map(c => { const i = EN_KEYS.indexOf(c); if (i >= 0) return RU_KEYS[i]; const j = RU_KEYS.indexOf(c); return j >= 0 ? EN_KEYS[j] : c; }).join('');
const looksWrongLayout = q => /^[a-z\[\];',.`\s]+$/i.test(q) && /[\[\];',.`]|[^aeiouy\s]{4,}/i.test(q);

/* ---------- transport ---------- */
let jsonpN = 0;
function jsonp(url, timeout = 12000) {
  return new Promise((res, rej) => {
    const cb = '__em' + (++jsonpN) + Date.now().toString(36), s = document.createElement('script');
    const done = () => { delete window[cb]; s.remove(); clearTimeout(t); };
    const t = setTimeout(() => { done(); rej(new Error('timeout')); }, timeout);
    window[cb] = d => { done(); d && d.error ? rej(new Error(d.error.message || 'api')) : res(d); };
    s.onerror = () => { done(); rej(new Error('network')); };
    s.src = url + (url.includes('?') ? '&' : '?') + 'output=jsonp&callback=' + cb;
    document.head.appendChild(s);
  });
}
const memo = new Map();
function cached(key, ttlMin, fn) {
  const hit = memo.get(key); if (hit && hit.exp > Date.now()) return hit.p;
  const p = fn().catch(e => { memo.delete(key); throw e; });
  memo.set(key, { p, exp: Date.now() + ttlMin * 60000 });
  return p;
}
const DZ = (path, ttl = 20) => cached('dz' + path, ttl, () => jsonp('https://api.deezer.com' + path));
const enc = encodeURIComponent;

/* ---------- normalisation ---------- */
function fromDz(t, album) {
  const al = t.album || album || {};
  return {
    key: 'dz' + t.id, title: t.title_short || t.title, version: t.title_version || '', artist: t.artist.name, artistId: t.artist.id,
    album: al.title || '', albumId: al.id, cover: al.cover_medium || (al.cover_xl && al.cover_xl.replace('1000x1000', '250x250')) || '',
    coverXL: al.cover_xl || '', dur: t.duration || 30, preview: t.preview || '', explicit: !!t.explicit_lyrics,
    src: { dz: { id: t.id, url: t.link || 'https://www.deezer.com/track/' + t.id } },
  };
}
function fromIt(r) {
  const art = r.artworkUrl100 || '';
  return {
    key: 'am' + r.trackId, title: r.trackName, version: '', artist: r.artistName, artistId: null, artistAm: r.artistId,
    album: r.collectionName || '', albumId: null, cover: art.replace('100x100bb', '300x300bb'), coverXL: art.replace('100x100bb', '1000x1000bb'),
    dur: (r.trackTimeMillis || 30000) / 1000, preview: r.previewUrl || '', explicit: r.trackExplicitness === 'explicit', genre: r.primaryGenreName,
    year: r.releaseDate ? +r.releaseDate.slice(0, 4) : null,
    src: { am: { id: r.trackId, url: r.trackViewUrl } },
  };
}
// same song from different services → one track
const mainArtist = a => norm(a).split(/,| & | feat\.? | ft\.? | x | и /)[0].trim();
const cleanTitle = t => norm(t).replace(/\s*[\(\[].*?[\)\]]/g, '').replace(/\s+-\s+.*$/, '').replace(/[^\p{L}\p{N} ]/gu, '').trim();
const matchKey = t => mainArtist(t.artist) + '|' + cleanTitle(t.title);
function mergeTracks(lists) {
  const out = [], by = new Map();
  for (const list of lists) for (const t of list) {
    const k = matchKey(t), have = by.get(k);
    if (!have) { by.set(k, t); out.push(t); continue; }
    if (have.dur && t.dur && Math.abs(have.dur - t.dur) > 8) { if (!out.some(x => x.key === t.key)) out.push(t); continue; } // another version (live, remix, edit): keep separate
    for (const [s, v] of Object.entries(t.src)) if (!have.src[s]) have.src[s] = v;
    if (!have.artistId && t.artistId) have.artistId = t.artistId;
    if (!have.artistAm && t.artistAm) have.artistAm = t.artistAm;
    if (!have.preview && t.preview) have.preview = t.preview;
    if (!have.year && t.year) have.year = t.year;
    if (t.coverXL && /1000x1000bb/.test(t.coverXL) && !have.coverXL) { have.coverXL = t.coverXL; have.cover = t.cover; }
  }
  return out;
}

/* ---------- Deezer ---------- */
const Api = {
  async chart() { const d = await DZ('/chart/0?limit=50', 30); return { tracks: d.tracks.data.map(t => fromDz(t)), artists: d.artists.data, albums: d.albums.data, playlists: d.playlists.data }; },
  async releases() { const d = await DZ('/editorial/0/releases?limit=24', 60); return d.data; },
  async genres() { const d = await DZ('/genre', 600); return d.data.filter(g => g.id); },
  async genreChart(id) { const d = await DZ(`/chart/${id}/tracks?limit=40`, 30); return d.data.map(t => fromDz(t)); },
  async artist(id) {
    const [a, top, albums, related] = await Promise.all([DZ('/artist/' + id), DZ(`/artist/${id}/top?limit=12`), DZ(`/artist/${id}/albums?limit=40`), DZ(`/artist/${id}/related?limit=16`).catch(() => ({ data: [] }))]);
    return { a, top: top.data.map(t => fromDz(t)), albums: albums.data, related: related.data };
  },
  async artistRadio(id) { const d = await DZ(`/artist/${id}/radio?limit=40`, 5); return d.data.map(t => fromDz(t)); },
  async artistByName(name) { const d = await DZ('/search/artist?limit=1&q=' + enc(name), 60); return d.data[0] || null; },
  async album(id) { const a = await DZ('/album/' + id, 60); return { a, tracks: a.tracks.data.map(t => fromDz(t, a)) }; },
  async playlist(id) {
    const p = await DZ('/playlist/' + id, 30);
    return { p, tracks: p.tracks.data.filter(t => t.readable !== false).map(t => fromDz(t)) };
  },
  async findPlaylists(q, n = 6) { const d = await DZ(`/search/playlist?limit=${n}&q=` + enc(q), 60); return d.data.filter(p => p.nb_tracks >= 15); },
  async freshTrack(id) { const t = await jsonp('https://api.deezer.com/track/' + id); return fromDz(t); }, // previews expire → refetch

  /* ---------- unified search ---------- */
  async search(q) {
    q = q.trim(); if (!q) return null;
    if (SPOTIFY_RE.test(q) && (await Api.cfg).local) { const d = await Api.spotify(q); return { tracks: d.tracks, artists: [], albums: [], top: null, spotify: d }; }
    if (/soundcloud\.com\//i.test(q)) { const t = await Api.soundcloud(q); return { tracks: t ? [t] : [], artists: [], albums: [], top: null }; }
    const queries = [q]; if (looksWrongLayout(q)) queries.unshift(swapLayout(q.toLowerCase()));
    const run = async qq => {
      const scP = Api.scSearch(qq), ytP = Api.ytSearch(qq), ymP = Api.ymSearch(qq), spP = Api.spSearch(qq), ytmP = Api.ytmSearch(qq);
      const [dt, da, dal, it] = await Promise.all([
        DZ('/search?limit=30&q=' + enc(qq), 10).then(d => d.data.map(t => fromDz(t))).catch(() => []),
        DZ('/search/artist?limit=8&q=' + enc(qq), 10).then(d => d.data).catch(() => []),
        DZ('/search/album?limit=12&q=' + enc(qq), 10).then(d => d.data).catch(() => []),
        cached('it' + qq, 10, () => fetch(`https://itunes.apple.com/search?country=RU&media=music&entity=song&limit=30&term=${enc(qq)}`).then(r => r.json())).then(d => d.results.filter(r => r.kind === 'song').map(fromIt)).catch(() => []),
      ]);
      const [sc, yt, ymt, spt, ytm] = await Promise.all([scP, ytP, ymP, spP, ytmP]);
      if (yt.length) await matchReady();
      if (yt.length && window.EchoMatch) for (const t of [...dt, ...it]) {
        if (t.src.yt) continue;
        const best = EchoMatch.rankCandidates({ artist: t.artist, title: t.title, dur: t.dur }, yt.map(v => ({ id: v.src.yt.id, title: v.rawTitle, channel: v.uploader, dur: v.dur })), 6, 1)[0];
        if (best) t.src.yt = { id: best.id };
      }
      return { tracks: mergeTracks([ymt, dt, spt, it, ytm, sc, yt]), artists: da, albums: dal, usedQ: qq };
    };
    let res = await run(queries[0]);
    if (!res.tracks.length && queries[1]) res = await run(queries[1]);
    // exact artist match → "лучший результат"
    const nq = norm(res.usedQ || queries[0]);
    res.top = res.artists.find(a => norm(a.name) === nq) || (res.artists[0] && norm(res.artists[0].name).startsWith(nq) ? res.artists[0] : null);
    res.query = queries[0];
    return res;
  },

  /* ---------- SoundCloud: any public link, full playback via the official widget ---------- */
  async soundcloud(url) {
    url = url.trim().replace(/^(?!https?:)/, 'https://');
    const d = await cached('sc' + url, 600, () => fetch('https://soundcloud.com/oembed?format=json&url=' + enc(url)).then(r => { if (!r.ok) throw new Error('sc'); return r.json(); }));
    let title = d.title, artist = d.author_name;
    const m = title.match(/^(.*) by (.*)$/); if (m && norm(m[2]) === norm(artist)) title = m[1];
    const art = d.thumbnail_url || '';
    return {
      key: 'sc' + url.replace(/^https?:\/\/(www\.|m\.)?soundcloud\.com\//, ''), title, artist, artistId: null, album: 'SoundCloud', cover: art.replace(/-t\d+x\d+|-large/, '-t300x300'),
      coverXL: art.replace(/-t\d+x\d+|-large/, '-t500x500'), dur: 0, preview: '', src: { sc: { url } },
    };
  },
};

/* deep links into the services, with the same query */
const LINKS = {
  yandex: t => 'https://music.yandex.ru/search?text=' + enc(`${t.artist} ${t.title}`),
  soundcloud: t => 'https://soundcloud.com/search/sounds?q=' + enc(`${t.artist} ${t.title}`),
  apple: t => t.src.am ? t.src.am.url : 'https://music.apple.com/ru/search?term=' + enc(`${t.artist} ${t.title}`),
  deezer: t => t.src.dz ? t.src.dz.url : 'https://www.deezer.com/search/' + enc(`${t.artist} ${t.title}`),
};
const SOURCES = {
  ym: { short: 'ЯМ', name: 'Яндекс Музыка' }, sp: { short: 'SP', name: 'Spotify' }, ytm: { short: 'YM', name: 'YouTube Music' }, sc: { short: 'SC', name: 'SoundCloud' }, yt: { short: 'YT', name: 'YouTube' }, dz: { short: 'DZ', name: 'Deezer' }, am: { short: 'AM', name: 'Apple Music' },
};

/* ---------- Echo server (Netlify Functions): SoundCloud search + full tracks. Off when keys aren't set. ---------- */
Api.cfg = (window.ECHO_CONFIG && ECHO_CONFIG.web) ? Promise.resolve({}) : fetch('/api/config', { cache: 'no-store' }).then(r => r.ok && /json/.test(r.headers.get('content-type') || '') ? r.json() : {}).catch(() => ({}));
function splitTitle(raw, fallbackArtist) {
  const m = String(raw).match(/^(.+?)\s+[-–—]\s+(.+)$/);
  return m ? { artist: m[1].trim(), title: m[2].trim() } : { artist: fallbackArtist, title: String(raw).trim() };
}
function fromScApi(x) {
  const { artist, title } = splitTitle(x.title, x.artist);
  return { key: 'sc' + (x.id || x.url.replace(/^https?:\/\/(www\.|m\.)?soundcloud\.com\//, '')), title, artist, artistId: null, album: x.uploader ? 'SoundCloud · ' + x.uploader : 'SoundCloud', cover: x.cover, coverXL: x.coverXL || x.cover, dur: x.dur, preview: '', rawTitle: x.title, uploader: x.uploader || x.artist, src: { sc: { url: x.url, id: x.id, audio: x.audio } } };
}
function fromYt(v) {
  const { artist, title } = splitTitle(v.title.replace(/\s*[\(\[][^\)\]]*(official|video|клип|audio|lyric|текст)[^\)\]]*[\)\]]/ig, ''), v.channel.replace(/\s*-\s*Topic$/, ''));
  return { key: 'yt' + v.id, title, artist, artistId: null, album: 'YouTube · ' + v.channel, cover: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`, coverXL: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`, dur: v.dur, preview: '', rawTitle: v.title, uploader: v.channel, src: { yt: { id: v.id } } };
}
/* ---------- Spotify links → tracks (played in full from Yandex / SoundCloud / YouTube) ---------- */
const SPOTIFY_RE = /(open\.spotify\.com\/(intl-\w+\/)?|spotify:)(playlist|album|track|artist)[/:][A-Za-z0-9]{10,}/i;
Api.spotify = async url => {
  const r = await fetch('/api/spotify?url=' + enc(url)); const d = await r.json(); if (d.error) throw new Error(d.error);
  d.tracks = d.tracks.map(x => ({ key: 'sp' + x.id, title: x.title.replace(/\s*\[(feat|ft)\.?[^\]]*\]/i, ''), version: '', artist: x.artist, artistId: null, album: d.type === 'album' ? d.name : '', cover: d.cover, coverXL: d.cover, dur: x.dur, preview: '', src: { sp: { id: x.id, url: 'https://open.spotify.com/track/' + x.id } } }));
  return d;
};
// nicer covers for Spotify imports: the same song's artwork from Deezer
Api.coverFor = async t => { try { const d = await DZ('/search?limit=3&q=' + enc(`${origArtist(t.artist)} ${origTitle(t.title)}`), 600); const m = d.data.find(x => cleanTitle(x.title) === cleanTitle(t.title)) || d.data[0]; return m ? { cover: m.album.cover_medium, coverXL: m.album.cover_xl, artistId: m.artist.id, albumId: m.album.id, album: m.album.title } : null; } catch { return null; } };

Api.ytmSearch = async q => {
  const c = await Api.cfg; if (!c.local) return [];
  return cached('ytms' + q, 30, () => fetch('/api/ytm/search?q=' + enc(q)).then(r => r.ok ? r.json() : [])).then(a => Array.isArray(a) ? a.slice(0, 20).map(x => ({ key: 'ytm' + x.id, title: x.title, version: '', artist: x.artist, artistId: null, album: x.album, cover: x.cover, coverXL: x.coverXL, dur: x.dur, preview: '', src: { ytm: { id: x.id } } })) : []).catch(() => []);
};
const clipMem = {};
Api.clip = async t => { const k = matchKey(t); if (k in clipMem) return clipMem[k]; const c = await Api.cfg; if (!c.local) { const ids = await Api.wikidataYt(t).catch(() => []); return (clipMem[k] = ids[0] || null); }
  const d = await fetch(`/api/yt/clip?a=${enc(origArtist(t.artist))}&t=${enc(origTitle(t.title))}`).then(r => r.json()).catch(() => ({})); return (clipMem[k] = d.id || null); };
Api.spSearch = async q => {
  const c = await Api.cfg; if (!(c.local && c.sp && c.sp.connected)) return [];
  return cached('sps' + q, 30, () => fetch('/api/sp/search?q=' + enc(q)).then(r => r.ok ? r.json() : [])).then(a => Array.isArray(a) ? a.map(x => ({ key: 'sp' + x.id, title: x.title, version: '', artist: x.artist, artistId: null, album: x.album, cover: x.cover, coverXL: x.coverXL, dur: x.dur, explicit: x.explicit, preview: '', src: { sp: { id: x.id, url: 'https://open.spotify.com/track/' + x.id } } })) : []).catch(() => []);
};
Api.spKey = async (id, secret) => { const r = await fetch('/api/sp/key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, secret }) }); const d = await r.json(); const c = await Api.cfg; c.sp = d; return d; };

/* ---------- Yandex Music through the local server (your account) ---------- */
const ymOn = c => !!(c.local && c.ym && c.ym.connected);
function fromYm(x) {
  return { key: 'ym' + x.id, title: x.title, version: x.version || '', artist: x.artist, artistId: null, album: x.album, albumId: null, ymAlbum: x.albumId, cover: x.cover, coverXL: x.coverXL, dur: x.dur, explicit: x.explicit, preview: '', src: { ym: { id: x.id, audio: x.audio } } };
}
Api.ymSearch = async q => {
  const c = await Api.cfg; if (!ymOn(c)) return [];
  return cached('yms' + q, 30, () => fetch('/api/ym/search?q=' + enc(q)).then(r => r.ok ? r.json() : [])).then(a => Array.isArray(a) ? a.map(fromYm) : []).catch(() => []);
};
Api.ymLikes = async () => { const r = await fetch('/api/ym/likes'); const d = await r.json(); if (!Array.isArray(d)) throw new Error(d.error || 'yandex'); return d.map(fromYm); };
Api.ymPost = async (what, body) => { const r = await fetch('/api/ym/' + what, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }); const d = await r.json(); if (d.error) throw new Error(d.error); const c = await Api.cfg; c.ym = d; return d; };
// lib/match.mjs is an ES module and arrives a moment after this script — wait for it instead of skipping matching
const matchReady = () => window.EchoMatch ? Promise.resolve() : new Promise(r => { const i = setInterval(() => { if (window.EchoMatch) { clearInterval(i); r(); } }, 25); setTimeout(() => { clearInterval(i); r(); }, 5000); });
// web: one YouTube Data API search per query (cached for a week in this browser — the daily quota is small)
Api.ytWebSearch = async q => {
  await matchReady(); const key = ytKey(); if (!key || !window.EchoMatch) return [];
  const LS = 'echo-yts-' + norm(q); try { const c = JSON.parse(localStorage.getItem(LS) || 'null'); if (c && Date.now() - c.at < 7 * 864e5) return c.list; } catch { }
  try {
    const s = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=25&videoEmbeddable=true&videoCategoryId=10&q=${enc(q)}&key=${key}`).then(r => r.json());
    if (s.error) return [];
    const ids = (s.items || []).map(i => i.id.videoId).filter(Boolean); if (!ids.length) return [];
    const v = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status,snippet&id=${ids.join(',')}&key=${key}`).then(r => r.json());
    const list = (v.items || []).filter(i => i.status && i.status.embeddable).map(i => ({ id: i.id, title: i.snippet.title.replace(/&amp;/g, '&').replace(/&#39;|&quot;/g, "'"), channel: i.snippet.channelTitle, dur: EchoMatch.isoDur(i.contentDetails.duration) })).filter(x => x.dur > 60 && x.dur < 900);
    try { localStorage.setItem(LS, JSON.stringify({ at: Date.now(), list })); } catch { }
    return list;
  } catch { return []; }
};
Api.ytSearch = async q => {
  const c = await Api.cfg;
  if (!c.local) return (await Api.ytWebSearch(q)).filter(v => !/live|concert|cover|karaoke|lyric|текст|reaction|8d|slowed|sped/i.test(v.title)).slice(0, 20).map(fromYt);
  return cached('yts' + q, 30, () => fetch('/api/yt/search?q=' + enc(q)).then(r => r.ok ? r.json() : [])).then(a => Array.isArray(a) ? a.slice(0, 20).map(fromYt) : []).catch(() => []);
};
Api.scSearch = async q => {
  const c = await Api.cfg; if (!c.sc) return [];
  return cached('scs' + q, 30, () => fetch('/api/sc/search?q=' + enc(q)).then(r => r.ok ? r.json() : [])).then(a => Array.isArray(a) ? a.map(fromScApi) : []).catch(() => []);
};
// Where can this track play in full? SoundCloud (same song, same length) → YouTube official recording → nothing (30 s preview).
const FULL_KEY = 'echo-full-v3', fullMap = JSON.parse(localStorage.getItem(FULL_KEY) || '{}');
const saveFull = () => { const ks = Object.keys(fullMap); if (ks.length > 3000) ks.slice(0, 1000).forEach(k => delete fullMap[k]); try { localStorage.setItem(FULL_KEY, JSON.stringify(fullMap)); } catch { } };
// Full version of a track, best first:
//   1) SoundCloud (Echo server key)   2) YouTube search (key: Echo server or ECHO_CONFIG.youtubeKey)
//   3) Wikidata — open database of official music videos, no key at all   → else null = 30 s preview
const origTitle = t => String(t).replace(/\s*[\(\[].*?[\)\]]/g, '').replace(/\s+-\s+.*$/, '').trim();
const origArtist = a => String(a).split(/,| & | feat\.? | ft\.? /i)[0].trim();
const sq = s => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
Api.wikidataYt = async t => {
  const T = sq(origTitle(t.title)), A = sq(origArtist(t.artist)); if (!T || !A) return [];
  const q = `SELECT DISTINCT ?yt WHERE { VALUES ?t { "${T}"@en "${T}"@ru "${T}"@mul } VALUES ?a { "${A}"@en "${A}"@ru "${A}"@mul }
    ?song rdfs:label ?t ; wdt:P175 ?p ; wdt:P1651 ?yt . ?p rdfs:label ?a . } LIMIT 4`;
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 5000);
  try {
    const d = await fetch('https://query.wikidata.org/sparql?format=json&query=' + enc(q), { signal: ctl.signal, headers: { Accept: 'application/sparql-results+json' } }).then(r => r.json());
    return d.results.bindings.map(b => b.yt.value);
  } catch { return []; } finally { clearTimeout(timer); }
};
const ytKey = () => (window.ECHO_CONFIG && ECHO_CONFIG.youtubeKey) || '';
Api.youtubeSearch = async t => {
  const c = await Api.cfg;
  if (c.yt) { const r = await fetch(`/api/yt/match?a=${enc(t.artist)}&t=${enc(t.title)}&d=${Math.round(t.dur || 0)}`).then(r => r.ok ? r.json() : {}).catch(() => ({})); return r.ids || null; }
  await matchReady(); const key = ytKey(); if (!key || !window.EchoMatch) return [];
  try {
    const s = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&videoEmbeddable=true&videoCategoryId=10&q=${enc(origArtist(t.artist) + ' ' + origTitle(t.title))}&key=${key}`).then(r => r.json());
    if (s.error) return null;
    const ids = (s.items || []).map(i => i.id.videoId).filter(Boolean); if (!ids.length) return [];
    const v = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status,snippet&id=${ids.join(',')}&key=${key}`).then(r => r.json());
    const cands = (v.items || []).filter(i => i.status && i.status.embeddable).map(i => ({ id: i.id, title: i.snippet.title, channel: i.snippet.channelTitle, dur: EchoMatch.isoDur(i.contentDetails.duration) }));
    return EchoMatch.rankCandidates({ artist: t.artist, title: t.title, dur: t.dur }, cands).map(c => c.id);
  } catch { return null; }
};
Api.resolveFull = async t => {
  await matchReady();
  if (t.src.ym && t.src.ym.audio) return { kind: 'sca', audio: t.src.ym.audio, via: 'ym' };
  if (t.src.sc && t.src.sc.audio) return { kind: 'sca', audio: t.src.sc.audio, url: t.src.sc.url };
  if (t.src.sc) return { kind: 'sc', url: t.src.sc.url };
  if (t.src.yt) return { kind: 'yt', ids: [t.src.yt.id] };
  if (t.src.ytm && !t.src.ym && !t.src.sc) return { kind: 'yt', ids: [t.src.ytm.id] };
  const c0 = await Api.cfg, k = matchKey(t) + (ymOn(c0) ? '|ym' : '');
  if (k in fullMap) { const v = fullMap[k]; if (v && v.ym) return { kind: 'sca', audio: v.ym, via: 'ym' }; if (v && v.sca) return { kind: 'sca', audio: v.sca, url: v.sc }; if (v && v.sc) { t.src.sc = { url: v.sc }; return { kind: 'sc', url: v.sc }; } return v && v.yt && v.yt.length ? { kind: 'yt', ids: [].concat(v.yt) } : null; }
  const c = c0, q = `${origArtist(t.artist)} ${origTitle(t.title)}`;
  // every service is asked at the same time; the best available answer wins (Yandex → SoundCloud → YouTube Music → YouTube)
  const pYm = ymOn(c) ? Api.ymSearch(q).then(list => {
    const best = window.EchoMatch && EchoMatch.rankCandidates({ artist: t.artist, title: t.title, dur: t.dur }, list.filter(x => !t.dur || !x.dur || Math.abs(x.dur - t.dur) <= 5).map(x => ({ id: x.key, title: `${x.artist} - ${x.title}${x.version ? ' (' + x.version + ')' : ''}`, channel: x.artist, dur: x.dur })), 5, 1)[0];
    return best ? list.find(x => x.key === best.id) : null; }).catch(() => null) : Promise.resolve(null);
  const pSc = c.sc ? Api.scSearch(q).then(list => {
    if (!window.EchoMatch) return list.find(x => matchKey(x) === matchKey(t) && (!t.dur || !x.dur || Math.abs(x.dur - t.dur) <= 6)) || null;
    const best = EchoMatch.rankCandidates({ artist: t.artist, title: t.title, dur: t.dur }, list.filter(x => !t.dur || !x.dur || Math.abs(x.dur - t.dur) <= 8).map(x => ({ id: x.key, title: x.rawTitle || `${x.artist} - ${x.title}`, channel: x.uploader || x.artist, dur: x.dur })), 6, 1)[0];
    return best ? list.find(x => x.key === best.id) : null; }).catch(() => null) : Promise.resolve(null);
  const pYt = c.local ? Promise.all([Api.youtubeSearch(t).catch(() => null), Api.wikidataYt(t).catch(() => []), Api.ytmSearch(q).catch(() => [])])
    : Api.wikidataYt(t).catch(() => []).then(async wd => wd.length ? [[], wd, []] : [await Api.youtubeSearch(t).catch(() => null), [], []]);
  let res = null;
  const m = await pYm;
  if (m) { res = { ym: m.src.ym.audio }; t.src.ym = { ...m.src.ym }; }
  if (!res) { const s = await pSc; if (s && s.src.sc.audio) { res = { sca: s.src.sc.audio, sc: s.src.sc.url }; t.src.sc = { ...s.src.sc }; } else if (s) { res = { sc: s.src.sc.url }; t.src.sc = { url: s.src.sc.url }; } }
  if (!res) {
    const [yt, wd, ytm] = await pYt;
    const official = ytm.filter(x => cleanTitle(x.title) === cleanTitle(t.title) && (!t.dur || Math.abs(x.dur - t.dur) <= 5) && norm(x.artist).includes(mainArtist(t.artist))).map(x => x.src.ytm.id);
    const ids = [...new Set([...official, ...(yt || []), ...wd])];
    if (ids.length) res = { yt: ids };
    else if (yt === null && !ytm.length) return null; // search failed (network): try again next time instead of remembering "not found"
  }
  fullMap[k] = res; saveFull();
  return res ? (res.ym ? { kind: 'sca', audio: res.ym, via: 'ym' } : res.sca ? { kind: 'sca', audio: res.sca, url: res.sc } : res.sc ? { kind: 'sc', url: res.sc } : { kind: 'yt', ids: res.yt }) : null;
};
Api.forgetFull = t => { for (const k of [matchKey(t), matchKey(t) + '|ym']) fullMap[k] = null; if (t.src.ym) delete t.src.ym.audio; saveFull(); };
Api.dropYt = (t, id) => { const v = fullMap[matchKey(t)]; if (v && v.yt) { v.yt = [].concat(v.yt).filter(x => x !== id); if (!v.yt.length) fullMap[matchKey(t)] = null; saveFull(); } };

/* ---------- lyrics: LRCLIB (open database of synced lyrics, no key) ---------- */
const LYR_KEY = 'echo-lyrics-v1', lyrMem = JSON.parse(localStorage.getItem(LYR_KEY) || '{}');
const parseLrc = lrc => String(lrc || '').split('\n').map(l => { const m = l.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/); return m ? { t: +m[1] * 60 + +m[2], text: m[3].trim() } : null; }).filter(Boolean);
Api.lyrics = async t => {
  const k = matchKey(t);
  if (lyrMem[k] !== undefined) return lyrMem[k];
  const A = origArtist(t.artist), T = origTitle(t.title);
  let list = [];
  try { list = await fetch(`https://lrclib.net/api/search?q=${enc(A + ' ' + T)}`).then(r => r.ok ? r.json() : []); } catch { return null; }
  const wa = mainArtist(t.artist), wt = cleanTitle(t.title);
  const score = x => {
    const a = norm(x.artistName), n = cleanTitle(x.trackName);
    let s = 0;
    if (n === wt) s += 5; else if (n.includes(wt) || wt.includes(n)) s += 2; else return -1;
    if (a.includes(wa) || wa.includes(mainArtist(x.artistName))) s += 4; else return -1;
    if (x.syncedLyrics) s += 3;
    if (t.dur && x.duration) s -= Math.min(4, Math.abs(t.dur - x.duration) / 4);
    if (x.instrumental) s -= 6;
    return s;
  };
  const best = list.map(x => [x, score(x)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1])[0];
  const res = best ? { synced: !!best[0].syncedLyrics, lines: best[0].syncedLyrics ? parseLrc(best[0].syncedLyrics) : String(best[0].plainLyrics || '').split('\n').map(text => ({ t: null, text: text.trim() })), dur: best[0].duration } : { none: true };
  lyrMem[k] = res; try { localStorage.setItem(LYR_KEY, JSON.stringify(lyrMem)); } catch { const ks = Object.keys(lyrMem); ks.slice(0, ks.length / 2).forEach(x => delete lyrMem[x]); }
  return res;
};
