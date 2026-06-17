# Map View — Design Spec

**Date:** 2026-06-17
**Status:** Approved for planning

## Goal

Add a map view to the POA Em Dobro++ coupon app. Users toggle between the
existing card grid and a map that plots the same filtered results as logo pins
on a map of Porto Alegre. The same sidebar filters drive both views. The map
matches the existing warm cream / red / Playfair visual identity.

## Context

- React 19.2, Tailwind v4, Vite 8, Motion. No backend; data is static JSON.
- Each coupon (`cupom`) has top-level `lat`/`lng`, a `logo` URL, and an
  `endereco` array where each entry has its own `latitude`/`longitude`,
  `bairro`, and address. A place can have multiple branches.
- Filters live in `useFilters` + `Sidebar`; `applyFilters` produces the
  `filtered` array in `App.jsx`. The grid renders `filtered`; the map will too.

## Decisions

| Question | Decision |
|---|---|
| View switching | Segmented "Lista / Mapa" toggle in the Topbar; swaps the main area, one view at a time. |
| Map engine | `react-leaflet` + `leaflet`, CARTO Voyager raster tiles (no API key, no cost). |
| Pins | One pin per `endereco` location, with clustering when zoomed out. |
| Pin tap | Mini on-map preview popup with a "Ver cupom" button → opens the existing `CupomModal`. |

## Architecture

### View state & toggle
- Add `view` state (`'list' | 'map'`) in `App.jsx` via `useState('list')`.
  This is a view mode, not a filter — `useFilters` is untouched.
- `Topbar` gains a segmented "Lista / Mapa" control styled with existing tokens
  (`border-brd-strong`, active = `bg-primary text-white`). Props: `view`,
  `onViewChange`.
- Sort dropdown: keep it in list mode; hide in map mode (ordering is irrelevant
  on a map).
- `App` renders `<CardGrid …>` when `view === 'list'`, else `<MapView …>`.
  Both consume the same `filtered` array — no filter logic is duplicated.

### MapView component — `src/components/MapView.jsx`
- Renders `MapContainer` (react-leaflet) with CARTO Voyager tiles and required
  attribution. Imports `leaflet/dist/leaflet.css` once.
- Default center: Porto Alegre (~`-30.0346, -51.2177`), city-level zoom.
- On change of the filtered set, `fitBounds` to the current markers (no-op when
  empty). Implemented via a small child component using the `useMap` hook.
- Builds the marker list:
  ```
  filtered.flatMap(c =>
    (c.endereco || [])
      .map(e => ({ c, lat: e.latitude, lng: e.longitude }))
      .filter(m => m.lat != null && m.lng != null)
  )
  ```
  Fallback: if a coupon has no usable endereco coords, use top-level
  `c.lat`/`c.lng`.
- Clustering via `react-leaflet-cluster` (wraps leaflet.markercluster). Cluster
  bubble styled in primary red.

### Logo pins
- Custom Leaflet `divIcon`: circular logo image inside a white frame with a
  primary-red ring and a small CSS pointer tail. On-brand.
- Image fallback: on load error, show a colored circle with the first letter of
  `c.nome` (no broken-image icon).
- Markers carry the `cupom` so tapping opens the popup.

### Pin tap → preview → modal
- Leaflet `Popup` styled to match the card aesthetic: logo, `nome`, `beneficio`,
  `bairro`, and a "Ver cupom" button.
- "Ver cupom" calls a `onOpen(cupom)` prop → `App` sets `selected` → the
  existing `CupomModal` opens unchanged.

## Dependencies added
- `leaflet`
- `react-leaflet`
- `react-leaflet-cluster`

(Plus `import 'leaflet/dist/leaflet.css'` and the markercluster CSS.)

## Components touched
- `src/App.jsx` — `view` state, conditional render, pass `onOpen`/filtered to MapView.
- `src/components/Topbar.jsx` — segmented Lista/Mapa toggle; conditional sort.
- `src/components/MapView.jsx` — **new**.

## Out of scope (YAGNI)
- Persisting the view choice across reloads.
- A user-location dot on the map (geolocation already exists for "distância";
  easy to add later).
- A custom mobile bottom sheet (the styled popup works on mobile and desktop).
- Vector tiles / fully custom map styling.

## Success criteria
- Toggling to "Mapa" shows the same filtered coupons as pins; changing any
  filter updates the pins live.
- Multi-branch places show a pin per branch; pins cluster when zoomed out.
- Tapping a pin shows the preview; "Ver cupom" opens the existing modal.
- No API key or paid service required; build stays static.
- Map visuals read as part of the existing warm/red identity.
