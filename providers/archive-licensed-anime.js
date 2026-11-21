// Internet Archive licensed-video provider for Zangetsu.
// Only items with an explicit public-domain or Creative Commons license URL
// are listed. Rights metadata is supplied by uploaders and is not independently
// verified by Internet Archive; users should review each item's rights statement.
var SOURCE_ID = 'archive-licensed-anime';
var API = 'https://archive.org';
var VERSION = '1.0.0';
var MEDIA_TYPE = 'anime';
var SEARCH_SCOPE = 'mediatype:movies AND (licenseurl:http*publicdomain* OR licenseurl:http*creativecommons.org/licenses/by/* OR licenseurl:http*creativecommons.org/licenses/by-sa/* OR licenseurl:http*creativecommons.org/licenses/by-nc/* OR licenseurl:http*creativecommons.org/licenses/by-nd/*) AND (subject:anime OR title:anime)';

function getInfo() {
  return { name: 'Internet Archive Licensed Anime', lang: 'all', baseUrl: API, type: MEDIA_TYPE, version: VERSION };
}
function _allowedLicense(value) {
  var s = String(value || '').toLowerCase();
  return s.indexOf('publicdomain') !== -1 ||
    s.indexOf('creativecommons.org/licenses/by/') !== -1 ||
    s.indexOf('creativecommons.org/licenses/by-sa/') !== -1 ||
    s.indexOf('creativecommons.org/licenses/by-nc/') !== -1 ||
    s.indexOf('creativecommons.org/licenses/by-nd/') !== -1;
}
function _request(url) {
  return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
    if (!r || (r.status && r.status >= 400)) throw new Error('Internet Archive HTTP ' + (r && r.status));
    if (typeof r.body === 'string') return JSON.parse(r.body);
    if (typeof r.text === 'function') return r.text().then(function (t) { return JSON.parse(t); });
    if (typeof r.text === 'string') return JSON.parse(r.text);
    throw new Error('Internet Archive returned an unreadable response');
  });
}
function _clean(v) {
  return String(v || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
function _itemUrl(id) { return API + '/details/' + encodeURIComponent(String(id)); }
function _card(doc) {
  if (!doc || !doc.identifier || !doc.title || !_allowedLicense(doc.licenseurl)) return null;
  return {
    id: String(doc.identifier), title: _clean(doc.title),
    url: String(doc.identifier),
    cover: API + '/services/img/' + encodeURIComponent(String(doc.identifier)),
    type: MEDIA_TYPE, sourceId: SOURCE_ID,
    description: _clean(doc.description || ''),
    year: doc.year ? String(doc.year) : null
  };
}
function _searchUrl(query, page) {
  var q = SEARCH_SCOPE + ' AND ' + query;
  return API + '/advancedsearch.php?q=' + encodeURIComponent(q) +
    '&fl[]=identifier&fl[]=title&fl[]=description&fl[]=year&fl[]=licenseurl' +
    '&rows=24&page=' + Math.max(1, Number(page) || 1) +
    '&output=json&sort[]=downloads+desc';
}
function search(query, page) {
  var q = String(query || '').trim();
  if (!q) return Promise.resolve([]);
  return _request(_searchUrl('title:(' + q.replace(/[():]/g, ' ') + ')', page))
    .then(function (j) {
      var docs = j && j.response && j.response.docs || [];
      return docs.map(_card).filter(Boolean);
    }).catch(function () { return []; });
}
function getHome() {
  return _request(_searchUrl('*:*', 1)).then(function (j) {
    var docs = j && j.response && j.response.docs || [];
    return [{ id: 'popular', title: 'Licensed archive videos', items: docs.map(_card).filter(Boolean) }];
  }).catch(function () { return []; });
}
function getHomePage(rowId, page) {
  if (rowId !== 'popular') return Promise.resolve([]);
  return _request(_searchUrl('*:*', page)).then(function (j) {
    var docs = j && j.response && j.response.docs || [];
    return docs.map(_card).filter(Boolean);
  }).catch(function () { return []; });
}
function _playableFiles(meta) {
  var files = meta && meta.files || [];
  return files.filter(function (f) {
    var n = String(f.name || '').toLowerCase();
    return /\.(mp4|m4v|webm|mkv)$/i.test(n) && f.source !== 'metadata';
  }).sort(function (a, b) {
    var ap = /\.mp4$/i.test(a.name || '') ? 0 : 1;
    var bp = /\.mp4$/i.test(b.name || '') ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return (Number(b.size) || 0) - (Number(a.size) || 0);
  });
}
function _fileUrl(id, name) {
  return API + '/download/' + encodeURIComponent(String(id)) + '/' +
    String(name).split('/').map(encodeURIComponent).join('/');
}
function _episode(id, title) {
  return {
    id: String(id), title: title || 'Full video', number: 1,
    url: 'ia-video://' + String(id), type: MEDIA_TYPE, sourceId: SOURCE_ID
  };
}
function getDetail(id) {
  return _request(API + '/metadata/' + encodeURIComponent(String(id))).then(function (meta) {
    var m = meta && meta.metadata || {};
    if (!_allowedLicense(m.licenseurl)) throw new Error('No supported public-domain or Creative Commons license declared');
    var title = _clean(m.title || id);
    return {
      id: String(id), title: title, url: String(id),
      cover: API + '/services/img/' + encodeURIComponent(String(id)),
      description: _clean(m.description || m.abstract || ''),
      year: m.year || m.date || null,
      genres: Array.isArray(m.subject) ? m.subject : (m.subject ? [String(m.subject)] : []),
      type: MEDIA_TYPE, sourceId: SOURCE_ID,
      licenseUrl: String(m.licenseurl),
      episodes: [_episode(id, title)]
    };
  });
}
function getEpisodes(id) {
  return getDetail(id).then(function (d) { return d.episodes || []; });
}
function getVideoSources(episodeUrl) {
  var id = String(episodeUrl || '').replace(/^ia-video:\/\//, '');
  if (!id) return Promise.resolve([]);
  return _request(API + '/metadata/' + encodeURIComponent(id)).then(function (meta) {
    var m = meta && meta.metadata || {};
    if (!_allowedLicense(m.licenseurl)) return [];
    return _playableFiles(meta).slice(0, 8).map(function (f) {
      var ext = String(f.name || '').split('.').pop().toLowerCase();
      return {
        url: _fileUrl(id, f.name),
        quality: f.height ? String(f.height) + 'p' : (f.format || ext.toUpperCase()),
        label: 'Archive Anime · ' + (f.name || 'Video'),
        container: ext === 'mp4' || ext === 'm4v' ? 'mp4' : 'unknown',
        kind: 'unknown'
      };
    });
  }).catch(function () { return []; });
}
