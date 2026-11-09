// Echo Music — RU / EN. The UI is written in Russian; in English mode this layer translates interface text on the fly
// (exact phrases + patterns with numbers). Track, artist, album and playlist names are never touched.
'use strict';
const LANG_KEY = 'echo-music-lang';
const LANG = (() => {
  const q = new URLSearchParams(location.search).get('lang'); if (q === 'en' || q === 'ru') { localStorage.setItem(LANG_KEY, q); return q; }
  const saved = localStorage.getItem(LANG_KEY); if (saved) return saved;
  return /^(ru|be|kk|uk)/i.test(navigator.language || '') ? 'ru' : 'en';
})();
document.documentElement.lang = LANG;
function setLang(l) { localStorage.setItem(LANG_KEY, l); location.reload(); }

const EN = {
  'Главная': 'Home', 'Поиск': 'Search', 'Коллекция': 'Library', 'Разделы': 'Sections', 'Назад': 'Back', 'Вперёд': 'Forward',
  'Мне нравится': 'Liked', 'Новый плейлист': 'New playlist', 'Перенести плейлист': 'Import playlist', 'Сервисы': 'Services',
  'Яндекс · SoundCloud · YouTube': 'Yandex · SoundCloud · YouTube', 'Трек, исполнитель, альбом или ссылка SoundCloud': 'Track, artist, album or SoundCloud link',
  'Трек, исполнитель или ссылка SoundCloud': 'Track, artist or SoundCloud link',
  'Доброе утро': 'Good morning', 'Добрый день': 'Good afternoon', 'Добрый вечер': 'Good evening', 'Доброй ночи': 'Good night',
  'Моя волна': 'My Wave', 'Персональный поток': 'Personal stream', 'Слушать': 'Play', 'Пауза': 'Pause', 'Продолжить': 'Resume', 'Настроить': 'Tune',
  'Любое': 'Any', 'Бодрое': 'Upbeat', 'Весёлое': 'Happy', 'Спокойное': 'Calm', 'Грустное': 'Sad', 'Любой': 'Any', 'Любые': 'Any',
  'Ставь ♡ и «Не нравится» — волна будет понимать тебя лучше': 'Tap ♡ and «Dislike» — the wave will get to know you',
  'Недавно играли': 'Recently played', 'Чарт': 'Chart', 'топ-50 сейчас': 'top 50 right now', 'пока пусто': 'empty for now', 'Пока пусто': 'Empty for now',
  'Spotify, Яндекс, Deezer…': 'Spotify, Yandex, Deezer…', 'Твоё': 'Yours', 'Все 50': 'All 50', 'Русские хиты': 'Russian hits',
  'подборки слушателей Deezer': 'Deezer listener picks', 'Популярные исполнители': 'Popular artists', 'Популярные альбомы': 'Popular albums',
  'Подборки': 'Playlists', 'Жанры': 'Genres', 'ищем во всех сервисах сразу': 'searching every service at once', 'Ты недавно слушал': 'You recently played',
  'Поп': 'Pop', 'Хип-хоп': 'Hip-hop', 'Рок': 'Rock', 'Танцевальная': 'Dance', 'Электроника': 'Electronic', 'Альтернатива': 'Alternative',
  'Джаз': 'Jazz', 'Метал': 'Metal', 'Соул и фанк': 'Soul & funk', 'Классика': 'Classical', 'Фолк': 'Folk',
  'Работа': 'Work', 'Спорт': 'Workout', 'Дорога': 'Driving', 'Сон': 'Sleep', 'Вечеринка': 'Party', 'Новинки': 'New',
  'Русский': 'Russian', 'Зарубежный': 'International', 'Без слов': 'Instrumental', 'Медленный': 'Slow', 'Средний': 'Medium', 'Быстрый': 'Fast',
  'Настроить волну': 'Tune the wave', 'Echo подберёт треки из подборок и чартов, а лайки и пропуски уточнят выбор.': 'Echo picks from playlists and charts; your likes and skips refine it.',
  'Настроение': 'Mood', 'Занятие': 'Activity', 'Эпоха': 'Era', 'Язык': 'Language', 'Темп': 'Tempo', 'Знакомое или новое': 'Familiar or new',
  'Знакомое': 'Familiar', 'Новое': 'New', 'Сбросить': 'Reset', 'Готово': 'Done', 'Отмена': 'Cancel', 'Закрыть': 'Close',
  'Треки': 'Tracks', 'Плейлисты': 'Playlists', 'Альбомы': 'Albums', 'Исполнители': 'Artists', 'Скрытое': 'Hidden', 'Видео': 'Videos', 'Все': 'All', 'Все видео': 'All videos',
  'Лучший результат': 'Top result', 'Исполнитель': 'Artist', 'Альбом': 'Album', 'Сингл': 'Single', 'Подборка': 'Playlist', 'Плейлист': 'Playlist', 'Твой плейлист': 'Your playlist',
  'Нет нужного? Поискать в:': 'Not there? Search in:', 'Ничего не нашли': 'Nothing found', 'Поиск не ответил': 'Search did not respond',
  'Популярные треки': 'Popular tracks', 'Синглы и EP': 'Singles & EPs', 'Похожие исполнители': 'Similar artists', 'Волна по исполнителю': 'Artist wave',
  'В коллекцию': 'Add to library', 'В коллекции': 'In library', 'Вперемешку': 'Shuffle', 'Популярное': 'Popular', 'Жанр': 'Genre', 'Жанр · чарт': 'Genre · chart',
  'Собирается само': 'Builds itself', 'Часто слушаю': 'On repeat', 'Давно не включал': 'Not played lately', 'из всех сервисов': 'from every service',
  'Здесь будут все любимые треки — из любого сервиса.': 'All your favourite tracks will live here — from any service.',
  'Жми ♡ у трека или перенеси плейлист.': 'Tap ♡ on a track or import a playlist.', 'Включить волну': 'Start the wave',
  'Перенести из другого сервиса': 'Import from another service', 'Ссылка Deezer / SoundCloud или список треков из Яндекс Музыки, Apple Music, Spotify…': 'A Deezer / SoundCloud link or a track list from Yandex Music, Apple Music, Spotify…',
  'Нажми «В коллекцию» на странице альбома': 'Tap «Add to library» on an album page', 'Нажми «В коллекцию» на странице исполнителя': 'Tap «Add to library» on an artist page',
  'Волна не ставит то, что здесь. Нажми «Вернуть», если передумал.': 'The wave never plays what is here. Tap «Restore» if you change your mind.',
  'Треки с дизлайком': 'Disliked tracks', 'Вернуть': 'Restore', 'не рекомендуем': 'not recommended',
  'Пока ничего — жми «Не нравится» у треков, которые не заходят': 'Nothing yet — tap «Dislike» on tracks that don’t land',
  'Нажимай ♡ у треков — они соберутся здесь': 'Tap ♡ on tracks — they will gather here', 'Добавляй треки через ⋯ → «Добавить в плейлист»': 'Add tracks via ⋯ → «Add to playlist»',
  'Сейчас играет': 'Now playing', 'Играет из': 'Playing from', 'Свернуть': 'Minimise', 'Ещё': 'More', 'Нравится': 'Like', 'Не нравится': 'Dislike',
  'Не нравится — волна учтёт': 'Dislike — the wave will remember', 'Перемотка': 'Seek', 'Перемешать': 'Shuffle', 'Предыдущий': 'Previous', 'Следующий': 'Next',
  'Повтор': 'Repeat', 'Повтор выключен': 'Repeat off', 'Повтор очереди': 'Repeat queue', 'Повтор трека': 'Repeat track', 'По порядку': 'In order',
  'Текст': 'Lyrics', 'Волна по треку': 'Track wave', 'Звук': 'Sound', 'Дальше в очереди': 'Up next', 'Дальше': 'Up next', 'Очередь': 'Queue',
  'Закрыть очередь': 'Close queue', 'Дальше ничего нет': 'Nothing next', 'Открыть плеер': 'Open player', 'Текст песни': 'Lyrics',
  'Эквалайзер · Echo Space': 'Equaliser · Echo Space', 'Эквалайзер и Echo Space': 'Equaliser and Echo Space', 'Эквалайзер': 'Equaliser', 'Echo · звук': 'Echo · sound',
  'Ровно': 'Flat', 'Бас': 'Bass', 'Голос': 'Vocal', 'Клуб': 'Club', 'Ночь': 'Night', 'Сухо': 'Dry', 'Зал': 'Hall',
  'Фирменное пространство Echo: звук раскрывается, как эхо в зале. Отражения идут слева и справа, а хвост мягко затухает.': 'Echo’s signature space: the sound opens up like an echo in a hall — reflections left and right, a soft fading tail.',
  'включи трек — увидишь спектр': 'play a track to see the spectrum', 'YouTube играет в своём плеере — эквалайзер работает для SoundCloud и Яндекса': 'YouTube plays in its own player — the equaliser works for other sources',
  'Громкость': 'Volume', 'Громкость — колесо мыши тоже работает': 'Volume — the mouse wheel works too', 'Выключить звук': 'Mute', 'Включить звук': 'Unmute', 'Звук (M)': 'Sound (M)',
  'Пауза и скрыть видео': 'Pause and hide video', 'полный': 'full', 'фрагмент 30 сек': '30 s preview', 'фрагмент': 'preview', 'ищу полную версию…': 'finding the full version…',
  'Полный трек — в своём сервисе:': 'Full track in your service:', 'Слушать полностью:': 'Listen in full:',
  'Текст · идёт в такт': 'Lyrics · in time', 'Ищу текст…': 'Looking for lyrics…', 'Текста пока нет': 'No lyrics yet', 'не нашли в открытой базе': 'not in the open database', 'нет связи с базой текстов': 'lyrics database unreachable',
  'Добавить в плейлист': 'Add to playlist', 'Играть следующим': 'Play next', 'К исполнителю': 'Go to artist', 'К альбому': 'Go to album', 'Убрать из плейлиста': 'Remove from playlist',
  'Убрать из любимых': 'Remove from Liked', 'Убрать дизлайк': 'Remove dislike', 'Уже здесь': 'Already here', 'Название': 'Name', 'Переименовать': 'Rename', 'Удалить плейлист': 'Delete playlist',
  'Точно удалить? Нажми ещё раз': 'Sure? Tap again', 'Введи название': 'Enter a name', 'Название плейлиста (необязательно)': 'Playlist name (optional)', 'Перенести': 'Import',
  'Вставь ссылку или список': 'Paste a link or a list',
  'Список треков из Яндекс Музыки, Apple Music или Spotify можно скопировать прямо со страницы плейлиста.': 'You can copy a track list straight from a Yandex Music, Apple Music or Spotify playlist page.',
  'Echo ищет треки во всех сервисах сразу и включает полную версию из лучшего источника.': 'Echo searches every service at once and plays the full version from the best source.',
  'Яндекс Музыка': 'Yandex Music', 'Недоступно в веб-версии': 'Not available on the web', 'Ссылки на треки играют полностью': 'Track links play in full',
  'Работает без входа · полные треки': 'Works without sign-in · full tracks', 'Подключён': 'Connected', 'Нужен ключ в config.js': 'Needs a key in config.js',
  'Чарты, обложки, исполнители, альбомы': 'Charts, artwork, artists, albums', 'Проверить сервисы': 'Check services', 'Сохранить': 'Save', 'Сеть': 'Network', 'Подключить': 'Connect', 'Отключить': 'Disconnect',
  'Понятно, такое не ставим': 'Got it — we won’t play that', 'Отменить': 'Undo', 'Дизлайк убран': 'Dislike removed', 'Исполнитель снова в волне': 'Artist is back in the wave',
  'Добавили в «Мне нравится»': 'Added to Liked', 'Убрали из «Мне нравится»': 'Removed from Liked', 'Сыграет следующим': 'Plays next', 'Уже в этом плейлисте': 'Already in this playlist',
  'Убрали из плейлиста': 'Removed from playlist', 'Плейлист создан': 'Playlist created', 'Плейлист удалён': 'Playlist deleted', 'Плейлист не найден': 'Playlist not found',
  'Вперемешку ': 'Shuffle', 'Волна перестроена': 'Wave rebuilt', 'Собираю волну…': 'Building your wave…', 'Собираю волну по треку…': 'Building a track wave…', 'Собираю волну по исполнителю…': 'Building an artist wave…',
  'Не получилось собрать волну — проверь интернет': 'Couldn’t build the wave — check your connection', 'Похожей музыки не нашлось': 'No similar music found', 'Не нашли исполнителя для волны': 'Artist not found for a wave',
  'Трек недоступен — играю следующий': 'Track unavailable — playing the next one', 'Не удаётся воспроизвести — проверь интернет': 'Can’t play — check your connection',
  'Полная версия недоступна — играю фрагмент': 'Full version unavailable — playing a preview', 'У этих треков нет доступного звука': 'These tracks have no playable audio',
  'Волна закончилась — нажми «Слушать» ещё раз': 'The wave ended — press «Play» again', 'Убрали из коллекции': 'Removed from library', 'Исполнитель в коллекции — волна учтёт его': 'Artist added — the wave will use it',
  'Не удалось загрузить': 'Couldn’t load', 'Не удалось загрузить. Проверь интернет': 'Couldn’t load. Check your connection', 'Повторить': 'Retry', 'Исполнитель не найден': 'Artist not found',
  'Не получилось — проверь ссылку': 'Didn’t work — check the link', 'Ничего не нашли ': 'Nothing found', 'Ненормативная лексика': 'Explicit', 'Перенесённый плейлист': 'Imported playlist',
  'Язык интерфейса': 'Interface language', 'Первым будет': 'Up first', 'Сейчас': 'Now', 'Скоро': 'Soon',
};
const RULES = [
  [/^(\d+) трек(а|ов)?$/, (m, n) => `${n} track${n === '1' ? '' : 's'}`],
  [/^(\d+) трек(а|ов)? из всех сервисов$/, (m, n) => `${n} track${n === '1' ? '' : 's'} from every service`],
  [/^(\d+) трек(а|ов)? · (.*)$/, (m, n, x, rest) => `${n} track${n === '1' ? '' : 's'} · ${tr(rest)}`],
  [/^(\d+) из (\d+) сервисов$/, (m, a, b) => `${a} from ${b} services`],
  [/^Только полные · (\d+)$/, (m, n) => `Full tracks only · ${n}`],
  [/^Все, включая фрагменты · (\d+)$/, (m, n) => `All, including previews · ${n}`],
  [/^ещё (\d+)$/, (m, n) => `${n} more`],
  [/^Все (\d+)$/, (m, n) => `All ${n}`],
  [/^Все · (\d+)$/, (m, n) => `All · ${n}`],
  [/^Поиск: (.*)$/, (m, q) => `Search: ${q}`],
  [/^Волна: (.*)$/, (m, q) => `Wave: ${q}`],
  [/^Добавили в «(.*)»$/, (m, q) => `Added to «${q}»`],
  [/^Перенесено (\d+) трек\S*(.*)$/, (m, n, r) => `Imported ${n} tracks${r.replace(/, не нашли (\d+)/, ', $1 not found').replace(/ из Яндекс Музыки/, ' from Yandex Music')}`],
  [/^Больше не будем ставить (.*)$/, (m, a) => `We won’t play ${a} again`],
  [/^Не рекомендовать (.*)$/, (m, a) => `Don’t recommend ${a}`],
  [/^Показаны результаты по запросу «(.*)»$/, (m, q) => `Showing results for «${q}»`],
  [/^Ничего не нашли по «(.*)»$/, (m, q) => `Nothing found for «${q}»`],
  [/^([\d.,]+ (млн|тыс\.)|\d+) поклонников( на Deezer)?(.*)$/, (m, n, u, d, rest) => `${n.replace('млн', 'M').replace('тыс.', 'K')} fans${d ? ' on Deezer' : ''}${rest.replace(/(\d+) (релиз\S*|альбом\S*)/, (x, k, w) => `${k} ${/альбом/.test(w) ? 'albums' : 'releases'}`)}`],
  [/^Подстраивается под тебя — учтено (\d+) \S+, пропуски и дослушивания$/, (m, n) => `Tuned to you — ${n} ratings, skips and full listens`],
  [/^(.*) · учтено (\d+) \S+$/, (m, a, n) => `${tr(a)} · ${n} ratings`],
  [/^(\d{4}) · (\d+) трек\S*, (\d+) мин$/, (m, y, n, min) => `${y} · ${n} tracks, ${min} min`],
];
function tr(s) {
  if (LANG !== 'en' || !s) return s;
  const t = s.trim(); if (!t || !/[А-Яа-яЁё]/.test(t)) return s;
  if (EN[t] !== undefined) return s.replace(t, EN[t]);
  if (t.includes(' · ') && t.split(' · ').every(p => EN[p] || !/[А-Яа-яЁё]/.test(p))) return s.replace(t, t.split(' · ').map(p => EN[p] || p).join(' · '));
  for (const [re, fn] of RULES) { const m = t.match(re); if (m) return s.replace(t, fn(...m)); }
  return s;
}
// names of things (tracks, artists, albums, playlists, lyrics) stay as they are
const KEEP = '.tr-text b, .tr-sub > span:not(.srcs-t), .alb, .card b, .pm-text, .bar-text b, .bar-text small, .hero h1, .vcard, .ly-lines, .ly-head span, .top-res h3, .sheet-track, .uname, [data-sub-name] small, .sp-card h3, .wn-cap, .chip-name, #pCtx[data-user]';
const ATTRS = ['placeholder', 'aria-label', 'title', 'data-t', 'alt'];
function trNode(n) {
  if (n.nodeType === 3) { if (n.parentElement && n.parentElement.closest(KEEP)) return; const v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; return; }
  if (n.nodeType !== 1 || n.closest(KEEP)) return;
  for (const a of ATTRS) { const v = n.getAttribute(a); if (v) { const t = tr(v); if (t !== v) n.setAttribute(a, t); } }
  const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let x = w.nextNode(); x; x = w.nextNode()) trNode1(x);
}
function trNode1(x) {
  if (x.nodeType === 3) { if (x.parentElement && x.parentElement.closest(KEEP)) return; const v = tr(x.nodeValue); if (v !== x.nodeValue) x.nodeValue = v; }
  else if (!x.closest(KEEP)) for (const a of ATTRS) { const v = x.getAttribute(a); if (v) { const t = tr(v); if (t !== v) x.setAttribute(a, t); } }
}
if (LANG === 'en') {
  const run = () => {
    trNode(document.body);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') trNode1(m.target); else if (m.type === 'attributes') trNode1(m.target); else m.addedNodes.forEach(trNode); } })
      .observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', run) : run();
}
