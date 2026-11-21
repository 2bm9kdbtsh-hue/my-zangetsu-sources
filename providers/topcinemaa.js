/* Top Cinema provider for Zangetsu.
 * Uses the site's public HTML pages; no undocumented site API is assumed.
 */
var BASE_URL = "https://topcinemaa.one";
var SOURCE_ID = "topcinemaa";
var VERSION = "1.4.0";
var UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36";

function getInfo() {
  return { name: "Top Cinema", lang: "ar", baseUrl: BASE_URL, type: "movie", version: VERSION };
}
function absoluteUrl(value, base) {
  if (!value) return "";
  var s = String(value).trim();
  if (/^(?:javascript:|mailto:|#|data:)/i.test(s)) return "";
  if (s.indexOf("//") === 0) return "https:" + s;
  if (/^https?:\/\//i.test(s)) return s;
  var root = (base || BASE_URL).replace(/\/+$/, "");
  return root + (s.charAt(0) === "/" ? s : "/" + s);
}
function decodeText(value) {
  return String(value || "").replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&#8217;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, function(_, n) { return String.fromCharCode(+n); })
    .replace(/&#x([\da-f]+);/gi, function(_, n) { return String.fromCharCode(parseInt(n, 16)); });
}
function cleanText(value) {
  return decodeText(String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function attr(tag, name) {
  var re = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, m;
  while ((m = re.exec(String(tag || ""))) !== null) {
    if (String(m[1]).toLowerCase() === String(name).toLowerCase())
      return decodeText(m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : m[4]));
  }
  return "";
}
function getPage(url, referer) {
  return fetch(absoluteUrl(url), {
    headers: { "User-Agent": UA, "Referer": referer || BASE_URL + "/", "Accept": "text/html,application/xhtml+xml" },
    browser: true
  }).then(function(response) {
    if (!response || (response.status && response.status >= 400))
      throw new Error("Top Cinema HTTP " + (response && response.status));
    if (typeof response.text === "function") return response.text();
    if (typeof response.text === "string") return response.text;
    return String(response.body || "");
  });
}
function classify(title, url) {
  var s = String(title || "") + " " + String(url || "");
  if (/(?:انمي|أنمي|anime)/i.test(s)) return "anime";
  if (/(?:مسلسل|الحلقة|الموسم|series|episode|season|s\d{1,2}e\d{1,2})/i.test(s)) return "series";
  return "movie";
}
function isContentUrl(url) {
  return !!url && /^https?:\/\/(?:www\.)?topcinemaa\.one\//i.test(url) &&
    !/\/(?:category|tag|page|watch|download|author|wp-content|wp-json)\//i.test(url) &&
    !/[?&](?:s|paged)=/i.test(url);
}
function parseItems(html) {
  var output = [], seen = {}, re = /<a\b[^>]*>[\s\S]*?<\/a>/gi, match;
  while ((match = re.exec(String(html || ""))) !== null) {
    var block = match[0], opening = (block.match(/^<a\b[^>]*>/i) || [""])[0];
    var href = absoluteUrl(attr(opening, "href"));
    if (!isContentUrl(href) || seen[href]) continue;
    var imageTag = (block.match(/<img\b[^>]*>/i) || [""])[0];
    var title = cleanText(attr(opening, "title") || attr(imageTag, "alt") || attr(imageTag, "title"));
    if (!title) title = cleanText((block.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i) || [])[1] || "");
    if (!title) title = cleanText(block);
    if (!title || title.length < 2) continue;
    if (!/(?:فيلم|مسلسل|انمي|أنمي|movie|series|episode|الحلقة|الموسم|season|19\d{2}|20\d{2})/i.test(title)) continue;
    var image = attr(imageTag, "data-src") || attr(imageTag, "data-lazy-src") ||
      attr(imageTag, "data-original") || attr(imageTag, "src");
    var kind = classify(title, href);
    seen[href] = true;
    output.push({
      id: href, title: title, url: href,
      cover: image ? absoluteUrl(image, href) : null,
      type: kind, sourceId: SOURCE_ID
    });
    if (output.length >= 100) break;
  }
  return output;
}
function search(query, page) {
  if (!query) return Promise.resolve([]);
  var url = BASE_URL + "/?s=" + encodeURIComponent(query);
  if (page && page > 1) url += "&paged=" + page;
  return getPage(url).then(parseItems).catch(function() { return []; });
}
function parseCategoryLinks(html) {
  var rows = [], seen = {}, re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, match;
  while ((match = re.exec(String(html || ""))) !== null) {
    var href = absoluteUrl(match[1]), label = cleanText(match[2]);
    if (!href || !/\/category\//i.test(href) || !label || seen[href]) continue;
    if (!/(?:افلام|مسلسلات|انمي|أنمي|اسيوي|آسيوي|أجنبي|اجنبي)/i.test(label)) continue;
    seen[href] = true;
    rows.push({ id: href, title: label });
  }
  return rows;
}
function fetchRow(row) {
  return getPage(row.id).then(function(html) {
    return { id: row.id, title: row.title, items: parseItems(html) };
  }).catch(function() {
    return { id: row.id, title: row.title, items: [] };
  });
}
function getHome() {
  return getPage(BASE_URL + "/").then(function(html) {
    var rows = [
      { id: "latest-movies", title: "أحدث الأفلام", url: BASE_URL + "/movies/" },
      { id: "latest-series", title: "أحدث المسلسلات", url: BASE_URL + "/series/" }
    ];
    var cats = parseCategoryLinks(html);
    var tasks = [
      Promise.resolve({ id: "latest", title: "المضاف حديثاً", items: parseItems(html) }),
      fetchRow({ id: rows[0].url, title: rows[0].title }),
      fetchRow({ id: rows[1].url, title: rows[1].title })
    ];
    cats.forEach(function(row) { tasks.push(fetchRow(row)); });
    return Promise.all(tasks);
  }).catch(function() { return []; });
}
function getHomePage(rowId, page) {
  var target = String(rowId || "latest");
  var pageNo = page && page > 1 ? page : 1;
  if (target === "latest") target = BASE_URL + "/";
  else if (target === "latest-movies") target = BASE_URL + "/movies/";
  else if (target === "latest-series") target = BASE_URL + "/series/";
  else target = absoluteUrl(target);
  if (pageNo > 1) target += (target.indexOf("?") >= 0 ? "&" : "?") + "paged=" + pageNo;
  return getPage(target).then(parseItems).catch(function() { return []; });
}
function firstMatch(html, patterns) {
  for (var i = 0; i < patterns.length; i++) {
    var match = String(html || "").match(patterns[i]);
    if (match && match[1]) return decodeText(match[1]);
  }
  return "";
}
function parseDetailEpisodes(html, pageUrl) {
  var output = [], seen = {}, re = /<a\b[^>]*>[\s\S]*?<\/a>/gi, match;
  while ((match = re.exec(String(html || ""))) !== null) {
    var block = match[0], opening = (block.match(/^<a\b[^>]*>/i) || [""])[0];
    var href = absoluteUrl(attr(opening, "href"), pageUrl);
    var label = cleanText(attr(opening, "title") || block);
    if (!href || !/^https?:\/\/(?:www\.)?topcinemaa\.one\//i.test(href) ||
        seen[href] || !/(?:الحلقة|episode|ep\.?\s*\d+)/i.test(label + " " + href)) continue;
    var numberMatch = (label + " " + href).match(/(?:الحلقة|episode|ep\.?)\s*[-#:]?\s*(\d+(?:\.\d+)?)/i);
    seen[href] = true;
    output.push({
      id: href, number: numberMatch ? parseFloat(numberMatch[1]) : output.length + 1,
      title: label || ("الحلقة " + (output.length + 1)), url: href,
      type: classify(label, href), sourceId: SOURCE_ID
    });
  }
  return output;
}
function parseSeasons(html, pageUrl) {
  var output = [], seen = {}, re = /<a\b[^>]*>[\s\S]*?<\/a>/gi, match;
  while ((match = re.exec(String(html || ""))) !== null) {
    var block = match[0], opening = (block.match(/^<a\b[^>]*>/i) || [""])[0];
    var href = absoluteUrl(attr(opening, "href"), pageUrl);
    var label = cleanText(attr(opening, "title") || block);
    if (!href || !/(?:الموسم|season)\s*\d+/i.test(label) || seen[href]) continue;
    seen[href] = true;
    output.push({ id: href, title: label, url: href, sourceId: SOURCE_ID });
  }
  return output;
}
function getDetail(url) {
  return getPage(url).then(function(html) {
    var title = firstMatch(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i,
      /<h1\b[^>]*>([\s\S]*?)<\/h1>/i,
      /<title[^>]*>([\s\S]*?)<\/title>/i
    ]);
    var cover = firstMatch(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)/i
    ]);
    var description = firstMatch(html, [
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i,
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)/i
    ]);
    var rating = firstMatch(html, [
      /([0-9]+(?:\.[0-9]+)?)\s*\/\s*10\s*stars/i,
      /([0-9]+(?:\.[0-9]+)?)\s*IMDb/i,
      /"ratingValue"\s*:\s*"?( [0-9.]+ )"?/i
    ]);
    var watch = "", linkRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, link;
    while ((link = linkRe.exec(String(html || ""))) !== null) {
      var label = cleanText(link[2]), href = absoluteUrl(link[1], url);
      if (href && /(?:مشاهدة الان|الذهاب لصفحة المشاهدة|watch)/i.test(label + " " + href) &&
          !/(?:تحميل|download)/i.test(label + " " + href)) { watch = href; break; }
    }
    var kind = classify(title, url);
    var episodes = parseDetailEpisodes(html, url);
    var seasons = parseSeasons(html, url);
    var genres = [], genreRe = /<a\b[^>]*href=["'][^"']*(?:genre|category)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, gm;
    while ((gm = genreRe.exec(String(html || ""))) !== null) {
      var genre = cleanText(gm[1]);
      if (genre && genres.indexOf(genre) < 0) genres.push(genre);
    }
    var item = {
      id: url, title: cleanText(title), url: url,
      cover: cover ? absoluteUrl(cover, url) : null,
      description: cleanText(description), rating: rating ? parseFloat(rating) : null,
      genres: genres, type: kind, sourceId: SOURCE_ID,
      episodes: episodes, seasons: seasons
    };
    if (watch) {
      item.watchUrl = watch;
      if (kind === "movie") item.episodes = [{
        id: watch, number: 1, title: "مشاهدة الفيلم", url: watch,
        type: "movie", sourceId: SOURCE_ID
      }];
    }
    return item;
  });
}
function getEpisodes(url) {
  return getDetail(url).then(function(detail) {
    if (detail.episodes && detail.episodes.length) return detail.episodes;
    if (detail.watchUrl) return [{
      id: detail.watchUrl, number: 1, title: "مشاهدة", url: detail.watchUrl,
      type: detail.type, sourceId: SOURCE_ID
    }];
    return [];
  });
}
function getVideoSources(episodeUrl) {
  return getPage(episodeUrl).then(function(html) {
    var candidates = [], seen = {}, tagRe = /<(?:iframe|source|video|a|button|div|li)\b[^>]*>/gi, match;
    function add(raw) {
      if (!raw) return;
      var value = decodeText(String(raw)).replace(/\\\//g, "/").replace(/\\u0026/gi, "&").trim();
      value = value.replace(/^["']|["']$/g, "");
      var href = absoluteUrl(value, episodeUrl);
      if (!href || !/^https?:\/\//i.test(href) || seen[href]) return;
      var host = (href.match(/^https?:\/\/([^/:?#]+)/i) || [])[1] || "";
      if (!host || /(?:^|\.)topcinemaa\.one$/i.test(host)) return;
      if (!/(?:vidtube|okstream|updown|doodstream|dood|filelions|byse|firestream|streamtape|lulu|streamwish|mp4upload|streamlare)/i.test(host)) return;
      seen[href] = true;
      candidates.push(href);
    }
    while ((match = tagRe.exec(String(html || ""))) !== null) {
      var tag = match[0];
      ["src", "data-src", "href", "data-url", "data-embed", "data-link", "data-iframe", "data-player"].forEach(function(key) {
        add(attr(tag, key));
      });
    }
    var inlineUrls = String(html || "").match(/https?:\\?\/\\?\/[a-z0-9.-]+\.[a-z]{2,}(?:\\?\/[^"'\\s<>)]*)?/gi) || [];
    inlineUrls.forEach(add);
    if (!candidates.length) throw new Error("Top Cinema: لم يتم العثور على روابط خوادم مشاهدة صالحة.");
    if (typeof extractVideo !== "function")
      throw new Error("Top Cinema: بيئة Zangetsu لا توفر extractVideo لاستخراج مشغلات الخوادم الخارجية.");
    var jobs = candidates.slice(0, 20).map(function(embedUrl) {
      return Promise.resolve(extractVideo(embedUrl, {
        headers: { "User-Agent": UA, "Referer": episodeUrl }
      })).then(function(result) {
        if (!Array.isArray(result)) result = result ? [result] : [];
        return result.map(function(source) {
          if (!source || !source.url) return null;
          var media = String(source.url);
          var container = source.container || (/\.m3u8(?:[?#]|$)/i.test(media) ? "hls" :
            (/\.mpd(?:[?#]|$)/i.test(media) ? "dash" : (/\.mp4(?:[?#]|$)/i.test(media) ? "mp4" : "unknown")));
          return {
            url: media, quality: source.quality || source.label || "Auto",
            container: container,
            headers: source.headers || { "User-Agent": UA, "Referer": embedUrl },
            subtitles: source.subtitles || []
          };
        }).filter(function(source) { return !!source; });
      }).catch(function() { return []; });
    });
    return Promise.all(jobs).then(function(groups) {
      var output = [], used = {};
      groups.forEach(function(group) {
        group.forEach(function(source) {
          if (source && source.url && !used[source.url]) {
            used[source.url] = true;
            output.push(source);
          }
        });
      });
      if (!output.length)
        throw new Error("Top Cinema: لم يُرجع أي خادم رابط فيديو مباشر قابلاً للتشغيل. قد يتطلب الخادم حماية أو استخراجاً غير مدعوم.");
      return output;
    });
  });
}
