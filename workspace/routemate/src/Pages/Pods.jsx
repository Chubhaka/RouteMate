import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Search, Plus, Clock, MessageCircle,
  ChevronRight, Train, Bus, Car, MapPin,
  Star, Lock, Globe, Check, Loader, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getMyPods, getDiscoverPods,
  joinPod, leavePod, createPod,
} from '../services/api';
import PageHeader from '../components/PageHeader';
import PodChat from '../components/PodChat';
import '../Pods.css';

const FILTERS       = ['All', 'By route', 'By stop', 'By time', 'By interest'];
const FILTER_MAP    = { 'By route': 'route', 'By stop': 'stop', 'By time': 'time', 'By interest': 'interest' };

const TRANSPORT_OPTIONS = [
  { id: 'gautrain', icon: Train, label: 'Gautrain'    },
  { id: 'bus',      icon: Bus,   label: 'Bus'         },
  { id: 'taxi',     icon: Car,   label: 'Taxi'        },
  { id: 'train',    icon: Train, label: 'Metrorail'   },
];

const PRIVACY_OPTIONS = [
  { id: 'public',  icon: Globe, label: 'Public',      desc: 'Anyone can find and join'  },
  { id: 'invite',  icon: Star,  label: 'Invite only', desc: 'Members must be approved'  },
  { id: 'private', icon: Lock,  label: 'Private',     desc: 'Hidden from search'        },
];

// ── Reusable pod card ─────────────────────────────────────────────────────────
function PodCard({ pod, onAction, actionLabel = 'Open chat', secondaryLabel = 'Members', secondaryAction }) {
  return (
    <div className="pod-card">
      <div className="pod-card__head">
        <div>
          <p className="pod-card__name">{pod.name}</p>
          <p className="pod-card__meta">{pod.type}</p>
        </div>
        {pod.active && <span className="badge badge--lime">Active</span>}
        {pod.match  && <span className="badge badge--match">{pod.match}% match</span>}
      </div>
      {(pod.members != null || pod.timeWindow) && (
        <div className="pod-card__stats">
          {pod.members   != null && <span className="pod-stat"><Users size={12} aria-hidden="true" /> {pod.members} members</span>}
          {pod.timeWindow        && <span className="pod-stat"><Clock size={12} aria-hidden="true" /> {pod.timeWindow}</span>}
          {pod.newPosts > 0      && <span className="pod-stat pod-stat--new"><MessageCircle size={12} aria-hidden="true" /> {pod.newPosts} new</span>}
        </div>
      )}
      {pod.preview && <p className="pod-card__preview">{pod.preview}</p>}
      <div className="pod-card__actions">
        {secondaryLabel && (
          <button className="pod-action pod-action--ghost" onClick={secondaryAction}>
            {secondaryLabel}
          </button>
        )}
        <button className="pod-action pod-action--primary" onClick={onAction}>
          {actionLabel} {actionLabel !== 'Join pod' && <ChevronRight size={12} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

export default function Pods() {
  const navigate = useNavigate();
  const [tab,           setTab]           = useState('mine');
  const [filter,        setFilter]        = useState('All');
  const [search,        setSearch]        = useState('');
  const [myPods,        setMyPods]        = useState([]);
  const [discPods,      setDiscPods]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [joining,       setJoining]       = useState(null);
  const [toast,         setToast]         = useState('');
  const [activeChatPod, setActiveChatPod] = useState(null); // ← pod object when chat is open

  // Create form state
  const [podName,    setPodName]    = useState('');
  const [transport,  setTransport]  = useState([]);
  const [fromStop,   setFromStop]   = useState('');
  const [toStop,     setToStop]     = useState('');
  const [timeFrom,   setTimeFrom]   = useState('07:30');
  const [timeTo,     setTimeTo]     = useState('09:00');
  const [privacy,    setPrivacy]    = useState('public');
  const [creating,   setCreating]   = useState(false);
  const [createErr,  setCreateErr]  = useState('');

  useEffect(() => {
    async function load() {
      const [mine, disc] = await Promise.all([getMyPods(), getDiscoverPods()]);
      setMyPods(mine);
      setDiscPods(disc);
      setLoading(false);
    }
    load();
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }

  // ── Search + filter ───────────────────────────────────────────────────────
  const filteredDiscover = useMemo(() => {
    let list = discPods;
    if (filter !== 'All') {
      const key = FILTER_MAP[filter];
      list = list.filter(p => p.filterType === key);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
      );
    }
    return list;
  }, [discPods, filter, search]);

  async function handleJoin(podId) {
    setJoining(podId);
    await joinPod(podId);
    const [mine, disc] = await Promise.all([getMyPods(), getDiscoverPods()]);
    setMyPods(mine);
    setDiscPods(disc);
    setJoining(null);
    showToast('Pod joined!');
  }

  async function handleLeave(podId) {
    await leavePod(podId);
    const mine = await getMyPods();
    setMyPods(mine);
    showToast('Left pod.');
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreateErr('');
    if (!podName.trim())       { setCreateErr('Please enter a pod name.');                    return; }
    if (transport.length === 0){ setCreateErr('Select at least one transport type.');         return; }
    if (!fromStop.trim() || !toStop.trim()) { setCreateErr('Enter both boarding and destination stops.'); return; }
    setCreating(true);
    try {
      await createPod({
        name: podName, transport, from: fromStop, to: toStop,
        timeWindow: `${timeFrom}–${timeTo}`,
        privacy,
      });
      const mine = await getMyPods();
      setMyPods(mine);
      setPodName(''); setTransport([]); setFromStop(''); setToStop('');
      setPrivacy('public');
      setTab('mine');
      showToast('Pod created and joined!');
    } catch {
      setCreateErr('Something went wrong — try again.');
    }
    setCreating(false);
  }

  // ── If a chat is open, render it full-screen instead ─────────────────────
  if (activeChatPod) {
    return (
      <PodChat
        pod={activeChatPod}
        onClose={() => setActiveChatPod(null)}
      />
    );
  }

  return (
    <div className="pods-page">
      <PageHeader
        title="Transit pods"
        subtitle="Your commute communities"
        action={
          <button
            className="header-add-btn"
            onClick={() => setTab('create')}
            aria-label="Create pod"
          >
            <Plus size={18} aria-hidden="true" />
          </button>
        }
      />

      {/* Toast */}
      {toast && (
        <div className="pods-toast" role="status" aria-live="polite">{toast}</div>
      )}

      {/* Tabs */}
      <div className="pods-tabs" role="tablist">
        {[
          { id: 'mine',     label: 'My pods'  },
          { id: 'discover', label: 'Discover' },
          { id: 'create',   label: '+ Create' },
        ].map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`pods-tab ${tab === t.id ? 'pods-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pods-body">

        {/* MY PODS */}
        {tab === 'mine' && (
          <div className="fade-in">
            {loading ? (
              <div className="pods-loading">
                <Loader size={18} className="spin" aria-hidden="true" /> Loading…
              </div>
            ) : myPods.length === 0 ? (
              <div className="pods-empty">
                <Users size={32} color="var(--rm-muted)" aria-hidden="true" />
                <p>You haven't joined any pods yet.</p>
                <button className="pods-empty-btn" onClick={() => setTab('discover')}>
                  Discover pods
                </button>
              </div>
            ) : myPods.map(pod => (
              <PodCard
                key={pod.id}
                pod={pod}
                actionLabel="Open chat"
                onAction={() => setActiveChatPod(pod)}
                secondaryLabel="Leave pod"
                secondaryAction={() => handleLeave(pod.id)}
              />
            ))}
          </div>
        )}

        {/* DISCOVER PODS */}
        {tab === 'discover' && (
          <div className="fade-in">
            <div className="search-bar">
              <Search size={15} color="var(--rm-muted)" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search pods by name or type…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="search-input"
                aria-label="Search pods"
              />
              {search && (
                <button
                  className="search-clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="filter-scroll" role="group" aria-label="Filter by type">
              {FILTERS.map(f => (
                <button
                  key={f}
                  className={`filter-chip ${filter === f ? 'filter-chip--active' : ''}`}
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                >
                  {f}
                </button>
              ))}
            </div>

            {filteredDiscover.length === 0 ? (
              <div className="pods-empty">
                <Search size={28} color="var(--rm-muted)" aria-hidden="true" />
                <p>No pods match "{search || filter}".</p>
                <button
                  className="pods-empty-btn"
                  onClick={() => { setSearch(''); setFilter('All'); }}
                >
                  Clear filters
                </button>
              </div>
            ) : filteredDiscover.map(pod => (
              <PodCard
                key={pod.id}
                pod={pod}
                actionLabel={joining === pod.id ? 'Joining…' : 'Join pod'}
                onAction={() => handleJoin(pod.id)}
                secondaryLabel="Preview"
                secondaryAction={() => showToast('Pod preview coming in v2')}
              />
            ))}
          </div>
        )}

        {/* CREATE POD */}
        {tab === 'create' && (
          <div className="fade-in create-pod">
            <p className="create-pod__intro">
              Build a community around your commute route or a shared interest.
            </p>

            <form onSubmit={handleCreate} noValidate>
              {createErr && (
                <div className="create-error" role="alert">
                  <X size={13} aria-hidden="true" /> {createErr}
                </div>
              )}

              <div className="create-section">
                <label className="create-label" htmlFor="pod-name">Pod name</label>
                <input
                  id="pod-name"
                  className="create-input"
                  type="text"
                  placeholder="e.g. Midrand → Wits Morning"
                  value={podName}
                  onChange={e => setPodName(e.target.value)}
                />
              </div>

              <div className="create-section">
                <label className="create-label">Transport type</label>
                <div className="transport-grid" role="group" aria-label="Transport options">
                  {TRANSPORT_OPTIONS.map(t => {
                    const Icon = t.icon;
                    const sel  = transport.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`transport-btn ${sel ? 'transport-btn--sel' : ''}`}
                        onClick={() =>
                          setTransport(sel
                            ? transport.filter(x => x !== t.id)
                            : [...transport, t.id])
                        }
                        aria-pressed={sel}
                      >
                        <Icon size={18} aria-hidden="true" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="create-section">
                <label className="create-label">Route</label>
                <div className="route-inputs">
                  <div className="route-input-row">
                    <MapPin size={14} color="var(--rm-dark)" aria-hidden="true" />
                    <input
                      className="create-input"
                      type="text"
                      placeholder="From: boarding stop"
                      value={fromStop}
                      onChange={e => setFromStop(e.target.value)}
                      aria-label="Boarding stop"
                    />
                  </div>
                  <div className="route-input-row">
                    <MapPin size={14} color="var(--rm-lime)" aria-hidden="true" />
                    <input
                      className="create-input"
                      type="text"
                      placeholder="To: destination stop"
                      value={toStop}
                      onChange={e => setToStop(e.target.value)}
                      aria-label="Destination stop"
                    />
                  </div>
                </div>
              </div>

              <div className="create-section">
                <label className="create-label">Commute time window</label>
                <div className="time-row">
                  <input
                    className="create-input"
                    type="time"
                    value={timeFrom}
                    onChange={e => setTimeFrom(e.target.value)}
                    aria-label="Start time"
                  />
                  <span className="time-sep">to</span>
                  <input
                    className="create-input"
                    type="time"
                    value={timeTo}
                    onChange={e => setTimeTo(e.target.value)}
                    aria-label="End time"
                  />
                </div>
              </div>

              <div className="create-section">
                <label className="create-label">Privacy</label>
                {PRIVACY_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`privacy-opt ${privacy === opt.id ? 'privacy-opt--sel' : ''}`}
                      onClick={() => setPrivacy(opt.id)}
                      aria-pressed={privacy === opt.id}
                    >
                      <div className="privacy-opt__icon">
                        <Icon size={16} aria-hidden="true" />
                      </div>
                      <div>
                        <p className="privacy-opt__label">{opt.label}</p>
                        <p className="privacy-opt__desc">{opt.desc}</p>
                      </div>
                      {privacy === opt.id && <div className="privacy-check" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>

              <button type="submit" className="create-submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create pod'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}