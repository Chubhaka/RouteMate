import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Train, Bus, Car, ArrowLeft, AlertTriangle,
  Clock, ChevronRight, Users, Bell, RefreshCw,
  CheckCircle, MapPin, Zap, Navigation,
} from 'lucide-react';
import { getProfileAsync, getSafetyAlerts, createPost } from '../services/api';
import '../Commuteinfo.css';

// ── Static service data (replaced by API in v2) ────────────────────
const SERVICES = [
  {
    id: 1,
    name:     'Gautrain — Midrand → Park Station',
    short:    'Gautrain',
    icon:     Train,
    iconBg:   '#DCFCE7',
    iconColor:'#085420',
    departs:  '09:07',
    platform: 'Platform 1',
    status:   'on-time',
    duration: '28 min',
    crowd:    'moderate',
  },
  {
    id: 2,
    name:     'Route 14A — Pretoria CBD → Centurion',
    short:    'Bus 14A',
    icon:     Bus,
    iconBg:   '#FEE2E2',
    iconColor:'#B91C1C',
    departs:  '09:00',
    newDeparts:'~09:25',
    platform: 'Platform B2',
    status:   'delayed',
    delay:    '25 min',
    reason:   'N1 accident southbound',
    duration: '45 min',
    crowd:    'high',
  },
  {
    id: 3,
    name:     'Route 14B — Church Square → Centurion',
    short:    'Bus 14B',
    icon:     Bus,
    iconBg:   '#FEF3C7',
    iconColor:'#B45309',
    departs:  '09:15',
    platform: 'Platform B1',
    status:   'on-time',
    duration: '50 min',
    crowd:    'low',
  },
  {
    id: 4,
    name:     'Minibus taxi — Boom St rank',
    short:    'Taxi',
    icon:     Car,
    iconBg:   '#E6F1FB',
    iconColor:'#185FA5',
    departs:  'Now',
    platform: 'Boom St rank',
    status:   'running',
    duration: '35–55 min',
    crowd:    'variable',
  },
];

const ALTERNATIVES = [
  {
    id: 'alt1',
    tag:    'Fastest',
    tagBg:  '#DCFCE7',
    tagText:'#065F46',
    saves:  '16 min vs 14A',
    steps: [
      { label: 'Walk to Pretoria Station', detail: '~4 min · Church St entrance', type: 'walk' },
      { label: 'Gautrain 09:07',           detail: 'Platform 1 · 28 min ride',   type: 'train' },
      { label: 'Arrive Centurion',         detail: 'Est. 09:39 · on time',        type: 'arrive' },
    ],
  },
  {
    id: 'alt2',
    tag:    'Budget',
    tagBg:  '#E6F1FB',
    tagText:'#185FA5',
    saves:  'Cheapest option',
    steps: [
      { label: 'Walk to Boom St rank',  detail: '~6 min',                type: 'walk'   },
      { label: 'Minibus taxi direct',   detail: '35–55 min · ~R20',      type: 'taxi'   },
      { label: 'Arrive Centurion Mall', detail: 'Variable — traffic dependent', type: 'arrive' },
    ],
  },
];

const CROWD_LABEL = { low: 'Quiet',     moderate: 'Moderate',
                      high: 'Busy',     variable: 'Variable', };
const CROWD_COLOR = { low: '#065F46',   moderate: '#B45309',
                      high: '#B91C1C',  variable: '#185FA5',  };
const CROWD_BG    = { low: '#DCFCE7',   moderate: '#FEF3C7',
                      high: '#FEE2E2',  variable: '#E6F1FB',  };

// ── Small helpers ──────────────────────────────────────────────────
function StatusBadge({ status, delay }) {
  const map = {
    'on-time': { label: 'On time',   bg: '#DCFCE7', color: '#065F46' },
    'delayed':  { label: `Delayed ${delay ?? ''}`, bg: '#FEE2E2', color: '#B91C1C' },
    'running':  { label: 'Running',  bg: '#EDE8D8', color: '#085420' },
    'cancelled':{ label: 'Cancelled',bg: '#F3F4F6', color: '#6B7280' },
  };
  const s = map[status] ?? map['on-time'];
  return (
    <span
      className="ci-status-badge"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function CrowdBadge({ crowd }) {
  return (
    <span
      className="ci-crowd-badge"
      style={{
        background: CROWD_BG[crowd]    ?? '#F3F4F6',
        color:      CROWD_COLOR[crowd] ?? '#6B7280',
      }}
    >
      {CROWD_LABEL[crowd] ?? crowd}
    </span>
  );
}

function StepDot({ type }) {
  const map = {
    walk:   { emoji: '🚶', bg: '#F3F4F6' },
    train:  { emoji: '🚆', bg: '#DCFCE7' },
    taxi:   { emoji: '🚕', bg: '#E6F1FB' },
    arrive: { emoji: '📍', bg: '#EDE8D8' },
  };
  const s = map[type] ?? map.arrive;
  return (
    <div className="ci-step-dot" style={{ background: s.bg }}>
      <span aria-hidden="true">{s.emoji}</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function CommuteInfo() {
  const navigate  = useNavigate();
  const [profile, setProfile]     = useState(null);
  const [alerts,  setAlerts]      = useState([]);
  const [toast,   setToast]       = useState('');
  const [notified,setNotified]    = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing,  setRefreshing]  = useState(false);

  useEffect(() => {
    getProfileAsync().then(setProfile);
    getSafetyAlerts().then(a => setAlerts(a.filter(x => x.severity !== 'success')));
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setLastRefresh(new Date());
    setRefreshing(false);
    showToast('Services updated');
  }

  async function handleNotifyPod() {
    if (notified) return;
    await createPost({
      type: 'delays',
      text: '🚌 Route 14A delayed ~25 min (N1 accident). Gautrain 09:07 from Platform 1 is the fastest alternative right now.',
    });
    setNotified(true);
    showToast('Pod notified!');
  }

  const fromStop = profile?.route?.from || 'Midrand Station';
  const toStop   = profile?.route?.to   || 'Wits University';
  const delayed  = SERVICES.filter(s => s.status === 'delayed');

  return (
    <div className="ci-page">

      {/* Header */}
      <div className="ci-header">
        <div className="ci-header__top">
          <button
            className="ci-back"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <div className="ci-header__titles">
            <h1 className="ci-header__title">Commute info</h1>
            <p className="ci-header__sub">
              <span className="live-dot" aria-hidden="true" />
              Live · updating now
            </p>
          </div>
          <button
            className={`ci-refresh ${refreshing ? 'ci-refresh--spin' : ''}`}
            onClick={handleRefresh}
            aria-label="Refresh services"
            disabled={refreshing}
          >
            <RefreshCw size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Route bar */}
        <div className="ci-route-bar">
          <div className="ci-route-bar__row">
            <div className="ci-route-dot ci-route-dot--from" aria-hidden="true" />
            <span className="ci-route-bar__stop">{fromStop}</span>
          </div>
          <div className="ci-route-bar__line" aria-hidden="true" />
          <div className="ci-route-bar__row">
            <div className="ci-route-dot ci-route-dot--to" aria-hidden="true" />
            <span className="ci-route-bar__stop">{toStop}</span>
          </div>
          <button
            className="ci-route-bar__change"
            onClick={() => navigate('/profile')}
            aria-label="Change route in profile"
          >
            Change <ChevronRight size={12} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="ci-body">

        {/* Disruption banner */}
        {delayed.length > 0 && (
          <div className="ci-disruption" role="alert">
            <AlertTriangle size={16} className="ci-disruption__icon" aria-hidden="true" />
            <div>
              <p className="ci-disruption__title">
                Service disruption on your route
              </p>
              <p className="ci-disruption__body">
                {delayed[0].name} delayed ~{delayed[0].delay} — {delayed[0].reason}.
              </p>
              <p className="ci-disruption__meta">
                Confirmed by 6 commuters · 8 min ago
              </p>
            </div>
          </div>
        )}

        {/* Safety alerts */}
        {alerts.slice(0, 1).map(a => (
          <div key={a.id} className={`ci-alert ci-alert--${a.severity}`}>
            <AlertTriangle size={13} aria-hidden="true" />
            <span>{a.title}</span>
          </div>
        ))}

        {/* Upcoming services */}
        <div className="ci-section-label">
          <Clock size={13} aria-hidden="true" />
          Upcoming services
        </div>

        {SERVICES.map(svc => {
          const Icon = svc.icon;
          return (
            <div key={svc.id} className="ci-service-card">
              <div className="ci-service-icon" style={{ background: svc.iconBg }}>
                <Icon size={20} color={svc.iconColor} aria-hidden="true" />
              </div>
              <div className="ci-service-body">
                <div className="ci-service-name">{svc.name}</div>
                <div className="ci-service-meta">
                  <MapPin size={11} aria-hidden="true" /> {svc.platform}
                  &nbsp;·&nbsp;
                  <Clock size={11} aria-hidden="true" /> {svc.duration}
                </div>
                <div className="ci-service-badges">
                  <CrowdBadge crowd={svc.crowd} />
                </div>
              </div>
              <div className="ci-service-time-col">
                {svc.status === 'delayed' ? (
                  <>
                    <div className="ci-time ci-time--struck">{svc.departs}</div>
                    <div className="ci-time ci-time--new">{svc.newDeparts}</div>
                  </>
                ) : (
                  <div className="ci-time">{svc.departs}</div>
                )}
                <StatusBadge status={svc.status} delay={svc.delay} />
              </div>
            </div>
          );
        })}

        {/* Smart alternatives */}
        <div className="ci-section-label" style={{ marginTop: 6 }}>
          <Zap size={13} aria-hidden="true" />
          Suggested alternatives
        </div>

        {ALTERNATIVES.map(alt => (
          <div key={alt.id} className="ci-alt-card">
            <div className="ci-alt-header">
              <span
                className="ci-alt-tag"
                style={{ background: alt.tagBg, color: alt.tagText }}
              >
                {alt.tag}
              </span>
              <span className="ci-alt-saves">{alt.saves}</span>
            </div>
            <div className="ci-alt-steps">
              {alt.steps.map((step, i) => (
                <div key={i} className="ci-step">
                  <div className="ci-step-left">
                    <StepDot type={step.type} />
                    {i < alt.steps.length - 1 && (
                      <div className="ci-step-line" aria-hidden="true" />
                    )}
                  </div>
                  <div className="ci-step-body">
                    <p className="ci-step-label">{step.label}</p>
                    <p className="ci-step-detail">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Pod tips */}
        <div className="ci-section-label" style={{ marginTop: 6 }}>
          <Users size={13} aria-hidden="true" />
          From your pod
        </div>

        <div className="ci-pod-tip">
          <div
            className="ci-pod-tip__av"
            aria-hidden="true"
            style={{ background: '#C7EF4E', color: '#003310' }}
          >
            TN
          </div>
          <div className="ci-pod-tip__body">
            <p className="ci-pod-tip__text">
              Just took the 09:07 Gautrain — Platform 1 is quiet,
              lots of seats. Skip the 14A today.
            </p>
            <p className="ci-pod-tip__meta">
              Thandiwe N. · 3 min ago · Midrand → Wits pod
            </p>
          </div>
        </div>

        <div className="ci-pod-tip">
          <div
            className="ci-pod-tip__av"
            aria-hidden="true"
            style={{ background: '#F59E0B', color: '#412402' }}
          >
            BM
          </div>
          <div className="ci-pod-tip__body">
            <p className="ci-pod-tip__text">
              Platform 3 is a mess right now. Staff have been called.
              Platform 2 is clear.
            </p>
            <p className="ci-pod-tip__meta">
              Boland M. · 7 min ago · Midrand → Wits pod
            </p>
          </div>
        </div>

        {/* Notify CTA */}
        <button
          className={`ci-notify-btn ${notified ? 'ci-notify-btn--done' : ''}`}
          onClick={handleNotifyPod}
          disabled={notified}
        >
          {notified ? (
            <><CheckCircle size={16} aria-hidden="true" /> Pod notified</>
          ) : (
            <><Bell size={16} aria-hidden="true" /> Notify my pod about this delay</>
          )}
        </button>

        <p className="ci-refresh-note">
          Last updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          &nbsp;·&nbsp;
          <button
            className="ci-refresh-link"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </p>

      </div>

      {toast && (
        <div className="toast" role="status" aria-live="polite">{toast}</div>
      )}
    </div>
  );
}