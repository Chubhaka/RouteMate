import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin, Coffee, BookOpen, Shield, ShoppingCart,
  Laptop, Plus, Star, Navigation, Loader, AlertCircle, X,
} from 'lucide-react';
import PageHeader  from '../components/PageHeader';
import RouteMap    from '../components/RouteMap';
import { getSpots, toggleSaveSpot, addSpot } from '../services/api';
import '../Discover.css';
 
const CATEGORIES = [
  { id: 'all',    label: 'All nearby'    },
  { id: 'safe',   label: 'Safe zones'    },
  { id: 'food',   label: 'Food & coffee' },
  { id: 'stores', label: 'Stores'        },
  { id: 'study',  label: 'Study spots'   },
  { id: 'saved',  label: 'Saved'         },
];
 
const ICON_MAP = {
  food:   { icon: Coffee,       iconBg: '#FEF3C7', iconColor: '#B45309' },
  safe:   { icon: Shield,       iconBg: '#DCFCE7', iconColor: '#065F46' },
  stores: { icon: ShoppingCart, iconBg: '#E6F1FB', iconColor: '#185FA5' },
  study:  { icon: BookOpen,     iconBg: '#EDE8D8', iconColor: '#085420' },
};
 
const ROUTE_LINE = [
  [-25.9986, 28.1436],
  [-26.1075, 28.0566],
  [-26.1321, 28.0570],
  [-26.1466, 28.0412],
  [-26.1566, 28.0346],
  [-26.1929, 28.0305],
];
 
// ── Add Spot Modal ────────────────────────────────────────────────────────────
function AddSpotModal({ onClose, onAdd }) {
  const [name,     setName]     = useState('');
  const [category, setCategory] = useState('food');
  const [dist,     setDist]     = useState('');
  const [sub,      setSub]      = useState('');
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');
 
  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) { setErr('Please enter a spot name.'); return; }
    if (!dist.trim()) { setErr('Please enter an approximate distance.'); return; }
    setSaving(true);
    const meta = ICON_MAP[category] ?? ICON_MAP.food;
    const spot = await addSpot({
      name: name.trim(),
      category,
      dist: dist.trim(),
      sub: sub.trim() || name.trim(),
      iconBg:    meta.iconBg,
      iconColor: meta.iconColor,
      lat: -25.9986, lng: 28.1436,   // default to Midrand — GPS lookup in v2
    });
    onAdd(spot);
    onClose();
  }
 
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Add a spot">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Add a spot</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          {err && <div className="modal-error" role="alert"><AlertCircle size={13} aria-hidden="true" /> {err}</div>}
 
          <p className="modal-label">Spot name</p>
          <input className="modal-input-field" type="text" placeholder="e.g. Vida e Caffè Midrand" value={name} onChange={e => setName(e.target.value)} />
 
          <p className="modal-label" style={{ marginTop: 12 }}>Category</p>
          <div className="modal-cat-row">
            {Object.keys(ICON_MAP).map(c => (
              <button
                key={c}
                type="button"
                className={`modal-cat-btn ${category === c ? 'modal-cat-btn--sel' : ''}`}
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
 
          <p className="modal-label" style={{ marginTop: 12 }}>Distance from stop</p>
          <input className="modal-input-field" type="text" placeholder="e.g. 150m" value={dist} onChange={e => setDist(e.target.value)} />
 
          <p className="modal-label" style={{ marginTop: 12 }}>Short description</p>
          <input className="modal-input-field" type="text" placeholder="e.g. Opens 7am · Good WiFi" value={sub} onChange={e => setSub(e.target.value)} />
 
          <button type="submit" className="modal-submit" disabled={saving}>
            {saving ? 'Saving…' : 'Add spot'}
          </button>
        </form>
      </div>
    </div>
  );
}
 
// ── Spot card ────────────────────────────────────────────────────────────────
function SpotCard({ spot, isSaved, onToggleSave }) {
  const meta = ICON_MAP[spot.category] ?? ICON_MAP.food;
  const Icon = meta.icon;
  return (
    <div className="spot-card">
      <div className="spot-card__icon" style={{ background: spot.iconBg || meta.iconBg }}>
        <Icon size={20} color={spot.iconColor || meta.iconColor} aria-hidden="true" />
      </div>
      <div className="spot-card__body">
        <div className="spot-card__top">
          <span className="spot-card__name">{spot.name}</span>
          {spot.verified && (
            <span className="spot-verified" aria-label="Community verified">
              <Shield size={10} aria-hidden="true" /> Verified
            </span>
          )}
        </div>
        <p className="spot-card__sub">{spot.sub}</p>
        <div className="spot-card__bottom">
          <span className="spot-card__dist"><MapPin size={11} aria-hidden="true" /> {spot.dist}</span>
          {spot.rating && <span className="spot-card__rating"><Star size={11} aria-hidden="true" /> {spot.rating}</span>}
        </div>
      </div>
      <button
        className={`spot-save-btn ${isSaved ? 'spot-save-btn--saved' : ''}`}
        onClick={() => onToggleSave(spot.id)}
        aria-label={isSaved ? 'Remove from saved' : 'Save spot'}
        aria-pressed={isSaved}
      >
        <Star size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
 
// ── Main page ────────────────────────────────────────────────────────────────
export default function Discover() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [spots,          setSpots]          = useState([]);
  const [saved,          setSaved]          = useState({});
  const [loading,        setLoading]        = useState(true);
  const [geoLoading,     setGeoLoading]     = useState(true);
  const [geoError,       setGeoError]       = useState('');
  const [userLocation,   setUserLocation]   = useState(null);
  const [showAddSpot,    setShowAddSpot]    = useState(false);
  const [toast,          setToast]          = useState('');
  const mapRef = useRef(null);
 
  useEffect(() => {
    getSpots().then(data => {
      setSpots(data);
      setSaved(data.reduce((acc, s) => ({ ...acc, [s.id]: s.saved }), {}));
      setLoading(false);
    });
  }, []);
 
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported — showing route default');
      setUserLocation({ lat: -25.9986, lng: 28.1436 });
      setGeoLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoError('Location access denied — showing route default');
        setUserLocation({ lat: -25.9986, lng: 28.1436 });
        setGeoLoading(false);
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, []);
 
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500); }
 
  const toggleSave = useCallback(async (id) => {
    const { saved: nowSaved } = await toggleSaveSpot(id);
    setSaved(prev => ({ ...prev, [id]: nowSaved }));
    showToast(nowSaved ? 'Spot saved!' : 'Removed from saved.');
  }, []);
 
  function handleAddSpot(spot) {
    setSpots(prev => [...prev, spot]);
    setSaved(prev => ({ ...prev, [spot.id]: true }));
    showToast('Spot added and saved!');
  }
 
  // ── My location button — re-centres the Leaflet map ──────────────
  function handleLocate() {
    if (!userLocation) { showToast('Location not available.'); return; }
    // Access the underlying Leaflet map instance via the ref passed to RouteMap
    if (mapRef.current) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 15);
    }
    showToast('Centred on your location.');
  }
 
  const savedCount = Object.values(saved).filter(Boolean).length;
 
  const filtered = activeCategory === 'all'    ? spots
    : activeCategory === 'saved'               ? spots.filter(s => saved[s.id])
    : spots.filter(s => s.category === activeCategory);
 
  const mapSpots = activeCategory === 'all' ? spots : filtered;
 
  return (
    <div className="discover-page">
      <PageHeader
        title="Discover"
        subtitle="Near your route · Midrand → Wits"
        action={
          <button
            className="discover-add-btn"
            onClick={() => setShowAddSpot(true)}
            aria-label="Add a spot"
          >
            <Plus size={18} aria-hidden="true" />
          </button>
        }
      />
 
      {toast && <div className="discover-toast" role="status" aria-live="polite">{toast}</div>}
 
      {/* Map */}
      <div className="map-section">
        {geoLoading ? (
          <div className="map-loading" style={{ height: 240 }}>
            <Loader size={22} className="spin" aria-hidden="true" />
            <span>Loading map…</span>
          </div>
        ) : (
          <RouteMap
            spots={mapSpots}
            userLocation={userLocation}
            routeLine={ROUTE_LINE}
            height={240}
            mapRef={mapRef}
          />
        )}
        {geoError && !geoLoading && (
          <div className="map-geo-notice">
            <AlertCircle size={13} aria-hidden="true" /> {geoError}
          </div>
        )}
        <button
          className="map-locate-btn"
          onClick={handleLocate}
          aria-label="Centre map on my location"
          title="My location"
        >
          <Navigation size={16} aria-hidden="true" />
        </button>
      </div>
 
      {/* Category chips */}
      <div className="category-scroll" role="tablist" aria-label="Filter spots">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            role="tab"
            aria-selected={activeCategory === cat.id}
            className={`cat-chip ${activeCategory === cat.id ? 'cat-chip--active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
            {cat.id === 'saved' && <span className="cat-count">{savedCount}</span>}
          </button>
        ))}
      </div>
 
      {/* Spot list */}
      <div className="spots-list">
        {loading ? (
          <div className="spots-loading">
            <Loader size={20} className="spin" aria-hidden="true" /> Loading spots…
          </div>
        ) : filtered.length === 0 ? (
          <div className="spots-empty">
            <MapPin size={28} color="var(--rm-muted)" aria-hidden="true" />
            <p>{activeCategory === 'saved' ? 'No spots saved yet.' : 'No spots in this category.'}</p>
            <button className="spots-empty-btn" onClick={() => setActiveCategory('all')}>
              Browse all nearby
            </button>
          </div>
        ) : filtered.map(spot => (
          <SpotCard
            key={spot.id}
            spot={spot}
            isSaved={!!saved[spot.id]}
            onToggleSave={toggleSave}
          />
        ))}
      </div>
 
      <div className="discover-cta">
        <button className="discover-cta-btn" onClick={() => setShowAddSpot(true)}>
          <Plus size={16} aria-hidden="true" />
          Add a spot to your route
        </button>
      </div>
 
      {showAddSpot && (
        <AddSpotModal
          onClose={() => setShowAddSpot(false)}
          onAdd={handleAddSpot}
        />
      )}
    </div>
  );
}