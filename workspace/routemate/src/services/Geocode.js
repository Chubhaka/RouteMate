/**
 * services/geocode.js
 *
 * Place search for boarding / destination stops.
 *
 * Uses Photon (https://photon.komoot.io) — a free, key-less geocoder built on
 * OpenStreetMap data, the same data the Discover map already renders. Photon is
 * designed for search-as-you-type. (Nominatim is NOT used: its usage policy
 * forbids autocomplete-style traffic.)
 *
 * Fair use: the public Photon server is shared infrastructure, so callers must
 * debounce (LocationInput waits 300 ms), abort stale requests, and this module
 * caches results. For production, self-host Photon or use a paid provider and
 * point VITE_PHOTON_URL at it — nothing else changes.
 *
 * Every function here is the only place that knows the provider's response
 * shape, so swapping providers means editing normalisePlace() and the URL.
 */

const BASE = import.meta.env?.VITE_PHOTON_URL ?? 'https://photon.komoot.io';

// South Africa bounding box: minLon,minLat,maxLon,maxLat
const SA_BBOX = '16.3,-34.9,32.9,-22.1';

// Bias results toward Gauteng so "Midrand" finds the Gautrain station first.
const GAUTENG_BIAS = { lat: -26.0, lon: 28.1 };

export const MIN_QUERY_LENGTH = 3;
const CACHE_LIMIT = 50;
const cache = new Map();

const RAIL_VALUES = new Set(['station', 'halt', 'tram_stop', 'subway_entrance']);

/** Classify an OSM feature so the UI can show a transit icon. */
function classify(p) {
  if (p.osm_key === 'railway') return 'rail';
  if (p.osm_value === 'bus_stop' || p.osm_value === 'bus_station') return 'bus';
  if (p.osm_value === 'taxi') return 'taxi';
  if (RAIL_VALUES.has(p.osm_value)) return 'rail';
  if (p.osm_key === 'public_transport') return 'bus';
  return 'place';
}

/**
 * Convert one Photon GeoJSON feature into the shape the app uses:
 *   { id, name, detail, label, lat, lng, kind }
 * Returns null for features we can't use (no coordinates, no name, not in ZA).
 */
export function normalisePlace(feature) {
  const p = feature?.properties;
  const coords = feature?.geometry?.coordinates;
  if (!p || !Array.isArray(coords) || coords.length < 2) return null;
  if (p.countrycode && p.countrycode !== 'ZA') return null;

  const [lng, lat] = coords; // GeoJSON order is [lon, lat]
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const name = p.name || street;
  if (!name) return null;

  const seen = new Set([name.toLowerCase()]);
  const detail = [p.name ? street : '', p.district || p.locality, p.city, p.state]
    .filter(Boolean)
    .filter(part => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(', ');

  return {
    id: `${p.osm_type ?? 'x'}${p.osm_id ?? `${lat},${lng}`}`,
    name,
    detail,
    label: detail ? `${name}, ${detail}` : name,
    lat,
    lng,
    kind: classify(p),
  };
}

/**
 * Search for places matching `query`.
 * Resolves to an array of places (possibly empty). Rejects on network/HTTP
 * failure — including AbortError, which callers should ignore.
 */
export async function searchPlaces(query, { signal, limit = 5 } = {}) {
  const q = (query ?? '').trim();
  if (q.length < MIN_QUERY_LENGTH) return [];

  const key = q.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  const url = new URL('/api/', BASE);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(limit * 2)); // over-fetch: we drop non-ZA and duplicates
  url.searchParams.set('lang', 'en');
  url.searchParams.set('lat', String(GAUTENG_BIAS.lat));
  url.searchParams.set('lon', String(GAUTENG_BIAS.lon));
  url.searchParams.set('bbox', SA_BBOX);

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const data = await res.json();

  const seen = new Set();
  const places = (data.features ?? [])
    .map(normalisePlace)
    .filter(Boolean)
    .filter(place => {
      if (seen.has(place.label)) return false;
      seen.add(place.label);
      return true;
    });

  // Commuters want stops and stations first, other places after.
  const transit = places.filter(pl => pl.kind !== 'place');
  const other   = places.filter(pl => pl.kind === 'place');
  const result  = [...transit, ...other].slice(0, limit);

  cache.set(key, result);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  return result;
}

/**
 * Turn coordinates into a place (used by "Use my current location").
 * Never rejects for network problems — falls back to a generic "Current
 * location" with the exact coordinates so the user is never blocked.
 */
export async function reverseGeocode(lat, lng, { signal } = {}) {
  const fallback = {
    id: `here${lat},${lng}`,
    name: 'Current location',
    detail: '',
    label: 'Current location',
    lat,
    lng,
    kind: 'place',
  };
  try {
    const url = new URL('/reverse', BASE);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('lang', 'en');
    const res = await fetch(url, { signal });
    if (!res.ok) return fallback;
    const data = await res.json();
    const place = normalisePlace(data.features?.[0]);
    return place ? { ...place, lat, lng } : fallback; // keep the exact GPS fix
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    return fallback;
  }
}