
var BASE_URL = "https://topcinemaa.one";
var SOURCE_ID = "topcinemaa";

function getInfo() {
  return {
    name: "Top Cinema",
    lang: "ar",
    baseUrl: BASE_URL,
    type: "movie",
    version: "1.0.2"
  };
}

function cleanText(s) {
  return String(s || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(url) {
  if (!url) return "";
  if (url.indexOf("//") === 0) return "https:" + url;
  if (/^https?:\/\//i.test(url)) return url;
  return BASE_URL + (url.charAt(0) === "/" ? "" : "/") + url;
}

function getPage(url) {
  return fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Referer": BASE_URL + "/"
    }
  }).then(function (r) {
    return r.body || "";
  });
}

function parseItems(html) {
  var out = [];
  var seen = {};
  var re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  var m;

  while ((m = re.exec(html)) !== null) {
    var href = absoluteUrl(m[1]);
    var inner = m[2];

    if (!/topcinemaa\.one/i.test(href)) continue;
    if (href === BASE_URL + "/" || seen[href]) continue;

    var titleMatch =
      inner.match(/<img[^>]+alt=["']([^"']+)["']/i) ||
      inner.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);

    var title = cleanText(titleMatch ? titleMatch[1] : inner);
    if (!title || title.length < 2) continue;

    var imageMatch = inner.match(
      /<img[^>]+(?:data-src|data-lazy-src|src)=["']([^"']+)["']/i
    );

    seen[href] = true;
    out.push({
      id: href,
      title: title,
      url: href,
      cover: imageMatch ? absoluteUrl(imageMatch[1]) : null,
      type: "movie",
      sourceId: SOURCE_ID
    });

    if (out.length >= 40) break;
  }

  return out;
}

function search(query, page) {
  if (!query) return Promise.resolve([]);

  var url = BASE_URL + "/?s=" +
    encodeURIComponent(query) +
    (page > 1 ? "&paged=" + page : "");

  return getPage(url)
    .then(function (html) {
      return parseItems(html);
    })
    .catch(function () {
      return [];
    });
}

function getHome() {
  return getPage(BASE_URL + "/")
    .then(function (html) {
      return [{
        id: "latest",
        title: "المضاف حديثاً",
        items: parseItems(html)
      }];
    })
    .catch(function () {
      return [];
    });
}

function getDetail(url) {
  return getPage(url).then(function (html) {
    var title =
      (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || [])[1] ||
      (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] ||
      "";

    var cover =
      (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || [])[1] ||
      "";

    var description =
      (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) || [])[1] ||
      "";

    return {
      id: url,
      title: cleanText(title),
      url: url,
      cover: cover ? absoluteUrl(cover) : null,
      description: cleanText(description),
      type: "movie",
      sourceId: SOURCE_ID,
      episodes: []
    };
  }).catch(function () {
    return {
      id: url,
      title: "",
      url: url,
      type: "movie",
      sourceId: SOURCE_ID,
      episodes: []
    };
  });
}

function getEpisodes(url) {
  return Promise.resolve([]);
}

function getVideoSources(url) {
  return Promise.resolve([]);
}
