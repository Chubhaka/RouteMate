import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../RouteMap.css';

// ── Fix Leaflet's default icon paths broken by webpack ──────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Custom SVG icons ────────────────────────────────────────────────
function makeIcon(color, emoji, size = 36) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px; height:${size}px;
        background:${color};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:2px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.25);
        display:flex; align-items:center; justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:${size * 0.42}px;line-height:1">
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

// ── Fit map to markers helper ───────────────────────────────────────
function FitBounds({ spots }) {
  const map = useMap();
  useEffect(() => {
    if (!spots.length) return;
    const bounds = L.latLngBounds(spots.map(s => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, spots]);
  return null;
}

// ── Main component ──────────────────────────────────────────────────
export default function RouteMap({ spots, userLocation, routeLine, height = 220 }) {
  // Default centre: Midrand area
  const centre = userLocation || { lat: -25.9986, lng: 28.1436 };

  const visibleSpots = spots.filter(s => s.lat && s.lng);

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
        {/* OpenStreetMap tiles — free, no API key */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        {/* Attribution bottom-right */}
        <div className="rm-attribution">© OpenStreetMap</div>

        {/* Route polyline between stops */}
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

        {/* User location marker */}
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
        {visibleSpots.map(spot => (
          <Marker
            key={spot.id}
            position={[spot.lat, spot.lng]}
            icon={ICONS[spot.category] || ICONS.stop}
          >
            <Popup className="rm-popup">
              <div className="rm-popup__name">{spot.name}</div>
              <div className="rm-popup__sub">{spot.sub}</div>
              {spot.dist && (
                <div className="rm-popup__dist">📍 {spot.dist}</div>
              )}
            </Popup>
          </Marker>
        ))}

        {/* Auto-fit bounds to all markers */}
        {visibleSpots.length > 0 && (
          <FitBounds spots={[
            ...(userLocation ? [{ lat: userLocation.lat, lng: userLocation.lng }] : []),
            ...visibleSpots,
          ]} />
        )}
      </MapContainer>
    </div>
  );
}