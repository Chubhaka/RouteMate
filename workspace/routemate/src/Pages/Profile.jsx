import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, MapPin, Clock, Star, Lock,
  Globe, ChevronRight, LogOut, Train, Bus,
  Car, Check, Edit2, Save, X, Shield,
  Bell, Eye, EyeOff, Trash2,
} from 'lucide-react';
import { getProfileAsync, saveProfile, getMyPods, signOut } from '../services/api';
import LocationInput from '../Components/Locationinput';
import '../Profile.css';

const TRANSPORT_OPTIONS = [
  { id: 'gautrain', icon: Train, label: 'Gautrain'    },
  { id: 'bus',      icon: Bus,   label: 'Bus'         },
  { id: 'taxi',     icon: Car,   label: 'Taxi'        },
  { id: 'train',    icon: Train, label: 'Metrorail'   },
];

const INTEREST_OPTIONS = [
  '☕ Coffee', '🎵 Music',   '📚 Study',  '💼 Business',
  '🎙️ Podcasts','💻 Tech',   '🏃 Fitness','📰 News',
  '🎨 Design', '🍕 Food',    '🌿 Nature', '📷 Photography',
];

const PRIVACY_OPTIONS = [
  { id: 'public',  icon: Globe,  label: 'Public',      desc: 'Anyone can find and join your pods'  },
  { id: 'friends', icon: Star,   label: 'Friends only', desc: 'Visible to connected commuters'      },
  { id: 'private', icon: Lock,   label: 'Private',      desc: 'Hidden from search'                  },
];

// ── Initials avatar ────────────────────────────────────────────────
function Avatar({ name, size = 60 }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  return (
    <div
      className="profile-avatar"
      style={{ width: size, height: size, fontSize: size * 0.33 }}
      aria-label={`Avatar for ${name}`}
    >
      {initials}
    </div>
  );
}

// ── Editable field ─────────────────────────────────────────────────
function EditField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="pf-edit-field">
      <label className="pf-edit-label">{label}</label>
      <input
        className="pf-edit-input"
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────
function Section({ title, children, allowOverflow = false }) {
  return (
    <div className="pf-section">
      <p className="pf-section__title">{title}</p>
      <div className={`pf-section__body ${allowOverflow ? 'pf-section__body--visible' : ''}`}>
        {children}
      </div>
    </div>
  );
}

// ── Row link ───────────────────────────────────────────────────────
function Row({ icon: Icon, label, value, onClick, danger = false, toggle, checked, onToggle }) {
  return (
    <button
      className={`pf-row ${danger ? 'pf-row--danger' : ''}`}
      onClick={onClick ?? onToggle}
      aria-label={label}
      type="button"
    >
      <div className="pf-row__icon">
        <Icon size={16} aria-hidden="true" />
      </div>
      <div className="pf-row__body">
        <span className="pf-row__label">{label}</span>
        {value && <span className="pf-row__value">{value}</span>}
      </div>
      {toggle ? (
        <div
          className={`pf-toggle ${checked ? 'pf-toggle--on' : ''}`}
          aria-checked={checked}
          role="switch"
          aria-hidden="true"
        />
      ) : (
        !danger && <ChevronRight size={15} className="pf-row__chevron" aria-hidden="true" />
      )}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();

  const [profile,   setProfile]   = useState(null);
  const [myPods,    setMyPods]    = useState([]);
  const [editing,   setEditing]   = useState(false);
  const [toast,     setToast]     = useState('');
  const [showSignOut, setShowSignOut] = useState(false);

  // Editable fields
  const [editName,      setEditName]      = useState('');
  const [editEmail,     setEditEmail]     = useState('');
  const [editFrom,      setEditFrom]      = useState('');
  const [editTo,        setEditTo]        = useState('');
  const [editFromPlace, setEditFromPlace] = useState(null);
  const [editToPlace,   setEditToPlace]   = useState(null);
  const [editTransport, setEditTransport] = useState([]);
  const [editInterests, setEditInterests] = useState([]);
  const [editPrivacy,   setEditPrivacy]   = useState('public');

  // Notification prefs
  const [notifSafety,  setNotifSafety]  = useState(true);
  const [notifPod,     setNotifPod]     = useState(true);
  const [notifDelays,  setNotifDelays]  = useState(false);

  useEffect(() => {
    async function load() {
      const p = await getProfileAsync();
      const auth = JSON.parse(localStorage.getItem('rm_auth') || '{}');
      const pods = await getMyPods();

      const merged = {
        name:      p?.name      ?? auth.name ?? '',
        email:     p?.email     ?? auth.email ?? '',
        route:     p?.route     ?? { from: '', to: '' },
        transport: p?.transport ?? [],
        interests: p?.interests ?? [],
        privacy:   p?.privacy   ?? 'public',
        ...p,
      };

      setProfile(merged);
      setMyPods(pods);
      populateEditFields(merged);
    }
    load();
  }, []);

  function populateEditFields(p) {
    setEditName(p.name ?? '');
    setEditEmail(p.email ?? '');
    setEditFrom(p.route?.from ?? '');
    setEditTo(p.route?.to ?? '');
    setEditFromPlace(p.route?.fromPlace ?? null);
    setEditToPlace(p.route?.toPlace ?? null);
    setEditTransport(p.transport ?? []);
    setEditInterests(p.interests ?? []);
    setEditPrivacy(p.privacy ?? 'public');
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  function handleEdit() {
    populateEditFields(profile);
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
  }

  async function handleSave() {
    const auth = JSON.parse(localStorage.getItem('rm_auth') || '{}');
    const updated = {
      ...profile,
      name:      editName,
      email:     editEmail,
      route:     { from: editFrom, to: editTo, fromPlace: editFromPlace, toPlace: editToPlace },
      transport: editTransport,
      interests: editInterests,
      privacy:   editPrivacy,
    };
    // Update auth name too
    localStorage.setItem('rm_auth', JSON.stringify({ ...auth, name: editName, email: editEmail }));
    await saveProfile(updated);
    setProfile(updated);
    setEditing(false);
    showToast('Profile saved!');
  }

  async function handleSignOut() {
    await signOut(); // ends the Supabase session too — clearing localStorage alone would not
    navigate('/login', { replace: true });
  }

  function toggleTransport(id) {
    setEditTransport(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function toggleInterest(item) {
    setEditInterests(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  }

  if (!profile) {
    return (
      <div className="pf-loading">
        <div className="spin" aria-label="Loading" style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--rm-lime)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const displayName  = profile.name  || 'Your name';
  const displayEmail = profile.email || 'your@email.com';

  return (
    <div className="pf-page">

      {/* Header */}
      <div className="pf-header">
        <Avatar name={displayName} size={64} />
        <div className="pf-header__info">
          <h1 className="pf-header__name">{displayName}</h1>
          <p className="pf-header__email">{displayEmail}</p>
          {profile.route?.from && (
            <p className="pf-header__route">
              <MapPin size={11} aria-hidden="true" />
              {profile.route.from} → {profile.route.to}
            </p>
          )}
        </div>
        <button
          className="pf-edit-btn"
          onClick={editing ? handleCancel : handleEdit}
          aria-label={editing ? 'Cancel editing' : 'Edit profile'}
        >
          {editing
            ? <X size={17} aria-hidden="true" />
            : <Edit2 size={17} aria-hidden="true" />}
        </button>
      </div>

      <div className="pf-body">

        {/* ── Edit mode ── */}
        {editing ? (
          <div className="fade-in">
            <Section title="Personal details">
              <EditField label="Full name"  value={editName}  onChange={setEditName}  placeholder="Your name"  />
              <EditField label="Email"      value={editEmail} onChange={setEditEmail} type="email" placeholder="your@email.com" />
            </Section>

            <Section title="Your route" allowOverflow>
              <div className="pf-edit-field">
                <label className="pf-edit-label">From (boarding stop)</label>
                <LocationInput
                  inputClassName="pf-edit-input"
                  ariaLabel="From (boarding stop)"
                  placeholder="e.g. Midrand Station"
                  value={editFrom}
                  onChange={(text, place) => { setEditFrom(text); setEditFromPlace(place); }}
                  allowCurrentLocation
                />
              </div>
              <div className="pf-edit-field">
                <label className="pf-edit-label">To (destination)</label>
                <LocationInput
                  inputClassName="pf-edit-input"
                  ariaLabel="To (destination)"
                  placeholder="e.g. Wits University"
                  value={editTo}
                  onChange={(text, place) => { setEditTo(text); setEditToPlace(place); }}
                />
              </div>
            </Section>

            <Section title="Transport type">
              <div className="pf-transport-grid">
                {TRANSPORT_OPTIONS.map(t => {
                  const Icon = t.icon;
                  const sel  = editTransport.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`pf-transport-btn ${sel ? 'pf-transport-btn--sel' : ''}`}
                      onClick={() => toggleTransport(t.id)}
                      aria-pressed={sel}
                    >
                      <Icon size={18} aria-hidden="true" />
                      {t.label}
                      {sel && <Check size={12} className="pf-transport-check" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Interests">
              <div className="pf-interests-grid">
                {INTEREST_OPTIONS.map(item => {
                  const sel = editInterests.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      className={`pf-interest-chip ${sel ? 'pf-interest-chip--sel' : ''}`}
                      onClick={() => toggleInterest(item)}
                      aria-pressed={sel}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Privacy">
              {PRIVACY_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`pf-privacy-opt ${editPrivacy === opt.id ? 'pf-privacy-opt--sel' : ''}`}
                    onClick={() => setEditPrivacy(opt.id)}
                    aria-pressed={editPrivacy === opt.id}
                  >
                    <div className="pf-privacy-icon"><Icon size={15} aria-hidden="true" /></div>
                    <div>
                      <p className="pf-privacy-label">{opt.label}</p>
                      <p className="pf-privacy-desc">{opt.desc}</p>
                    </div>
                    {editPrivacy === opt.id && (
                      <Check size={14} className="pf-privacy-check" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </Section>

            <button className="pf-save-btn" onClick={handleSave}>
              <Save size={16} aria-hidden="true" /> Save changes
            </button>
          </div>

        ) : (
          /* ── View mode ── */
          <div className="fade-in">

            <Section title="My pods">
              {myPods.length === 0 ? (
                <div className="pf-empty">
                  <p>No pods joined yet.</p>
                  <button className="pf-empty-link" onClick={() => navigate('/pods')}>
                    Find a pod →
                  </button>
                </div>
              ) : myPods.map(pod => (
                <div key={pod.id} className="pf-pod-row">
                  <div className="pf-pod-info">
                    <p className="pf-pod-name">{pod.name}</p>
                    <p className="pf-pod-meta">{pod.type} · {pod.members} members</p>
                  </div>
                  <button
                    className="pf-pod-open"
                    onClick={() => navigate('/pods')}
                    aria-label={`Open ${pod.name}`}
                  >
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </Section>

            <Section title="Transport &amp; route">
              {profile.transport?.length > 0 ? (
                <div className="pf-chips">
                  {profile.transport.map(t => {
                    const opt = TRANSPORT_OPTIONS.find(o => o.id === t);
                    const Icon = opt?.icon ?? Train;
                    return (
                      <span key={t} className="pf-chip">
                        <Icon size={13} aria-hidden="true" /> {opt?.label ?? t}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="pf-empty-text">No transport type set.</p>
              )}
              {profile.route?.from && (
                <div className="pf-route-display">
                  <div className="pf-route-row">
                    <div className="pf-rdot pf-rdot--from" aria-hidden="true" />
                    <span>{profile.route.from}</span>
                  </div>
                  <div className="pf-route-line" aria-hidden="true" />
                  <div className="pf-route-row">
                    <div className="pf-rdot pf-rdot--to" aria-hidden="true" />
                    <span>{profile.route.to}</span>
                  </div>
                </div>
              )}
            </Section>

            <Section title="Interests">
              {profile.interests?.length > 0 ? (
                <div className="pf-chips">
                  {profile.interests.map(i => (
                    <span key={i} className="pf-chip">{i}</span>
                  ))}
                </div>
              ) : (
                <p className="pf-empty-text">No interests set.</p>
              )}
            </Section>

            <Section title="Notifications">
              <Row icon={Shield} label="Safety alerts"  toggle checked={notifSafety} onToggle={() => setNotifSafety(v => !v)} />
              <Row icon={Bell}   label="Pod messages"   toggle checked={notifPod}    onToggle={() => setNotifPod(v => !v)}    />
              <Row icon={Clock}  label="Delay updates"  toggle checked={notifDelays} onToggle={() => setNotifDelays(v => !v)} />
            </Section>

            <Section title="Privacy">
              <Row
                icon={Lock}
                label="Route visibility"
                value={profile.privacy === 'public' ? 'Public' : profile.privacy === 'private' ? 'Private' : 'Friends only'}
                onClick={handleEdit}
              />
              <Row
                icon={Eye}
                label="Location sharing"
                value="Pod members only"
                onClick={handleEdit}
              />
            </Section>

            <Section title="Account">
              <Row
                icon={LogOut}
                label="Sign out"
                danger
                onClick={() => setShowSignOut(true)}
              />
            </Section>

          </div>
        )}
      </div>

      {/* Sign out confirmation */}
      {showSignOut && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Sign out confirmation">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Sign out?</h2>
              <button
                className="modal-close"
                onClick={() => setShowSignOut(false)}
                aria-label="Cancel"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <p style={{ fontSize: 14, color: 'var(--rm-muted)', marginBottom: 20, lineHeight: 1.5 }}>
              You'll be signed out of Route Mate. Your pods and profile will
              be waiting when you log back in.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="pf-cancel-btn"
                onClick={() => setShowSignOut(false)}
              >
                Cancel
              </button>
              <button
                className="pf-signout-confirm"
                onClick={handleSignOut}
              >
                <LogOut size={15} aria-hidden="true" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">{toast}</div>
      )}
    </div>
  );
}