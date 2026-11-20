// AnimeXin — Zangetsu JavaScript provider
// Rewritten from the Yuzono AnimeXin source for the Zangetsu provider API.
var BASE_URL = "https://animexin.dev";
var SOURCE_ID = "animexin";
var UA = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";

function getInfo() {
  return { name: "AnimeXin", lang: "all", baseUrl: BASE_URL, type: "anime", version: "1.0.0" };
}
function _abs(url, base) {
  if (!url) return "";
  var s = String(url).trim();
  if (/^(?:javascript:|mailto:|#)/i.test(s)) return "";
  if (s.indexOf("//") === 0) return "https:" + s;
  if (/^https?:\/\//i.test(s)) return s;
  return (base || BASE_URL).replace(/\/$/, "") + (s.charAt(0) === "/" ? s : "/" + s);
}
function _decode(s) {
  return String(s || "").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, function(_, n) { return String.fromCharCode(+n); })
    .replace(/&#x([\da-f]+);/gi, function(_, n) { return String.fromCharCode(parseInt(n, 16)); });
}
function _text(s) {
  return _decode(String(s || "").replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ").trim();
}
function _attr(tag, key) {
  var re = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, m;
  while ((m = re.exec(String(tag || ""))) !== null)
    if (m[1].toLowerCase() === key.toLowerCase()) return _decode(m[2] || m[3] || m[4] || "");
  return "";
}
function _get(url, referer) {
  return fetch(_abs(url), { headers: { "User-Agent": UA, "Referer": referer || BASE_URL + "/" } })
    .then(function(r) {
      if (!r || (r.status && r.status >= 400)) throw new Error("HTTP " + (r && r.status));
      return String(r.body || (typeof r.text === "string" ? r.text : ""));
    });
}
function _items(html) {
  var out = [], seen = {}, re = /<a\b[^>]*class=["'][^"']*\btip\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, m;
  while ((m = re.exec(String(html || ""))) !== null) {
    var block = m[0], open = (block.match(/^<a\b[^>]*>/i) || [""])[0];
    var url = _abs(_attr(open, "href"));
    if (!url || seen[url]) continue;
    var title = _text((block.match(/<div\b[^>]*class=["'][^"']*(?:tt|ttl)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1]
      || _attr((block.match(/<img\b[^>]*>/i) || [""])[0], "alt") || _attr(open, "title"));
    if (!title) continue;
    var img = (block.match(/<img\b[^>]*>/i) || [""])[0];
    var cover = _attr(img, "data-src") || _attr(img, "data-lazy-src") || _attr(img, "src");
    seen[url] = 1;
    out.push({ id: url, title: title, url: url, cover: cover ? _abs(cover, url) : null, type: "anime", sourceId: SOURCE_ID });
  }
  return out;
}
function search(query, page) {
  var p = page && page > 1 ? "/page/" + page + "/" : "/";
  return _get(p + "?s=" + encodeURIComponent(query || ""))
    .then(_items).catch(function() { return []; });
}
function getHome() {
  return Promise.all([
    _get("/").then(function(h) { return { id: "popular", title: "Popular Donghua", items: _items(h) }; }),
    _get("/?order=update").then(function(h) { return { id: "latest", title: "Latest Release", items: _items(h) }; })
  ]).catch(function() { return []; });
}
function getHomePage(rowId, page) {
  var p = page && page > 1 ? "/page/" + page + "/" : "/";
  if (rowId === "latest") p += "?order=update";
  return _get(p).then(_items).catch(function() { return []; });
}
function _parseEpisodes(html) {
  var out = [], re = /<li\b[^>]*>[\s\S]*?<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>[\s\S]*?<\/li>/gi, m, seen = {};
  while ((m = re.exec(html)) !== null) {
    var block = m[0], href = _abs(m[1]);
    if (!href || seen[href]) continue;
    var n = _text((block.match(/class=["'][^"']*epl-num[^"']*["'][^>]*>([\s\S]*?)<\//i) || [])[1]);
    var sub = _text((block.match(/class=["'][^"']*epl-sub[^"']*["'][^>]*>([\s\S]*?)<\//i) || [])[1]);
    var date = _text((block.match(/class=["'][^"']*epl-date[^"']*["'][^>]*>([\s\S]*?)<\//i) || [])[1]);
    var label = _text((block.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i) || [])[1]);
    var num = parseFloat((n || label).match(/[\d.]+/) || [0])[0] || out.length + 1;
    seen[href] = 1;
    out.push({ id: href, number: num, title: label || ("Episode " + num), url: href, date: date || null, sourceId: SOURCE_ID });
  }
  return out;
}
function getDetail(url) {
  return _get(url).then(function(html) {
    var title = _text((html.match(/<h1\b[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) || [])[1]
      || (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || [])[1] || "");
    var img = (html.match(/<img\b[^>]*(?:class=["'][^"']*(?:wp-post-image|attachment-post-thumbnail)[^"']*["'])?[^>]*>/i) || [""])[0];
    var cover = _attr(img, "data-src") || _attr(img, "data-lazy-src") || _attr(img, "src")
      || (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || [])[1] || "";
    var info = (html.match(/(?:<div\b[^>]*class=["'][^"']*(?:info-content|right)[^"']*["'][^>]*>)([\s\S]*?)(?:<\/div>\s*<\/div>|<\/ul>)/i) || [])[1] || html;
    var desc = _text((html.match(/<div\b[^>]*class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "");
    var genres = [], gm, gr = /<a\b[^>]*href=["'][^"']*genre[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
    while ((gm = gr.exec(html)) !== null) genres.push(_text(gm[1]));
    var episodes = _parseEpisodes(html);
    var status = /\bongoing\b/i.test(info) ? "ongoing" : /\bcompleted\b/i.test(info) ? "completed" : "unknown";
    return { id: url, title: title, url: url, cover: cover ? _abs(cover, url) : null,
      description: desc, genres: genres, status: status, type: "anime", sourceId: SOURCE_ID, episodes: episodes };
  });
}
function getEpisodes(url) {
  return _get(url).then(_parseEpisodes);
}
function _iframeUrl(html, base) {
  var m = String(html || "").match(/<iframe\b[^>]*>/i);
  if (m) {
    var u = _attr(m[0], "src") || _attr(m[0], "data-src");
    if (u) return _abs(u, base);
  }
  var meta = String(html || "").match(/<meta[^>]+itemprop=["']embedUrl["'][^>]+content=["']([^"']+)/i);
  return meta ? _abs(meta[1], base) : "";
}
function _hosterUrl(encoded, referer) {
  if (/^https?:\/\//i.test(encoded)) return _get(encoded, referer).then(function(h) { return _iframeUrl(h, encoded) || encoded; });
  var decoded = "";
  try { decoded = base64ToBytes(encoded).reduce(function(s, b) { return s + String.fromCharCode(b); }, ""); } catch(e) {}
  var iframe = _iframeUrl(decoded, referer);
  if (iframe) return Promise.resolve(iframe);
  var plain = decoded.match(/https?:\/\/[^"'\s<>]+/i);
  if (plain) return _get(plain[0], referer).then(function(h) { return _iframeUrl(h, plain[0]) || plain[0]; });
  return Promise.reject(new Error("AnimeXin: could not decode server embed"));
}
function getVideoSources(episodeUrl) {
  return _get(episodeUrl).then(function(html) {
    var servers = [], re = /<(option|a)\b[^>]*(?:data-em|data-index)[^>]*>/gi, m;
    while ((m = re.exec(html)) !== null) {
      var tag = m[0], encoded = _attr(tag, "data-em") || _attr(tag, "value");
      if (encoded) servers.push({ name: _text(tag.replace(/<[^>]*>/g, "")) || "Server", data: encoded });
    }
    var ifr = _iframeUrl(html, episodeUrl);
    var jobs = servers.slice(0, 12).map(function(s) {
      return _hosterUrl(s.data, episodeUrl).then(function(u) { return { url: u, name: s.name }; }).catch(function() { return null; });
    });
    if (!servers.length && ifr) jobs.push(Promise.resolve({ url: ifr, name: "Embedded player" }));
    return Promise.all(jobs).then(function(found) {
      var out = [], seen = {};
      found.forEach(function(x) {
        if (!x || !x.url || seen[x.url]) return;
        seen[x.url] = 1;
        if (typeof extractVideo === "function") {
          out.push(extractVideo(x.url, { headers: { "Referer": episodeUrl } }).then(function(v) { return v; }).catch(function() { return []; }));
        }
      });
      return Promise.all(out).then(function(groups) {
        var flat = [];
        groups.forEach(function(g) { (Array.isArray(g) ? g : g ? [g] : []).forEach(function(v) { if (v && v.url) flat.push(v); }); });
        if (!flat.length) throw new Error("AnimeXin: no playable server returned a video");
        return flat;
      });
    });
  });
}
