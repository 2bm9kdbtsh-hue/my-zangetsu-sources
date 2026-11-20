var BASE_URL = "https://topcinemaa.one";

function getInfo() {
  return {
    name: "Top Cinema",
    lang: "ar",
    baseUrl: BASE_URL,
    type: "movie",
    version: "1.0.1"
  };
}

function search(query, page) {
  if (!query) return Promise.resolve([]);

  return fetch(
    BASE_URL + "/?s=" + encodeURIComponent(query)
  ).then(function (r) {
    return r.body || "";
  }).then(function (html) {
    return [];
  });
}
