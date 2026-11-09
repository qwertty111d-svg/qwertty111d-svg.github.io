// Formspree form id (formspree.io → your form → «f/xxxxxxx» → paste the xxxxxxx part)
const FORMSPREE_ID = 'xaeeryng';
// Echo studio site: links, the hero (the wordmark's echoes and the echo field — your path replayed by your echoes, the
// mechanic of «Следом!»), the manifesto lighting up as you read, the game's story beside a sticky phone, the app's chat
// playing itself, the cards that fill from where you point, the reading progress line.

// ---- links: a button whose link is empty is hidden ----
const LINKS = {
  play: 'https://playgama.ai/play/a552jsp622x57z',
  yandex: '',                                   // Яндекс Игры, когда игра пройдёт модерацию
  youtube: 'https://www.youtube.com/@echomaker',
  boosty: 'https://boosty.to/echodiary',
  telegram: 'https://t.me/sledom_echo_bot/play',  // opens the game itself inside Telegram
  tgbot: 'https://t.me/sledom_echo_bot'           // the bot: Daily Run event, tips, reminders
};
document.querySelectorAll('[data-link]').forEach(a => { const u = LINKS[a.dataset.link];
  if (u) { a.href = u; a.target = '_blank'; a.rel = 'noopener' } else if (a.getAttribute('href') === '#') a.hidden = true });
document.getElementById('year').textContent = new Date().getFullYear();
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, touch = matchMedia('(hover: none)').matches;

// ---- language: Russian lives in the HTML, English here; the choice is kept, a browser without Russian starts in English ----
const EN = {
  title: 'Echo — games and software studio', desc: 'Echo is a small studio. We make games and software built around one clear idea. Our game Sledom! is an arcade where your worst enemy is you.',
  top: 'Echo — back to top', menu: 'Menu', scroll: 'Scroll down', lang: 'RU', lang_a: 'Переключить на русский', play: 'Play',
  n_music: 'Music', mu_n: 'our player', mu_sub: 'All your music — in one place.', mu_alt: 'Echo Music home screen', mu_img: 'media/echo-music-en.jpg', mu_open_a: 'Open Echo Music', mu_open: 'Open Echo Music',
  mu_p: 'One search across the catalogues of several services, one collection with no walls between them, and «My Wave» that learns from your likes, skips and dislikes.',
  mu_f1: 'Lyrics in time', mu_f1s: 'the line lights up with the voice', mu_f2: 'Echo Space', mu_f2s: 'an equaliser and our signature sound space',
  mu_f3: 'Videos and track waves', mu_f3s: 'the clip when there is one, and an endless flow of similar music', mu_st: '<span class="dot"></span>web version · beta',
  n_game: 'Game', n_soon: 'Soon', n_media: 'Media', n_idea: 'Ideas', n_app: 'App', n_follow: 'Follow',
  eyebrow: '<span class="dot"></span>games and software studio', lead: 'We make games that <em>resonate</em>.',
  cta_play: 'Play Sledom!', cta_yt: 'Watch on YouTube',
  hint: '<span class="hint-d">move your cursor</span><span class="hint-t">touch the screen</span> — an echo will follow you',
  about_n: 'about us', manifest: 'Echo is a small studio. We make games and software around one clear idea, with nothing extra. Everything you do comes back. Sometimes as an echo.',
  game_n: 'our game', game_h: 'Sledom!', game_sub: 'An arcade where your worst enemy is&nbsp;you.',
  c1h: 'You run', c1p: 'Grab stars while the clock ticks. Every step you take is remembered.',
  c2h: 'Your past follows', c2p: 'A couple of seconds later an echo runs your path. Then another. And another.',
  c3h: 'Don’t get caught by yourself', c3p: 'Stop&nbsp;— and the echo still walks your trail. The longer you play, the tighter it gets.',
  f1b: 'Free', f1: 'right in your browser, nothing to install', f2: 'languages', f3: 'secret level. A viewer came up with it in&nbsp;the comments',
  play_free: 'Play for free', yandex: 'Yandex Games', tg_play: 'Play in Telegram', available: 'available',
  soon_n: 'coming soon', soon_h: 'In your pocket', soon_sub: 'Sledom! already runs in the browser and in Telegram — on your phone too. App store versions are on the way.',
  planned: 'planned', soon: 'soon', soon_note: 'Subscribers hear about the release first.', soon_yt: 'Subscribe on YouTube&nbsp;→',
  media_n: 'media', media_h: 'For press and&nbsp;creators', media_sub: 'Screenshots, covers and gameplay video. Free to use in reviews, videos and streams about the game.',
  s1: 'Endless run', s1a: 'Gameplay: the hero collects stars, echoes run nearby', s2: 'Challenges', s2a: 'Challenge level with spinning blades',
  s3: 'Themes', s3a: 'Night theme', s4: 'Daily Run and streak', s4a: 'Daily Run and streak rewards',
  s1i: 'media/press/en/play.jpg', s2i: 'media/press/en/blades.jpg', s3i: 'media/press/en/night.jpg', s4i: 'media/press/en/streak.jpg',
  kit_b: 'Sledom! press kit', kit: '29 screenshots (phone and desktop, RU and EN) · icon, covers, banners · 32 s of gameplay · fact sheet', kit_btn: 'Download ZIP · 15 MB',
  idea_n: 'ideas', idea_h: 'Invent an update', idea_sub: 'We read every idea. The best ones make it into the game.', idea_p: 'That’s how the secret level was born. Where’s the entrance? Not telling.',
  kinds: 'What’s it about', k1: 'Level', k2: 'Mechanic', k3: 'Hero and skins', k4: 'Other',
  f_idea: 'Idea', ph_idea: 'For example: a level where the echo runs backwards', f_nick: 'Nickname (if you’d like a shout-out)', ph_nick: '@your YouTube handle',
  send: 'Send idea', sent_b: 'Got it.', sent: 'Thank you! Watch for updates on YouTube.', again: 'Suggest another',
  app_n: 'our app', app_sub: 'An assistant for work and ideas.', app_st: '<span class="dot"></span>in development', win: 'Echo AI window example',
  app_p: 'Chat and workspace in one window: talk it through, or get straight to work&nbsp;— files, editor, terminal. The conversation stays when you switch.',
  fol_n: 'follow us', fol_h: 'Stay close', yt_t: 'Short videos: new levels, secrets and how we make the game.', bo_t: 'Support the studio. Every bit goes into new updates.',
  tg_t: 'The game’s bot: today’s Daily Run event, tips and a morning reminder. You can play right in the chat.',
  privacy: 'Privacy', privacy_u: 'privacy.html#en'
};
const TX = {
  ru: { errOff: 'Форма скоро заработает. А пока напиши идею нам в <a data-link="tgbot" href="https://t.me/sledom_echo_bot">Telegram</a>.', err: 'Не получилось отправить. Проверь интернет и попробуй ещё раз.', chat: [['me', 'Привет! Нужен план короткого видео на 30 секунд.'], ['ai', 'Давай. О чём оно?'], ['me', 'Про то, как эхо бежит за игроком.'], ['ai', '1. Хук в первую секунду.\n2. Одна мысль.\n3. Конец, который возвращает к началу.']] },
  en: { errOff: 'The form is coming soon. Meanwhile send us the idea on <a data-link="tgbot" href="https://t.me/sledom_echo_bot">Telegram</a>.', err: 'Couldn’t send it. Check your connection and try again.', chat: [['me', 'Hi! I need a plan for a 30-second video.'], ['ai', 'Sure. What’s it about?'], ['me', 'How the echo chases the player.'], ['ai', '1. A hook in the first second.\n2. One idea.\n3. An ending that loops back to the start.']] }
};
const RU = {}, i18n = [...document.querySelectorAll('[data-i]')], i18a = [...document.querySelectorAll('[data-ia]')].map(el => [el, el.dataset.ia.split(',').map(p => p.split('='))]);
i18n.forEach(el => RU[el.dataset.i] = el.innerHTML); i18a.forEach(([el, ps]) => ps.forEach(([a, k]) => RU[k] = el.getAttribute(a)));
const store = { get: () => { try { return localStorage.getItem('echo-lang') } catch { return null } }, set: v => { try { localStorage.setItem('echo-lang', v) } catch {} } };
const asked = new URLSearchParams(location.search).get('lang');
let L = ['ru', 'en'].includes(asked) ? asked : store.get() || ((navigator.languages || [navigator.language]).some(l => /^(ru|be|kk)\b/i.test(l)) ? 'ru' : 'en');
const langBtn = document.querySelector('.lang');
function setLang(l) { L = l; const D = l === 'en' ? EN : RU;
  i18n.forEach(el => el.innerHTML = D[el.dataset.i]); i18a.forEach(([el, ps]) => ps.forEach(([a, k]) => el.setAttribute(a, D[k])));
  document.documentElement.lang = l; langBtn.lang = l === 'en' ? 'ru' : 'en'; document.querySelector('.ideaform [name=lang]').value = l;
  document.querySelectorAll('.btn span').forEach(s => s.dataset.t = s.textContent) }
setLang(L);
langBtn.addEventListener('click', () => { setLang(L === 'en' ? 'ru' : 'en'); store.set(L); relang() });

// ---- reveal on scroll ----
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }), { threshold: .15, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.reveal').forEach(el => { if (el.classList.contains('go')) el.style.transitionDelay = [...el.parentNode.children].indexOf(el) * 120 + 'ms'; io.observe(el) });

// ---- the manifesto: one word lights up after another as the paragraph moves up the screen ----
const man = document.querySelector('[data-words]'), words = [];
function splitWords() { const t = man.textContent.trim().split(/\s+/); man.textContent = ''; words.length = 0; t.forEach((w, i) => { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; man.append(s, i < t.length - 1 ? ' ' : ''); words.push(s) }) }
splitWords();

// ---- the game's story: the chapter in the middle of the screen is lit; on the last one the footage gets its colour ----
const chapters = [...document.querySelectorAll('.chapter')], phone = document.querySelector('.phone');
if (!touch) { phone.addEventListener('pointermove', e => { const r = phone.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; phone.style.transform = `perspective(1000px) rotateY(${x * 12}deg) rotateX(${-y * 10}deg)` });
  phone.addEventListener('pointerleave', () => phone.style.transform = '') }

// ---- nav, progress line, manifesto and chapters: one scroll handler ----
const nav = document.querySelector('.nav'), bar = document.querySelector('.progress');
function onScroll() { const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`; nav.classList.toggle('solid', scrollY > 30);
  const r = man.getBoundingClientRect(), k = (innerHeight * .85 - r.top) / (r.height + innerHeight * .35), n = Math.round(Math.max(0, Math.min(1, k)) * words.length); words.forEach((w, i) => w.classList.toggle('on', i < n));
  let best = -1, bd = 1e9; chapters.forEach((c, i) => { const b = c.getBoundingClientRect(), d = Math.abs(b.top + b.height / 2 - innerHeight * (touch ? .7 : .5)); if (b.bottom > 0 && b.top < innerHeight && d < bd) { bd = d; best = i } });
  chapters.forEach((c, i) => c.classList.toggle('on', i === best)); phone.classList.toggle('color', best === 2) }
addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();

// ---- the phone menu ----
const burger = document.querySelector('.burger'), setMenu = o => { nav.classList.toggle('open', o); burger.setAttribute('aria-expanded', o); document.body.classList.toggle('locked', o) };
burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
document.querySelectorAll('.links a').forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false) });

// ---- the footage plays only while it is on screen (battery on phones) ----
const vid = document.querySelector('.phone video');
new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) vid.play().catch(() => {}); else vid.pause() })).observe(vid);

// ---- ideas: posted to Netlify Forms (read them in the Netlify dashboard → Forms, or by e-mail); opened locally, kept in this browser ----
const form = document.querySelector('.ideaform'), ta = form.querySelector('textarea'), count = form.querySelector('.count'), sent = form.querySelector('.sent'), send = form.querySelector('.send');
ta.addEventListener('input', () => count.textContent = `${ta.value.length} / ${ta.maxLength}`);
form.addEventListener('submit', async e => { e.preventDefault(); const old = form.querySelector('.err'); if (old) old.remove();
  const data = new FormData(form); if (!String(data.get('idea') || '').trim()) { ta.focus(); return }
  const ok = () => { sent.hidden = false; form.reset(); count.textContent = `0 / ${ta.maxLength}` };
  if (data.get('bot-field') || data.get('_gotcha')) return ok();
  const local = location.protocol === 'file:' || /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname);
  if (local) { const k = 'echo-ideas', a = JSON.parse(localStorage.getItem(k) || '[]'); a.push(Object.fromEntries(data)); localStorage.setItem(k, JSON.stringify(a)); return ok() }
  send.disabled = true;
  // ideas go to the owner's e-mail through Formspree (set FORMSPREE_ID at the top of this file)
  if (!FORMSPREE_ID) { const m = document.createElement('p'); m.className = 'err'; m.innerHTML = TX[L].errOff; send.after(m); send.disabled = false; return }
  try { data.delete('bot-field'); const r = await fetch('https://formspree.io/f/' + FORMSPREE_ID, { method: 'POST', headers: { Accept: 'application/json' }, body: data }); if (!r.ok) throw new Error(r.status); ok() }
  catch { const m = document.createElement('p'); m.className = 'err'; m.textContent = TX[L].err; send.after(m) }
  finally { send.disabled = false } });
form.querySelector('.again').addEventListener('click', () => { sent.hidden = true; ta.focus() });

// ---- the app: a short chat plays when the window comes into view ----
const chat = document.querySelector('.chat');
new IntersectionObserver((es, o) => es.forEach(async e => { if (!e.isIntersecting) return; o.disconnect(); const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  for (let n = 0; n < TX[L].chat.length; n++) { const [who, text] = TX[L].chat[n]; let dots; if (who === 'ai') { dots = document.createElement('div'); dots.className = 'msg ai typing'; dots.innerHTML = '<i></i><i></i><i></i>'; chat.append(dots); await wait(1100); dots.remove() }
    const m = document.createElement('div'); m.className = 'msg ' + who; m.dataset.n = n; m.textContent = text; chat.append(m); await wait(who === 'me' ? 900 : 1300) } }), { threshold: .45 }).observe(chat);

// ---- the cards fill with light from where the pointer enters ----
document.querySelectorAll('.go').forEach(c => c.addEventListener('pointerenter', e => { const r = c.getBoundingClientRect(); c.style.setProperty('--gx', (e.clientX - r.left) / r.width * 100 + '%'); c.style.setProperty('--gy', (e.clientY - r.top) / r.height * 100 + '%') }));

// ---- the hero ----
const hero = document.querySelector('.hero'), cv = document.getElementById('field'), g = cv.getContext('2d'), spot = document.querySelector('.spot');
const layers = [...document.querySelectorAll('.word .layer')].reverse(), lag = layers.map(() => ({ x: 0, y: 0 }));
const P = { x: 0, y: 0, seen: 0 }, TAP = { x: 0, y: 0, t: -1e9 }; let W = 0, H = 0;
const fit = () => { const d = Math.min(touch ? 1.5 : 2, devicePixelRatio || 1), r = hero.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0) }; fit(); addEventListener('resize', fit);
hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); P.x = e.clientX - r.left; P.y = e.clientY - r.top; P.seen = performance.now(); spot.style.setProperty('--mx', P.x + 'px'); spot.style.setProperty('--my', P.y + 'px') }, { passive: true });
const hist = [], rings = [], ECHOES = [.8, 1.6, 2.4]; let you = { x: 0, y: 0 }, caught = 0, visible = true;
new IntersectionObserver(es => visible = es[0].isIntersecting).observe(hero);
hero.addEventListener('pointerdown', e => { const r = hero.getBoundingClientRect(); TAP.x = e.clientX - r.left; TAP.y = e.clientY - r.top; TAP.t = performance.now(); rings.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() / 1000, a: .35 }) });
const at = t => { for (let i = hist.length - 1; i > 0; i--) if (hist[i - 1].t <= t) { const a = hist[i - 1], b = hist[i], k = (t - a.t) / Math.max(1e-3, b.t - a.t); return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k } } return hist[0] };
function box(x, y, s, rot, a, fill) { g.save(); g.translate(x, y); g.rotate(rot); g.beginPath(); g.roundRect(-s / 2, -s / 2, s, s, s * .32);
  if (fill) { g.fillStyle = `rgba(236,235,231,${a})`; g.fill() } else { g.strokeStyle = `rgba(236,235,231,${a})`; g.lineWidth = 1.2; g.stroke() }
  g.fillStyle = fill ? '#0c0c0d' : `rgba(236,235,231,${a})`; g.beginPath(); g.arc(-s * .17, -s * .05, s * .07, 0, 7); g.arc(s * .17, -s * .05, s * .07, 0, 7); g.fill(); g.restore() }
function frame(ms) { requestAnimationFrame(frame); if (!visible || document.hidden) return; const t = ms / 1000;
  // «you»: the pointer, or a slow wandering path when there is none
  const tap = ms - TAP.t < 2200, auto = !tap && (touch || !P.seen || ms - P.seen > 2500), tx = tap ? TAP.x : auto ? W * (.62 + .26 * Math.sin(t * .31) * Math.cos(t * .13)) : P.x, ty = tap ? TAP.y : auto ? H * (.55 + .28 * Math.sin(t * .47 + 1)) : P.y;
  if (!hist.length) { you.x = tx; you.y = ty } const ease = auto ? .05 : tap ? .1 : .3; you.x += (tx - you.x) * ease; you.y += (ty - you.y) * ease;
  hist.push({ t, x: you.x, y: you.y }); while (hist[0].t < t - 2.8) hist.shift();
  g.clearRect(0, 0, W, H);
  g.beginPath(); hist.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.strokeStyle = 'rgba(236,235,231,.1)'; g.lineWidth = 1; g.setLineDash([2, 7]); g.stroke(); g.setLineDash([]);
  ECHOES.forEach((d, k) => { const p = at(t - d); if (!p) return; box(p.x, p.y, 24, Math.sin(t * 1.6 + k) * .15, .42 - k * .11);
    if (Math.hypot(p.x - you.x, p.y - you.y) < 10 && t - caught > 1.4 && hist.length > 90) { caught = t; rings.push({ x: you.x, y: you.y, t, a: .25 }) } });
  if (auto || touch) box(you.x, you.y, 24, 0, .85, true);
  for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i], u = (t - r.t) / 1.8; if (u > 1) { rings.splice(i, 1); continue }
    for (let j = 0; j < 3; j++) { const v = u - j * .13; if (v <= 0) continue; g.beginPath(); g.arc(r.x, r.y, 8 + v * 240, 0, 7); g.strokeStyle = `rgba(236,235,231,${r.a * (1 - v) * (1 - j * .3)})`; g.lineWidth = 1; g.stroke() } }
  // the wordmark's echoes trail behind, each a little later
  const ox = (auto ? Math.sin(t * .5) * .35 : P.x / W - .5) * 70, oy = (auto ? Math.cos(t * .4) * .3 : P.y / H - .5) * 34;
  layers.forEach((el, k) => { const L = lag[k], sp = .12 / (k + 1); L.x += (ox * (k + 1) * .5 - L.x) * sp; L.y += (oy * (k + 1) * .5 - L.y) * sp; el.style.transform = `translate(${L.x.toFixed(1)}px,${L.y.toFixed(1)}px)` }) }
if (!reduce) requestAnimationFrame(frame);

// ---- media: on phones a screenshot takes its colour when it is mostly in view (there is no hover) ----
if (touch) { const so = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('color', e.intersectionRatio > .6)), { threshold: [0, .6, 1] }); document.querySelectorAll('.shot').forEach(el => so.observe(el)) }

// ---- after a language switch: the manifesto, the chat already shown and an old error follow the new language ----
function relang() { splitWords(); onScroll(); chat.querySelectorAll('.msg[data-n]').forEach(m => m.textContent = TX[L].chat[m.dataset.n][1]); const e = form.querySelector('.err'); if (e) e.textContent = TX[L].err }
