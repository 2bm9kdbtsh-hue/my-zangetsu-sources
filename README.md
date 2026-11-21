# My Zangetsu Sources

Personal source index for Zangetsu. Top Cinema now parses the public movie, series, and anime catalogue pages and delegates supported external player extraction to the Zangetsu runtime.

## Included providers

- **Top Cinema** (topcinemaa) — Arabic movie, series, and anime catalogue with external-host extraction delegated to Zangetsu.
  - File: `providers/topcinemaa.js`
  - Version: 1.4.0
- **NXX Hentai (Catalog Only)** (nxxhentai) — Arabic +18 metadata catalog only.
  - File: `providers/nxxhentai.js`
  - Version: 1.0.0
  - Lists titles, episode labels, covers, and detail-page metadata only. It intentionally has no video-source extraction or playback implementation.

- **AnimeXin** (animexin) — donghua catalog, episodes, and server extraction.
  - File: `providers/animexin.js`
  - Version: 1.0.0
  - Adapted from the Yuzono AnimeXin source; runtime playback still needs confirmation in Zangetsu.

## Add to Zangetsu

Use this repository's raw index.json URL as the custom source index:

https://raw.githubusercontent.com/2bm9kdbtsh-hue/my-zangetsu-sources/main/index.json

## Validation and runtime notes

- Provider files use the same basic fetch and metadata interface as the existing source.
- The NXX Hentai provider has not been executed inside Zangetsu v2.3.6.
- Search, pagination, images, and detail parsing still require confirmation in the app.
- The NXX Hentai entry is marked NSFW (+18) in the source index.
- Catalog parsing does not guarantee that all site pages are available or that the site keeps the same markup.


## Top Cinema 1.4.0 notes

- Search no longer intentionally filters out series and anime titles.
- Home rows include the site's movie and series listing pages and detected content categories.
- Detail parsing reads descriptions, covers, IMDb-style ratings, genres, episode links, season links, and the watch-page URL where present.
- Playback extraction uses the provider runtime's `extractVideo` function for discovered external servers. It does not invent or call undocumented Top Cinema/VideoTube API endpoints.
- Direct playback still depends on the installed Zangetsu runtime supporting `extractVideo` and on the external host returning a playable media URL. Server-side embed restrictions (including HTTP 403) may prevent extraction.
- This repository is a provider/index repository, not the Zangetsu application source. An app build and in-player playback test cannot be run from this repository alone.
