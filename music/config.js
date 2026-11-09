// Echo Music — настройки. Ключ можно оставить пустым: тогда полные треки ищутся только в Wikidata (известные песни).
// Ключ YouTube (бесплатно, 5 минут): console.cloud.google.com → APIs & Services → включить «YouTube Data API v3»
// → Credentials → Create credentials → API key → Restrictions: «HTTP referrers» = https://ТВОЙ-САЙТ/* и «YouTube Data API v3».
// С таким ограничением ключ бесполезен на чужих сайтах, поэтому его можно хранить прямо здесь.
window.ECHO_CONFIG = {
  web: true,
  youtubeKey: 'AIzaSyCK30gucpyW03L9gBQCcXUuzWKrpZvO1BM',
};
