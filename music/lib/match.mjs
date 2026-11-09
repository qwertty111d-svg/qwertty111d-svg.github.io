// Matching helpers shared by the functions (and unit-tested in tools/test-match.mjs).
export const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/&amp;/g, '&').replace(/&#39;|&quot;/g, "'").replace(/\s+/g, ' ').trim();
export const mainArtist = a => norm(a).split(/,| & | feat\.? | ft\.? | x | и /)[0].trim();
export const cleanTitle = t => norm(t).replace(/\s*[\(\[].*?[\)\]]/g, '').replace(/\s+-\s+.*$/, '').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();
export const keyOf = (artist, title) => mainArtist(artist) + '|' + cleanTitle(title);

// ISO 8601 "PT3M34S" → seconds
export const isoDur = s => { const m = String(s).match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; };

const BAD = ['текст песни', 'lyrics', 'lyric', 'live', 'concert', 'cover', 'karaoke', 'instrumental', 'remix', 'sped up', 'slowed', 'nightcore', '8d', 'reverb', 'lyrics video', 'reaction', 'tutorial', 'кавер', 'караоке', 'живое', 'концерт', 'минус'];

/** score a candidate {title, channel, dur} against the track we want; higher is better, <4 = reject */
export function scoreCandidate(want, c) {
  const wt = cleanTitle(want.title), wa = mainArtist(want.artist);
  const ct = norm(c.title), ch = norm(c.channel).replace(/ - topic$/, '');
  let s = 0;
  if (wt && ct.includes(wt)) s += 4; else if (wt && wt.split(' ').filter(w => w.length > 2).every(w => ct.includes(w))) s += 2; else return -99;
  // the artist must be there (title or channel) — otherwise a short title like "Leaving" matches anybody's song
  const artistHit = wa && (ct.includes(wa) || ch.includes(wa) || ch.replace(/\s|vevo|official|music/g, '').includes(wa.replace(/\s/g, '')));
  if (artistHit) s += 3; else if (wa) return -99;
  if (/ - topic$/.test(norm(c.channel))) s += 2;          // YouTube's auto "Artist - Topic" channels carry the studio recording
  if (/official|официальн/.test(ct)) s += 1;
  const wantTitle = norm(want.title);
  for (const b of BAD) if (ct.includes(b) && !wantTitle.includes(b)) s -= 4;
  if (want.dur && c.dur) { const d = Math.abs(want.dur - c.dur); s += d <= 3 ? 3 : d <= 8 ? 1 : d <= 25 ? -1 : -5; }
  return s;
}
export function pickBest(want, cands, min = 5) {
  let best = null, bs = -Infinity;
  for (const c of cands) { const s = scoreCandidate(want, c); if (s > bs) { bs = s; best = c; } }
  return bs >= min ? { ...best, score: bs } : null;
}

/** best candidates first (score ≥ min), so the app can fall back if a label blocks embedding of the first one */
export function rankCandidates(want, cands, min = 5, n = 3) {
  return cands.map(c => ({ ...c, score: scoreCandidate(want, c) })).filter(c => c.score >= min).sort((a, b) => b.score - a.score).slice(0, n);
}
