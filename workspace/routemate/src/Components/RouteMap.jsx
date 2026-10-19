import React, { useEffect, useRef } from 'react';
import {
  MapContainer, TileLayer, Marker,
  Popup, Polyline, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../RouteMap.css';

// ── Fix Leaflet's broken default icon paths in webpack/vite ───────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Custom category pins ───────────────────────────────────────────────────
function makeIcon(color, emoji, size = 36) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background:${color};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:2px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:${Math.round(size * 0.42)}px;line-height:1">
          ${emoji}
        </span>
      </div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor:[0, -size],
  });
}

const ICONS = {
  user:   makeIcon('#003310', '📍', 38),
  food:   makeIcon('#F59E0B', '☕', 32),
  safe:   makeIcon('#22C55E', '🛡️', 32),
  study:  makeIcon('#7C3AED', '📚', 32),
  stores: makeIcon('#3B8BD4', '🛒', 32),
  stop:   makeIcon('#085420', '🚉', 32),
};

// ── FitBounds helper — auto-zooms to show all markers on load ─────────────
function FitBounds({ spots }) {
  const map = useMap();
  useEffect(() => {
    if (!spots.length) return;
    const bounds = L.latLngBounds(spots.map(s => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, spots]);
  return null;
}

/**
 * MapRefBridge
 *
 * Bridges the Leaflet map instance to the parent via mapRef.
 * The parent (Discover.jsx) calls mapRef.current.setView() to
 * re-centre the map when the user taps "My location".
 *
 * This component must be rendered *inside* <MapContainer> so
 * useMap() can access the Leaflet context.
 */
function MapRefBridge({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    if (mapRef) mapRef.current = map;
    return () => { if (mapRef) mapRef.current = null; };
  }, [map, mapRef]);
  return null;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function RouteMap({
  spots       = [],
  userLocation,
  routeLine,
  height      = 220,
  mapRef,           // ← accepts mapRef from parent; was previously ignored
}) {
  const centre     = userLocation ?? { lat: -25.9986, lng: 28.1436 };
  const validSpots = spots.filter(s => s.lat && s.lng);

  const allPoints = [
    ...(userLocation ? [{ lat: userLocation.lat, lng: userLocation.lng }] : []),
    ...validSpots,
  ];

  return (
    <div className="route-map-wrap" style={{ height }}>
      <MapContainer
        center={[centre.lat, centre.lng]}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
      >
        {/* OpenStreetMap tiles — free, no API key needed */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        {/* Bridge the map instance to the parent's ref */}
        {mapRef && <MapRefBridge mapRef={mapRef} />}

        {/* Route polyline */}
        {routeLine && routeLine.length > 1 && (
          <Polyline
            positions={routeLine}
            pathOptions={{
              color:     '#003310',
              weight:    4,
              opacity:   0.7,
              dashArray: '8 4',
            }}
          />
        )}

        {/* User location */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={ICONS.user}
          >
            <Popup className="rm-popup">
              <strong>📍 You are here</strong>
            </Popup>
          </Marker>
        )}

        {/* Spot markers */}
        {validSpots.map(spot => (
          <Marker
            key={spot.id}
            position={[spot.lat, spot.lng]}
            icon={ICONS[spot.category] ?? ICONS.stop}
          >
            <Popup className="rm-popup">
              <div className="rm-popup__name">{spot.name}</div>
              <div className="rm-popup__sub">{spot.sub}</div>
              {spot.dist && <div className="rm-popup__dist">📍 {spot.dist}</div>}
            </Popup>
          </Marker>
        ))}

        {/* Auto-fit to markers on load */}
        {allPoints.length > 0 && <FitBounds spots={allPoints} />}
      </MapContainer>

      <div className="rm-attribution">© OpenStreetMap</div>
    </div>
  );
}