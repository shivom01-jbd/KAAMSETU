# Map and location setup

## How location works

- Location permission is asked **only when the person presses "Use my current location"**.
- Anyone can instead choose a city from a built-in list (no external service).
- Coordinates are rounded to 0.01 degree (about 1 km) **in the browser and again on the server**.
  Professionals save only this coarse point. Exact home coordinates or addresses are never stored or shown.
- Search distance uses a haversine formula in SQL (`search_professionals`). A professional appears only if the
  customer is within the customer's chosen distance AND within the professional's own service radius (+1.5 km tolerance).

## Map provider (replaceable adapter)

The list view works with no map. For the map view:

1. Pick a vector tile provider that allows your usage and has a free tier (e.g. MapTiler, Stadia Maps, or self-hosted).
   Do not point production traffic at the public OpenStreetMap tile servers; their policy forbids heavy use.
2. Copy the provider's **style URL** (a `style.json` link; the key inside is public, so restrict it to your domain).
3. In `.env.local`:
   ```
   NEXT_PUBLIC_MAP_PROVIDER=maplibre
   NEXT_PUBLIC_MAP_STYLE_URL=https://.../style.json?key=YOUR_KEY
   ```
4. Restart `npm run dev`, open Search, switch to **Map**.

## Adding another provider (e.g. Google Maps)

Implement a client component that accepts `MapViewProps` (`src/lib/map/adapter.ts`), then register it in
`src/components/map/results-map.tsx`. Nothing else in the app depends on the provider.

## Not done

- No free-text address geocoding (city list only).
- The MapLibre view has not been visually tested in a browser here.
