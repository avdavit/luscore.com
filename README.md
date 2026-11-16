# Luscore — Light at the Core

A single-screen, interactive software studio website. A procedural WebGL galaxy surrounds a luminous core, with seven selectable, orbiting services and responsive detail panels.

## Project direction

The original brief is an immersive, Dataland-inspired universe for Luscore. Keep the galaxy anchored in place while it rotates continuously; mouse movement must not pan or tilt the scene. Services orbit the core and reveal information in a side panel when selected. The desktop pointer is a small idea spark with a comet trail. Interactions should feel quick and responsive. Use the approved orbital-globe wordmark from the LUSCORE Brand Package, with the globe forming the O.

The project now lives in the `luscore.com` subfolder of `10_Luscore`. Its GitHub destination is https://github.com/avdavit/luscore.com.

## Run locally

Requires Node.js 20 or later. No dependency installation is needed.

```sh
npm run dev
```

Open http://127.0.0.1:5188 and keep the terminal running. Luscore uses its own port so it does not open another development project running on port 5173. `npm start` also starts the site.

## Validate and build

```sh
npm run check
npm run build
npm run preview
```

`npm run preview` rebuilds the latest files before starting the preview at http://127.0.0.1:5188. To open without a server, use `dist/index.html`; the root `index.html` is the development entry point and requires the server.

The build creates a portable `dist/index.html` with embedded CSS and JavaScript. Open it directly in a browser, or deploy `dist/` to any static web host. Set the host's build command to `npm run build` and output directory to `dist`. Domain configuration is separate; this source does not change DNS for luscore.com.

## Edit

- `src/services.js`: Service names, copy, capabilities, colors, and orbit settings.
- `src/style.css`: Responsive layouts, typography, interface, and static galaxy fallback.
- `src/galaxy.js`: Procedural shaders, particle renderer, and GPU lifecycle.
- `src/main.js`: Service selection, motion controls, keyboard access, and scene layout.
- `src/spark.js`: Comet cursor, fading particle trail, and service-to-core light paths.
- `index.html`: Brand, contact links, and SEO metadata.
- `public/luscore-logo.svg`: Approved white/gold horizontal wordmark without the tagline, adapted from the brand package with only its background removed.
- `public/favicon.svg`: Matching orbital globe app icon from the brand package.

The build embeds both SVG brand assets into the portable HTML, so the logo and favicon also work when the built file is opened directly.

Contact buttons open the visitor's email application with a service-specific subject. There is no backend or simulated form submission. Google Fonts enhances the typography; system fonts are used if unavailable.

Animation respects reduced-motion preferences and can be paused. Background rendering stops when the page is hidden. The artwork falls back to CSS when WebGL is unavailable. The stationary service selector supports keyboard navigation independently of the orbits.

The galaxy rotates continuously around its anchored core, including when service panels open. Mouse movement never shifts or tilts the scene. On desktop, the pointer becomes an idea spark with a speed-sensitive comet trail. Nearby services illuminate and pause for selection while the galaxy keeps rotating. Selecting one sends a brief light path to the core. Reading areas retain the normal cursor. Touchscreens, reduced motion, and pause mode use the normal cursor without trails.
