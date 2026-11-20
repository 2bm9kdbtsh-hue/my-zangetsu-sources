var BASE_URL = "https://nxxhentai.net";
var SOURCE_ID = "nxxhentai";
var UA = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";

function getInfo() {
  return { name: "NXX Hentai (Catalog Only)", lang: "ar", baseUrl: BASE_URL, type: "movie", version: "1.0.0" };
}
function absoluteUrl(value, base) {
  if (!value) return "";
  var s = String(value).trim();
  if (/^(?:javascript:|mailto:|#)/i.test(s)) return "";
  if (s.indexOf("//") === 0) return "https:" + s;
  if (/^https?:\/\//i.test(s)) return s;
  return (base || BASE_URL) + (s.charAt(0) === "/" ? s : "/" + s);
}
function decodeText(value) {
  return String(value || "").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"').replace(/&#0*39;|&#8217;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, function(_, n) { return String.fromCharCode(+n); })
    .replace(/&#x([\da-f]+);/gi, function(_, n) { return String.fromCharCode(parseInt(n, 16)); });
}
function cleanText(value) {
  return decodeText(String(value || "").replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ").trim();
}
function attr(tag, name) {
  var re = /([a-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, m, wanted = String(name).toLowerCase();
  while ((m = re.exec(String(tag || ""))) !== null) {
    if (String(m[1]).toLowerCase() === wanted) return decodeText(m[2] !== undefined ? m[2] : m[3]);
  }
  return "";
}
function getPage(url) {
  return fetch(absoluteUrl(url), { headers: { "User-Agent": UA, "Referer": BASE_URL + "/" } })
    .then(function(response) {
      if (!response || (response.status && response.status >= 400)) throw new Error("HTTP " + (response && response.status));
      if (typeof response.text === "function") return response.text();
      return typeof response.text === "string" ? response.text : (response.body || "");
    });
}
function parseItems(html) {
  var out = [], seen = {}, re = /<a\b[^>]*>[\s\S]*?<\/a>/gi, match;
  while ((match = re.exec(String(html || ""))) !== null) {
    var block = match[0], opening = (block.match(/^<a\b[^>]*>/i) || [])[0] || "";
    var href = absoluteUrl(attr(opening, "href"));
    if (!href || !/^https?:\/\/nxxhentai\.net\//i.test(href) || seen[href]) continue;
    if (!/\/(?:anime|episodes)\//i.test(href)) continue;
    var img = (block.match(/<img\b[^>]*>/i) || [])[0] || "";
    var title = cleanText(attr(opening, "title") || attr(img, "alt") || attr(img, "title") ||
      (block.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i) || [])[1] || block);
    if (!title || title.length < 2) continue;
    var imageUrl = attr(img, "data-src") || attr(img, "data-lazy-src") || attr(img, "data-original") || attr(img, "src");
    seen[href] = true;
    out.push({
      id: href, title: title, url: href,
      cover: imageUrl ? absoluteUrl(imageUrl) : null,
      type: /\/episodes\//i.test(href) ? "episode" : "anime",
      sourceId: SOURCE_ID, nsfw: true
    });
    if (out.length >= 100) break;
  }
  return out;
}
function search(query, page) {
  if (!query) return Promise.resolve([]);
  var url = BASE_URL + "/?s=" + encodeURIComponent(query);
  if (page && page > 1) url += "&paged=" + page;
  return getPage(url).then(parseItems).catch(function() { return []; });
}
function getHome() {
  return Promise.all([
    getPage(BASE_URL + "/").then(function(html) {
      return { id: "latest", title: "آخر الحلقات المضافة", items: parseItems(html) };
    }).catch(function() { return { id: "latest", title: "آخر الحلقات المضافة", items: [] }; }),
    getPage(BASE_URL + "/anime/").then(function(html) {
      return { id: "catalog", title: "قائمة الهنتاي (+18)", items: parseItems(html) };
    }).catch(function() { return { id: "catalog", title: "قائمة الهنتاي (+18)", items: [] }; })
  ]);
}
function getHomePage(rowId, page) {
  var url = rowId === "catalog" ? BASE_URL + "/anime/" : BASE_URL + "/";
  if (page && page > 1) url += (url.indexOf("?") >= 0 ? "&" : "?") + "paged=" + page;
  return getPage(url).then(parseItems).catch(function() { return []; });
}
function getDetail(url) {
  return getPage(url).then(function(html) {
    var title = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || [])[1] ||
      (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
    var cover = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || [])[1] || "";
    var description = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) || [])[1] || "";
    var episodes = [], seen = {}, re = /<a\b[^>]*>[\s\S]*?<\/a>/gi, match;
    while ((match = re.exec(String(html || ""))) !== null) {
      var opening = (match[0].match(/^<a\b[^>]*>/i) || [])[0] || "";
      var episodeUrl = absoluteUrl(attr(opening, "href"), url);
      if (!episodeUrl || !/\/episodes\//i.test(episodeUrl) || seen[episodeUrl]) continue;
      var label = cleanText(attr(opening, "title") || match[0]);
      if (!label) continue;
      seen[episodeUrl] = true;
      episodes.push({ id: episodeUrl, number: episodes.length + 1, title: label, url: episodeUrl, type: "episode", sourceId: SOURCE_ID, nsfw: true });
    }
    return {
      id: url, title: cleanText(title), url: url,
      cover: cover ? absoluteUrl(cover, url) : null,
      description: cleanText(description), genres: [], type: "anime",
      sourceId: SOURCE_ID, nsfw: true, episodes: episodes
    };
  });
}
function getEpisodes(url) {
  return getDetail(url).then(function(detail) { return detail.episodes || []; }).catch(function() { return []; });
}

/* Catalog-only provider: intentionally does not implement getVideoSources or media extraction. */
