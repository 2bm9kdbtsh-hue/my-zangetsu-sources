# My Zangetsu Sources

Personal source index for Zangetsu.

## Included providers

- **Top Cinema** (topcinemaa) — Arabic movie source.
  - File: `providers/topcinemaa.js`
  - Version: 1.3.4
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
