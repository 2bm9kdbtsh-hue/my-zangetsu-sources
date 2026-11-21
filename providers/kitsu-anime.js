// Kitsu metadata provider for Zangetsu.
// Metadata only: Kitsu does not provide video streams through this provider.
var SOURCE_ID = 'kitsu-anime';
var API = 'https://kitsu.io/api/edge';
var VERSION = '1.0.0';

function getInfo() {
  return { name: 'Kitsu Anime Metadata', lang: 'all', baseUrl: API, type: 'anime', version: VERSION };
}
function _request(url) {
  return fetch(url, { headers: { Accept: 'application/vnd.api+json', 'Content-Type': 'application/vnd.api+json' } })
    .then(function (r) {
      if (!r || (r.status && r.status >= 400)) throw new Error('Kitsu HTTP ' + (r && r.status));
      var body = r.body;
      if (typeof body === 'string') return JSON.parse(body);
      if (typeof r.text === 'function') return r.text().then(function (t) { return JSON.parse(t); });
      if (typeof r.text === 'string') return JSON.parse(r.text);
      throw new Error('Kitsu returned an unreadable response');
    });
}
function _image(a) {
  var p = a && a.attributes && a.attributes.posterImage;
  return p && (p.large || p.medium || p.small) || null;
}
function _title(a) {
  var x = a && a.attributes || {}, t = x.titles || {};
  return t.en || t.en_jp || x.canonicalTitle || (t.ja_jp || 'Untitled anime');
}
function _card(a) {
  if (!a || !a.id || !a.attributes) return null;
  return {
    id: String(a.id), title: _title(a), url: String(a.id),
    cover: _image(a), type: 'anime', sourceId: SOURCE_ID,
    description: a.attributes.synopsis || '', status: a.attributes.status || 'unknown'
  };
}
function search(query, page) {
  var q = String(query || '').trim();
  if (!q) return Promise.resolve([]);
  var offset = Math.max(0, ((Number(page) || 1) - 1) * 20);
  var url = API + '/anime?filter[text]=' + encodeURIComponent(q) +
    '&page[limit]=20&page[offset]=' + offset + '&sort=-userCount';
  return _request(url).then(function (j) {
    return (j.data || []).map(_card).filter(Boolean);
  }).catch(function () { return []; });
}
function getHome() {
  var url = API + '/anime?page[limit]=20&sort=-userCount';
  return _request(url).then(function (j) {
    return [{ id: 'popular', title: 'Popular anime', items: (j.data || []).map(_card).filter(Boolean) }];
  }).catch(function () { return []; });
}
function getHomePage(rowId, page) {
  var offset = Math.max(0, ((Number(page) || 1) - 1) * 20);
  var url = API + '/anime?page[limit]=20&page[offset]=' + offset + '&sort=-userCount';
  return _request(url).then(function (j) { return (j.data || []).map(_card).filter(Boolean); })
    .catch(function () { return []; });
}
function getDetail(id) {
  return _request(API + '/anime/' + encodeURIComponent(String(id))).then(function (j) {
    var item = _card(j.data);
    if (!item) throw new Error('Kitsu anime not found');
    var a = j.data.attributes || {};
    item.description = a.synopsis || '';
    item.genres = [];
    item.year = a.startDate ? String(a.startDate).slice(0, 4) : null;
    item.status = a.status || 'unknown';
    item.episodesCount = a.episodeCount || null;
    return item;
  });
}
function getEpisodes(id) {
  return _request(API + '/anime/' + encodeURIComponent(String(id)) + '/episodes?page[limit]=20&sort=number')
    .then(function (j) {
      return (j.data || []).map(function (e) {
        var a = e.attributes || {};
        return {
          id: String(e.id), number: a.number || 0,
          title: a.canonicalTitle || a.titles && (a.titles.en || a.titles.en_jp) || ('Episode ' + (a.number || '')),
          url: 'kitsu-episode://' + String(e.id), type: 'anime', sourceId: SOURCE_ID,
          thumbnail: a.thumbnail && a.thumbnail.original || null
        };
      });
    }).catch(function () { return []; });
}
// Intentionally no getVideoSources(): this provider supplies catalogue metadata only.
