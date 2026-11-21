// TVmaze series metadata provider for Zangetsu.
// Metadata only: no video URLs are extracted or supplied.
var SOURCE_ID = 'tvmaze-series';
var API = 'https://api.tvmaze.com';
var VERSION = '1.0.0';

function getInfo() {
  return { name: 'TVmaze Series Metadata', lang: 'en', baseUrl: API, type: 'movie', version: VERSION };
}
function _request(url) {
  return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
    if (!r || (r.status && r.status >= 400)) throw new Error('TVmaze HTTP ' + (r && r.status));
    if (typeof r.body === 'string') return JSON.parse(r.body);
    if (typeof r.text === 'function') return r.text().then(function (t) { return JSON.parse(t); });
    if (typeof r.text === 'string') return JSON.parse(r.text);
    throw new Error('TVmaze returned an unreadable response');
  });
}
function _card(show) {
  if (!show || !show.id) return null;
  var image = show.image && (show.image.original || show.image.medium) || null;
  return {
    id: String(show.id), title: show.name || 'Untitled series', url: String(show.id),
    cover: image, type: 'movie', sourceId: SOURCE_ID,
    description: String(show.summary || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    language: show.language || null, status: show.status || 'unknown'
  };
}
function search(query, page) {
  var q = String(query || '').trim();
  if (!q) return Promise.resolve([]);
  return _request(API + '/search/shows?q=' + encodeURIComponent(q))
    .then(function (rows) { return (rows || []).map(function (x) { return _card(x.show); }).filter(Boolean); })
    .catch(function () { return []; });
}
function getHome() {
  return _request(API + '/shows?page=0').then(function (rows) {
    var items = (rows || []).slice(0, 24).map(_card).filter(Boolean);
    return [{ id: 'catalog', title: 'TVmaze series catalogue', items: items }];
  }).catch(function () { return []; });
}
function getHomePage(rowId, page) {
  return _request(API + '/shows?page=' + Math.max(0, (Number(page) || 1) - 1))
    .then(function (rows) { return (rows || []).map(_card).filter(Boolean); })
    .catch(function () { return []; });
}
function getDetail(id) {
  return _request(API + '/shows/' + encodeURIComponent(String(id))).then(function (show) {
    var item = _card(show);
    if (!item) throw new Error('TVmaze show not found');
    item.genres = show.genres || [];
    item.premiered = show.premiered || null;
    item.ended = show.ended || null;
    item.network = show.network && show.network.name || show.webChannel && show.webChannel.name || null;
    item.schedule = show.schedule || null;
    item.officialSite = show.officialSite || null;
    return item;
  });
}
function getEpisodes(id) {
  return _request(API + '/shows/' + encodeURIComponent(String(id)) + '/episodes')
    .then(function (rows) {
      return (rows || []).map(function (e) {
        return {
          id: String(e.id), number: e.number || 0,
          title: e.name || 'Episode', season: e.season || 0,
          url: 'tvmaze-episode://' + String(e.id), type: 'series', sourceId: SOURCE_ID,
          description: String(e.summary || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
          thumbnail: e.image && (e.image.original || e.image.medium) || null,
          airdate: e.airdate || null
        };
      });
    }).catch(function () { return []; });
}
// Intentionally no getVideoSources(): this provider supplies catalogue metadata only.
