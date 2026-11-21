/* Top Cinema provider for Zangetsu.
 * Uses the site's public HTML pages; no undocumented site API is assumed.
 */
var BASE_URL = "https://topcinemaa.one";
var SOURCE_ID = "topcinemaa";
var VERSION = "1.4.1";
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
  var baseUrl = base || BASE_URL;
  if (s.charAt(0) === "/") {
    var origin = String(baseUrl).match(/^(https?:\/\/[^/]+)/i);
    return (origin ? origin[1] : BASE_URL) + s;
  }
  var root = String(baseUrl).replace(/\/+$/, "");
  return root + "/" + s;
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
function popular(opts) {
  opts = opts || {};
  var page = opts.page && opts.page > 1 ? opts.page : 1;
  var url = BASE_URL + "/movies/" + (page > 1 ? "page/" + page + "/" : "");
  return getPage(url).then(parseItems);
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
      /"ratingValue"\s*:\s*"?([0-9.]+)"?/i
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
    if (detail.seasons && detail.seasons.length) return detail.seasons;
    if (detail.watchUrl) return [{
      id: detail.watchUrl, number: 1, title: "مشاهدة", url: detail.watchUrl,
      type: detail.type, sourceId: SOURCE_ID
    }];
    return [];
  });
}
function hasBundledExtractor(host) {
  host = String(host || "").toLowerCase().replace(/^www\\./, "");
  var supported = [
    "dood.to", "dood.so", "dood.ws", "dood.la", "dood.li", "dood.cx",
    "dood.sh", "dood.wf", "dood.yt", "dood.pm", "dood.re", "dood.watch",
    "dood.work", "doodstream.com", "doods.pro", "dsvplay.com", "ds2play.com",
    "ds2video.com", "d000d.com", "d0000d.com", "dooood.com", "vide0.net",
    "ok.ru", "odnoklassniki.ru", "mp4upload.com", "streamlare.com",
    "slwatch.co", "slmaxed.com", "sltube.org", "streamlare.cc"
  ];
  for (var i = 0; i < supported.length; i++) {
    if (host === supported[i] || host.slice(-(supported[i].length + 1)) === "." + supported[i])
      return true;
  }
  return false;
}
function getVideoSources(episodeUrl) {
  return getPage(episodeUrl).then(function(html) {
    var candidates = [], seen = {}, failures = [];
    function add(raw, sourceTag) {
      if (!raw) return;
      var value = decodeText(String(raw)).replace(/\\\//g, "/").replace(/\\u0026/gi, "&").trim();
      value = value.replace(/^[\"']|[\"']$/g, "");
      var href = absoluteUrl(value, episodeUrl);
      if (!href || !/^https?:\/\//i.test(href) || seen[href]) return;
      var host = (href.match(/^https?:\/\/([^/:?#]+)/i) || [])[1] || "";
      if (!host || /(?:^|\.)topcinemaa\.one$/i.test(host)) return;
      seen[href] = true;
      candidates.push({ url: href, host: host, tag: sourceTag || "page",
        direct: /\.(?:m3u8|mp4|m4v|mpd)(?:[?#]|$)/i.test(href) });
    }
    var tagRe = /<(?:iframe|source|video|a|button|div|li)\b[^>]*>/gi, match;
    while ((match = tagRe.exec(String(html || ""))) !== null) {
      var tag = match[0];
      ["src", "data-src", "href", "data-url", "data-embed", "data-link",
       "data-iframe", "data-player", "data-server"].forEach(function(key) {
        add(attr(tag, key), key);
      });
    }
    var inlineUrls = String(html || "").match(/https?:\/?\/?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^"'\s<>)]*)?/gi) || [];
    inlineUrls.forEach(function(url) { add(url, "inline"); });
    if (!candidates.length) throw new Error("Top Cinema: no server URLs found on watch page");

    var jobs = candidates.slice(0, 30).map(function(candidate) {
      if (candidate.direct) {
        return Promise.resolve([{
          url: candidate.url,
          quality: "Auto",
          container: /\.m3u8(?:[?#]|$)/i.test(candidate.url) ? "hls" :
            (/\.mpd(?:[?#]|$)/i.test(candidate.url) ? "dash" : "mp4"),
          headers: { "User-Agent": UA, "Referer": episodeUrl },
          label: "Top Cinema direct"
        }]);
      }
      if (!hasBundledExtractor(candidate.host)) {
        failures.push(candidate.host + ": no bundled Zangetsu extractor for this server");
        return Promise.resolve([]);
      }
      if (typeof extractVideo !== "function") {
        failures.push(candidate.host + ": extractVideo helper unavailable");
        return Promise.resolve([]);
      }
      return Promise.resolve(extractVideo(candidate.url, {
        headers: { "User-Agent": UA, "Referer": episodeUrl }
      })).then(function(result) {
        if (!Array.isArray(result)) result = result ? [result] : [];
        var mapped = [];
        result.forEach(function(source) {
          if (!source || !source.url || !/^https?:\/\//i.test(String(source.url))) return;
          var mediaUrl = String(source.url);
          mapped.push({
            url: mediaUrl,
            quality: source.quality || source.label || "Auto",
            container: source.container || (/\.m3u8(?:[?#]|$)/i.test(mediaUrl) ? "hls" :
              (/\.mpd(?:[?#]|$)/i.test(mediaUrl) ? "dash" :
                (/\.mp4(?:[?#]|$)/i.test(mediaUrl) ? "mp4" : "unknown"))),
            headers: source.headers || { "User-Agent": UA, "Referer": candidate.url },
            subtitles: source.subtitles || [],
            kind: source.kind || "sub",
            audioLang: source.audioLang || "und",
            label: source.label || candidate.host
          });
        });
        if (!mapped.length) failures.push(candidate.host + ": extractor returned no playable URL");
        return mapped;
      }).catch(function(error) {
        failures.push(candidate.host + ": " + String(error && error.message || error));
        return [];
      });
    });
    return Promise.all(jobs).then(function(groups) {
      var output = [], used = {};
      groups.forEach(function(group) {
        (group || []).forEach(function(source) {
          if (source && source.url && !used[source.url]) {
            used[source.url] = true;
            output.push(source);
          }
        });
      });
      if (!output.length) {
        throw new Error("Top Cinema: no playable mirror. " +
          failures.join(" | ").slice(0, 900) +
          ". A host returning HTTP 403 is unavailable to this client; other mirrors were attempted.");
      }
      return output;
    });
  });
}
