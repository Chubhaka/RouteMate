import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Train, AlertTriangle, Users, Clock,
  MapPin, Flag, PenLine, MessageCircle,
  Bookmark, ChevronRight, Zap, TrendingUp, Shield,
} from 'lucide-react';
import { getMyPods, getSafetyAlerts, getProfile } from '../services/api';
import '../Home.css';

const TRANSPORT_ICONS = { gautrain: '🚆', bus: '🚌', taxi: '🚕', train: '🚂' };

const QUICK_ACTIONS = [
  { id: 'delay',    icon: Flag,          label: 'Report delay',  color: '#EF4444', bg: '#FEE2E2', route: '/safety'   },
  { id: 'post',     icon: PenLine,       label: 'Create post',   color: '#085420', bg: '#DCFCE7', route: '/feed'     },
  { id: 'chat',     icon: MessageCircle, label: 'Open chat',     color: '#3B8BD4', bg: '#E6F1FB', route: '/pods'     },
  { id: 'save',     icon: Bookmark,      label: 'Save location', color: '#F59E0B', bg: '#FEF3C7', route: '/discover' },
];

export default function Home() {
  const navigate = useNavigate();
  const [profile,  setProfile]  = useState(null);
  const [pods,     setPods]     = useState([]);
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    async function load() {
      const [p, myPods, safetyAlerts] = await Promise.all([
        getProfile(),
        getMyPods(),
        getSafetyAlerts(),
      ]);
      setProfile(p);
      setPods(myPods);
      setAlerts(safetyAlerts.filter(a => a.severity !== 'success').slice(0, 3));
      setLoading(false);
    }
    load();
  }, []);

  const firstName = profile?.name
    ? profile.name.split(' ')[0]
    : (JSON.parse(localStorage.getItem('rm_auth') || '{}').name?.split(' ')[0] ?? 'there');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const transportIcon = profile?.transport?.[0]
    ? TRANSPORT_ICONS[profile.transport[0]] ?? '🚆'
    : '🚆';

  const fromStop = profile?.route?.from || 'Your boarding stop';
  const toStop   = profile?.route?.to   || 'Your destination';

  const nearbySpots = [
    { emoji: '☕', name: 'Station Deli',  dist: '80m',      tag: 'Coffee'  },
    { emoji: '📚', name: 'Wits Library', dist: '5 stops',  tag: 'Study'   },
    { emoji: '🛡️', name: 'Safe zone',   dist: 'Platform 2',tag: 'Safety'  },
    { emoji: '🛒', name: 'Pick n Pay',   dist: '120m',      tag: 'Stores'  },
  ];

  return (
    <div className="home">
      {/* ── Header ── */}
      <header className="home-header">
        <div className="home-header__inner">
          <div>
            <p className="home-header__greeting">{greeting}, {firstName}</p>
            <h1 className="home-header__title">Your commute, connected.</h1>
          </div>
          <div className="live-badge" aria-label="Live updates active">
            <span className="live-dot" aria-hidden="true" />
            <span>Live</span>
          </div>
        </div>

        <div className="stat-row">
          <div className="stat-pill">
            <Train size={14} aria-hidden="true" />
            <div>
              <span className="stat-pill__val">09:07</span>
              <span className="stat-pill__label">Next train</span>
            </div>
          </div>
          <div className="stat-pill">
            <Users size={14} aria-hidden="true" />
            <div>
              <span className="stat-pill__val">{loading ? '–' : pods.reduce((s, p) => s + p.members, 0)}</span>
              <span className="stat-pill__label">Pod members</span>
            </div>
          </div>
          <div className="stat-pill">
            <Zap size={14} aria-hidden="true" />
            <div>
              <span className="stat-pill__val">{loading ? '–' : alerts.length}</span>
              <span className="stat-pill__label">New alerts</span>
            </div>
          </div>
        </div>
      </header>

      <div className="home-body">

        {/* ── Today's route (from profile) ── */}
        <section className="home-section" aria-labelledby="route-heading">
          <div className="section-label" id="route-heading">
            <TrendingUp size={13} aria-hidden="true" />
            Today's route
          </div>
          <div className="route-card">
            <div className="route-card__line">
              <div className="route-dot route-dot--from" aria-hidden="true" />
              <div className="route-card__name">{fromStop}</div>
              <Clock size={13} className="route-card__icon" aria-hidden="true" />
              <span className="route-card__time">09:07</span>
            </div>
            <div className="route-connector" aria-hidden="true" />
            <div className="route-card__line">
              <div className="route-dot route-dot--to" aria-hidden="true" />
              <div className="route-card__name">{toStop}</div>
              <span className="route-card__badge">On time</span>
            </div>
            <button
              className="route-card__detail"
              onClick={() => navigate('/feed')}
              aria-label="View full commute info on live feed"
            >
              View commute info <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </section>

        {/* ── Live alerts (from api) ── */}
        <section className="home-section" aria-labelledby="alerts-heading">
          <div className="section-label" id="alerts-heading">
            <AlertTriangle size={13} aria-hidden="true" />
            Live alerts
          </div>
          <div className="alerts-list">
            {loading ? (
              <div className="home-loading">Loading alerts…</div>
            ) : alerts.length === 0 ? (
              <div className="alert-item alert-item--success">
                <Shield size={14} className="alert-item__icon" aria-hidden="true" />
                <div className="alert-item__body">
                  <p className="alert-item__text">No active alerts on your route.</p>
                </div>
              </div>
            ) : alerts.map(a => (
              <div key={a.id} className={`alert-item alert-item--${a.severity === 'danger' ? 'danger' : a.severity === 'warning' ? 'warning' : 'success'}`}>
                <AlertTriangle size={14} className="alert-item__icon" aria-hidden="true" />
                <div className="alert-item__body">
                  <p className="alert-item__text">{a.title}</p>
                  <span className="alert-item__time">{a.meta}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Active pods (from profile + api) ── */}
        <section className="home-section" aria-labelledby="pods-heading">
          <div className="section-label" id="pods-heading">
            <Users size={13} aria-hidden="true" />
            Active pods
          </div>
          {loading ? (
            <div className="home-loading">Loading pods…</div>
          ) : pods.length === 0 ? (
            <div className="home-empty-pods">
              <p>You haven't joined any pods yet.</p>
              <button className="home-empty-btn" onClick={() => navigate('/pods')}>
                Find a pod
              </button>
            </div>
          ) : pods.map(pod => (
            <div key={pod.id} className="pod-card">
              <div className="pod-card__header">
                <div>
                  <p className="pod-card__name">{pod.name}</p>
                  <p className="pod-card__type">{pod.type} · {pod.members} members</p>
                </div>
                {pod.newPosts > 0 && (
                  <span className="pod-badge">{pod.newPosts} new</span>
                )}
              </div>
              <p className="pod-card__preview">{pod.preview}</p>
              <div className="pod-card__actions">
                <button
                  className="pod-btn pod-btn--ghost"
                  onClick={() => navigate('/pods')}
                >
                  Members
                </button>
                <button
                  className="pod-btn pod-btn--primary"
                  onClick={() => navigate('/feed')}
                >
                  Open feed
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* ── Quick actions ── */}
        <section className="home-section" aria-labelledby="actions-heading">
          <div className="section-label" id="actions-heading">
            <Zap size={13} aria-hidden="true" />
            Quick actions
          </div>
          <div className="quick-grid">
            {QUICK_ACTIONS.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  className="quick-card"
                  onClick={() => navigate(action.route)}
                  aria-label={action.label}
                >
                  <div className="quick-card__icon" style={{ background: action.bg }}>
                    <Icon size={18} color={action.color} aria-hidden="true" />
                  </div>
                  <span className="quick-card__label">{action.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Discover nearby ── */}
        <section className="home-section" aria-labelledby="nearby-heading">
          <div className="section-label" id="nearby-heading">
            <MapPin size={13} aria-hidden="true" />
            Discover nearby
          </div>
          <div className="nearby-scroll" role="list">
            {nearbySpots.map((item, i) => (
              <button
                key={i}
                role="listitem"
                className="nearby-chip"
                onClick={() => navigate('/discover')}
                aria-label={`${item.name} — ${item.dist}`}
              >
                <span className="nearby-chip__emoji" aria-hidden="true">{item.emoji}</span>
                <div>
                  <p className="nearby-chip__name">{item.name}</p>
                  <p className="nearby-chip__dist">{item.dist}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}