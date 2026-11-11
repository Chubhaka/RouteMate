import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalisePlace, searchPlaces, reverseGeocode } from './Geocode';

// Shaped like real Photon GeoJSON features (sample data, not live output).
const feature = (props, coords = [28.1436, -25.9986]) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: coords },
  properties: { countrycode: 'ZA', osm_type: 'N', ...props },
});

const station = feature({
  osm_id: 1, osm_key: 'railway', osm_value: 'station',
  name: 'Midrand Gautrain Station', district: 'Midrand', city: 'Johannesburg', state: 'Gauteng',
});
const cafe = feature({
  osm_id: 2, osm_key: 'amenity', osm_value: 'cafe',
  name: 'Station Deli', city: 'Johannesburg', state: 'Gauteng',
});
const busStop = feature({
  osm_id: 3, osm_key: 'highway', osm_value: 'bus_stop',
  name: 'Noord Street', city: 'Johannesburg', state: 'Gauteng',
});
const foreign = feature({ osm_id: 4, osm_key: 'place', osm_value: 'city', name: 'Gaborone', countrycode: 'BW' });

function mockFetch(features, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({ ok, status, json: async () => ({ features }) });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('normalisePlace', () => {
  it('maps a station to name, detail, label, lat/lng and kind', () => {
    expect(normalisePlace(station)).toEqual({
      id: 'N1',
      name: 'Midrand Gautrain Station',
      detail: 'Midrand, Johannesburg, Gauteng',
      label: 'Midrand Gautrain Station, Midrand, Johannesburg, Gauteng',
      lat: -25.9986,
      lng: 28.1436,
      kind: 'rail',
    });
  });

  it('reads GeoJSON coordinates as [lng, lat]', () => {
    const p = normalisePlace(feature({ osm_id: 9, name: 'X' }, [28.0, -26.0]));
    expect(p.lat).toBe(-26.0);
    expect(p.lng).toBe(28.0);
  });

  it('classifies bus stops and falls back to "place"', () => {
    expect(normalisePlace(busStop).kind).toBe('bus');
    expect(normalisePlace(cafe).kind).toBe('place');
  });

  it('does not repeat a part already in the name', () => {
    const p = normalisePlace(feature({ osm_id: 5, name: 'Midrand', city: 'Midrand', state: 'Gauteng' }));
    expect(p.label).toBe('Midrand, Gauteng');
  });

  it('rejects features outside South Africa, without coordinates, or without a name', () => {
    expect(normalisePlace(foreign)).toBeNull();
    expect(normalisePlace({ properties: { name: 'X' }, geometry: {} })).toBeNull();
    expect(normalisePlace(feature({ osm_id: 6 }))).toBeNull();
    expect(normalisePlace(null)).toBeNull();
  });
});

describe('searchPlaces', () => {
  it('does not call the network for queries under 3 characters', async () => {
    const fetchMock = mockFetch([station]);
    expect(await searchPlaces('mi')).toEqual([]);
    expect(await searchPlaces('  ')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requests Photon with South Africa bbox, English and Gauteng bias', async () => {
    const fetchMock = mockFetch([station]);
    await searchPlaces('midrand gautrain');
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin).toBe('https://photon.komoot.io');
    expect(url.pathname).toBe('/api/');
    expect(url.searchParams.get('q')).toBe('midrand gautrain');
    expect(url.searchParams.get('bbox')).toBe('16.3,-34.9,32.9,-22.1');
    expect(url.searchParams.get('lang')).toBe('en');
    expect(url.searchParams.get('lat')).toBe('-26');
  });

  it('drops non-ZA results and duplicates, and lists transit before other places', async () => {
    mockFetch([cafe, foreign, busStop, station, station]);
    const results = await searchPlaces('station query');
    expect(results.map(r => r.name)).toEqual(['Noord Street', 'Midrand Gautrain Station', 'Station Deli']);
  });

  it('caps the number of results', async () => {
    const many = Array.from({ length: 12 }, (_, i) => feature({ osm_id: 100 + i, name: `Stop ${i}` }));
    mockFetch(many);
    expect(await searchPlaces('many stops', { limit: 5 })).toHaveLength(5);
  });

  it('serves repeat queries from cache (one request)', async () => {
    const fetchMock = mockFetch([station]);
    await searchPlaces('cache me');
    await searchPlaces('Cache Me');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects on an HTTP error so the UI can show its fallback', async () => {
    mockFetch([], false, 429);
    await expect(searchPlaces('rate limited')).rejects.toThrow('429');
  });

  it('forwards the abort signal to fetch', async () => {
    const fetchMock = mockFetch([station]);
    const controller = new AbortController();
    await searchPlaces('signal test', { signal: controller.signal });
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });
});

describe('reverseGeocode', () => {
  it('returns the matched place but keeps the exact GPS coordinates', async () => {
    mockFetch([station]);
    const p = await reverseGeocode(-25.99, 28.14);
    expect(p.name).toBe('Midrand Gautrain Station');
    expect(p.lat).toBe(-25.99);
    expect(p.lng).toBe(28.14);
  });

  it('falls back to "Current location" if the service fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const p = await reverseGeocode(-25.99, 28.14);
    expect(p).toMatchObject({ label: 'Current location', lat: -25.99, lng: 28.14 });
  });
});