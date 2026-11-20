var BASE_URL = "https://topcinemaa.one";
var SOURCE_ID = "topcinemaa";

function getInfo() {
  return {
    name: "Top Cinema",
    lang: "ar",
    baseUrl: BASE_URL,
    type: "movie",
    version: "1.0.3"
  };
}

function absoluteUrl(url) {
  if (!url) return "";
  url = String(url).trim();
  if (url.indexOf("//") === 0) return "https:" + url;
  if (/^https?:\/\//i.test(url)) return url;
  return BASE_URL + (url.charAt(0) === "/" ? "" : "/") + url;
}

function decodeText(value) {
  return String(value || "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&#8217;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(Number(n)); })
    .replace(/&#x([\da-f]+);/gi, function (_, n) { return String.fromCharCode(parseInt(n, 16)); });
}

function cleanText(value) {
  return decodeText(String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ").trim();
}

function getPage(url) {
  return fetch(absoluteUrl(url), {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Referer": BASE_URL + "/"
    }
  }).then(function (response) {
    if (!response || response.status >= 400) throw new Error("HTTP error");
    if (typeof response.text === "function") return response.text();
    if (typeof response.text === "string") return response.text;
    return response.body || "";
  });
}

function attr(tag, name) {
  var re = new RegExp(name + "=[\"']([^\"']*)[\"']", "i");
  var match = String(tag || "").match(re);
  return match ? decodeText(match[1]) : "";
}

function parseItems(html) {
  var results = [];
  var seen = {};
  var blocks = String(html || "").match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [];

  blocks.forEach(function (block) {
    var open = block.match(/^<a\b[^>]*>/i);
    if (!open) return;
    var href = absoluteUrl(attr(open[0], "href"));
    if (!href || !/^https?:\/\//i.test(href)) return;
    if (href.indexOf("topcinemaa.one") === -1 || href === BASE_URL + "/" || seen[href]) return;
    if (/\/category\/|\/tag\/|\/page\/|\?s=/i.test(href)) return;

    var img = block.match(/<img\b[^>]*>/i);
    var title = img ? (attr(img[0], "alt") || attr(img[0], "title")) : "";
    if (!title) {
      var heading = block.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i);
      title = heading ? cleanText(heading[1]) : cleanText(block);
    }
    if (!title || title.length < 2) return;
    if (/مسلسل|انمي|أنمي|الحلقة|الموسم|season|episode/i.test(title)) return;

    var image = img ? (attr(img[0], "data-src") || attr(img[0], "data-lazy-src") || attr(img[0], "src")) : "";
    seen[href] = true;
    results.push({
      id: href,
      title: title,
      url: href,
      cover: image ? absoluteUrl(image) : null,
      type: "movie",
      sourceId: SOURCE_ID
    });
  });
  return results.slice(0, 50);
}

function search(query, page) {
  if (!query) return Promise.resolve([]);
  var url = BASE_URL + "/?s=" + encodeURIComponent(query) +
    (page && page > 1 ? "&paged=" + page : "");
  return getPage(url).then(parseItems).catch(function () { return []; });
}

function getHome() {
  return getPage(BASE_URL + "/").then(function (html) {
    var items = parseItems(html);
    return items.length ? [{ id: "latest", title: "أحدث الإضافات", items: items }] : [];
  }).catch(function () { return []; });
}

function getDetail(url) {
  return getPage(url).then(function (html) {
    var title = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i) || [])[1] ||
      (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
    var cover = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || [])[1] || "";
    var description = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i) || [])[1] || "";
    var watchLinks = [];
    var linkRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    var match;
    while ((match = linkRe.exec(html)) !== null) {
      var label = cleanText(match[2]);
      var href = absoluteUrl(match[1]);
      if (/مشاهدة|السيرفر|watch|play|تحميل/i.test(label) && href) {
        watchLinks.push({ id: href, title: label || "مشاهدة", url: href, type: "movie", sourceId: SOURCE_ID });
      }
    }
    return {
      id: url,
      title: cleanText(title),
      url: url,
      cover: cover ? absoluteUrl(cover) : null,
      description: cleanText(description),
      type: "movie",
      sourceId: SOURCE_ID,
      episodes: watchLinks
    };
  }).catch(function () {
    return { id: url, title: "", url: url, type: "movie", sourceId: SOURCE_ID, episodes: [] };
  });
}

function getEpisodes(url) {
  return getPage(url).then(function (html) {
    var found = [];
    var seen = {};
    var re = /<(?:iframe|source)\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
    var match;
    while ((match = re.exec(html)) !== null) {
      var link = absoluteUrl(match[1]);
      if (link && !seen[link]) {
        seen[link] = true;
        found.push({ id: link, title: "مشاهدة", url: link, type: "movie", sourceId: SOURCE_ID });
      }
    }
    return found;
  }).catch(function () { return []; });
}

function getVideoSources(episodeUrl) {
  return getPage(episodeUrl).then(function (html) {
    var candidates = [];
    var seen = {};
    var re = /(?:src|data-src|data-url)=["']([^"']+)["']/gi;
    var match;
    while ((match = re.exec(html)) !== null) {
      var link = absoluteUrl(match[1]);
      if (!link || seen[link]) continue;
      if (/\.(?:m3u8|mp4)(?:[?#]|$)/i.test(link) || /iframe|embed|player|stream/i.test(link)) {
        seen[link] = true;
        candidates.push(link);
      }
    }

    var direct = candidates.filter(function (link) { return /\.(?:m3u8|mp4)(?:[?#]|$)/i.test(link); });
    if (direct.length) {
      return direct.map(function (link) {
        return { url: link, quality: "Auto", type: /\.m3u8/i.test(link) ? "hls" : "mp4" };
      });
    }

    var embedded = candidates.filter(function (link) { return !/\.(?:m3u8|mp4)(?:[?#]|$)/i.test(link); });
    if (embedded.length && typeof extractVideo === "function") {
      return Promise.all(embedded.map(function (link) {
        return Promise.resolve(extractVideo(link, {
          headers: { Referer: absoluteUrl(episodeUrl) }
        })).catch(function () { return []; });
      })).then(function (groups) {
        return groups.reduce(function (all, group) {
          if (Array.isArray(group)) return all.concat(group);
          if (group) all.push(group);
          return all;
        }, []);
      });
    }
    return [];
  }).catch(function () { return []; });
}
