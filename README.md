# Media Controller
This browser extension allows you to control all media on a site.
The following list is what you can change
- volume
- speed
- pan (left/right bias of sound)

On YouTube, a speed button is also added next to the like/share buttons.
- click: reset to 1x
- double click: toggle between 1x and 16x
- mouse wheel: change the speed in 0.1x steps

# Build
Requires Node.js 18.18 or later.

```bash
npm install
npm run build
```

Then open `chrome://extensions`, turn on Developer mode, and load the `dist/` folder with "Load unpacked".

- `npm run watch` rebuilds the scripts on change (re-run it after editing `src/manifest.json`, HTML or CSS)
- `npm test` runs the unit tests
- `npm run lint` runs ESLint

## Project structure
- `src/content/` content script: the media state store, the controller that applies it to media elements, the Web Audio graph, popup messaging, and site-specific UI (`sites/`)
- `src/popup/` the extension popup
- `src/shared/` code used by both (media state limits and the popup protocol)

# Caution
This may not work properly with other extensions providing similar features.
Media loaded from another origin without CORS cannot be routed through Web Audio, so its volume and pan are left unchanged.

# LICENSE
This project is licensed under the [MIT License](LICENSE).
