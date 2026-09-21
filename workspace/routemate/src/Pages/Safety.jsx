import React, { useState, useEffect } from 'react';
import {
  Shield, AlertTriangle, Users, CheckCircle,
  Phone, Truck, Flag, Clock, MapPin, X, Info, Plus,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  getSafetyAlerts, getSafeTips,
  submitSafetyReport, addSafeTip,
} from '../services/api';
import '../Safety.css';

const EMERGENCY = [
  { label: 'Police',       number: '10111',        icon: Phone,  color: '#EF4444', bg: '#FEE2E2' },
  { label: 'Medical',      number: '10177',        icon: Truck,  color: '#F59E0B', bg: '#FEF3C7' },
  { label: 'Gautrain',     number: '0800 42 88 72',icon: Shield, color: '#185FA5', bg: '#E6F1FB' },
  { label: 'Metro Police', number: '011 375 5911', icon: Shield, color: '#085420', bg: '#DCFCE7' },
];

const SEVERITY_ICON = { danger: AlertTriangle, warning: Users, success: CheckCircle };

// ── Report modal ──────────────────────────────────────────────────────────────
function ReportModal({ onClose, onReportSubmitted }) {
  const [step,      setStep]      = useState(1);
  const [type,      setType]      = useState('');
  const [location,  setLocation]  = useState('');
  const [details,   setDetails]   = useState('');
  const [submitting,setSubmitting]= useState(false);
  const [result,    setResult]    = useState(null);  // { promoted, count, remaining }
  const [err,       setErr]       = useState('');

  async function handleSubmit() {
    setErr('');
    if (!location.trim()) { setErr('Please enter a location.'); return; }
    setSubmitting(true);
    const res = await submitSafetyReport({ type, location: location.trim(), details: details.trim() });
    setResult(res);
    setSubmitting(false);
    if (res.promoted) onReportSubmitted();   // refresh alerts list
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Report unsafe area">
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Report unsafe area</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} aria-hidden="true" /></button>
        </div>

        {result ? (
          <div className="modal-success">
            <CheckCircle size={36} color={result.promoted ? '#22C55E' : '#F59E0B'} aria-hidden="true" />
            {result.promoted ? (
              <>
                <p className="modal-success__text">
                  <strong>Alert published.</strong> This report reached the threshold of 3 independent
                  submissions and is now visible to all commuters on this route.
                </p>
                <button className="modal-done-btn" onClick={onClose}>Done</button>
              </>
            ) : (
              <>
                <p className="modal-success__text">
                  Report received. <strong>{result.count} of 3</strong> independent reports submitted.
                  {result.remaining > 0 && ` ${result.remaining} more needed before a public alert is shown.`}
                </p>
                <button className="modal-done-btn" onClick={onClose}>Done</button>
              </>
            )}
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="modal-step">
                <p className="modal-label">What type of concern?</p>
                <div className="report-types">
                  {[
                    { id: 'unsafe',   label: 'Unsafe stop',   icon: AlertTriangle },
                    { id: 'crowd',    label: 'Overcrowding',  icon: Users         },
                    { id: 'lighting', label: 'Poor lighting', icon: Info          },
                    { id: 'other',    label: 'Other concern', icon: Flag          },
                  ].map(t => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        className={`report-type-btn ${type === t.id ? 'report-type-btn--sel' : ''}`}
                        onClick={() => setType(t.id)}
                        aria-pressed={type === t.id}
                        type="button"
                      >
                        <Icon size={18} aria-hidden="true" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Threshold notice */}
                <div className="threshold-notice">
                  <Info size={13} aria-hidden="true" />
                  <span>Reports require <strong>3 independent submissions</strong> before a public safety alert is shown to other commuters.</span>
                </div>

                <button className="modal-next" disabled={!type} onClick={() => setStep(2)} type="button">
                  Next
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="modal-step">
                <button className="back-link" onClick={() => setStep(1)} type="button">← Back</button>

                {err && <div className="modal-error" role="alert"><AlertCircle size={13} aria-hidden="true" /> {err}</div>}

                <p className="modal-label">Location</p>
                <div className="modal-input-row">
                  <MapPin size={15} color="var(--rm-dark)" aria-hidden="true" />
                  <input
                    className="modal-input"
                    type="text"
                    placeholder="e.g. Noord Street bus stop"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    aria-label="Location of concern"
                  />
                </div>

                <p className="modal-label" style={{ marginTop: 14 }}>Details (optional)</p>
                <textarea
                  className="modal-textarea"
                  placeholder="Describe what you saw…"
                  rows={3}
                  value={details}
                  onChange={e => setDetails(e.target.value)}
                  aria-label="Additional details"
                />

                <button
                  className="modal-next"
                  onClick={handleSubmit}
                  disabled={submitting}
                  type="button"
                >
                  {submitting ? 'Submitting…' : 'Submit report'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Safety() {
  const [activeTab,   setActiveTab]   = useState('alerts');
  const [alerts,      setAlerts]      = useState([]);
  const [tips,        setTips]        = useState([]);
  const [dismissed,   setDismissed]   = useState([]);
  const [showReport,  setShowReport]  = useState(false);
  const [newTipText,  setNewTipText]  = useState('');
  const [addingTip,   setAddingTip]   = useState(false);
  const [showTipInput,setShowTipInput]= useState(false);
  const [toast,       setToast]       = useState('');

  useEffect(() => {
    getSafetyAlerts().then(setAlerts);
    getSafeTips().then(setTips);
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  async function handleAddTip(e) {
    e.preventDefault();
    if (!newTipText.trim()) return;
    setAddingTip(true);
    const tip = await addSafeTip(newTipText.trim());
    setTips(prev => [...prev, tip]);
    setNewTipText('');
    setShowTipInput(false);
    setAddingTip(false);
    showToast('Tip added — thank you!');
  }

  const visibleAlerts = alerts.filter(a => !dismissed.includes(a.id));

  return (
    <div className="safety-page">
      <PageHeader title="Safety hub" subtitle="Your route · updated now" />

      {toast && <div className="safety-toast" role="status" aria-live="polite">{toast}</div>}

      {/* Tabs */}
      <div className="safety-tabs" role="tablist">
        {[
          { id: 'alerts',   label: 'Alerts'             },
          { id: 'contacts', label: 'Emergency contacts'  },
          { id: 'tips',     label: 'Safe route tips'     },
        ].map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`safety-tab ${activeTab === t.id ? 'safety-tab--active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="safety-body">

        {/* ALERTS */}
        {activeTab === 'alerts' && (
          <div className="fade-in">
            {visibleAlerts.length === 0 ? (
              <div className="safety-clear">
                <Shield size={36} color="#22C55E" aria-hidden="true" />
                <p>No active alerts on your route.</p>
              </div>
            ) : visibleAlerts.map(alert => {
              const Icon = SEVERITY_ICON[alert.severity] ?? AlertTriangle;
              return (
                <div key={alert.id} className={`safety-alert safety-alert--${alert.severity}`}>
                  <div className="safety-alert__header">
                    <div className="safety-alert__icon-wrap"><Icon size={16} aria-hidden="true" /></div>
                    <div className="safety-alert__titles">
                      <p className="safety-alert__title">{alert.title}</p>
                      <span className="safety-alert__meta">
                        <Clock size={11} aria-hidden="true" /> {alert.meta}
                      </span>
                    </div>
                    <button
                      className="safety-alert__dismiss"
                      onClick={() => setDismissed(d => [...d, alert.id])}
                      aria-label="Dismiss alert"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                  <p className="safety-alert__detail">{alert.detail}</p>
                </div>
              );
            })}

            <button className="report-btn" onClick={() => setShowReport(true)}>
              <Flag size={16} aria-hidden="true" />
              Report an unsafe area
            </button>
          </div>
        )}

        {/* EMERGENCY CONTACTS */}
        {activeTab === 'contacts' && (
          <div className="fade-in">
            <p className="safety-intro">Tap any number to call directly.</p>
            {EMERGENCY.map((e, i) => {
              const Icon = e.icon;
              return (
                <a
                  key={i}
                  href={`tel:${e.number.replace(/\s/g, '')}`}
                  className="emergency-card"
                  aria-label={`Call ${e.label}: ${e.number}`}
                >
                  <div className="emergency-card__icon" style={{ background: e.bg }}>
                    <Icon size={20} color={e.color} aria-hidden="true" />
                  </div>
                  <div className="emergency-card__info">
                    <p className="emergency-card__label">{e.label}</p>
                    <p className="emergency-card__number">{e.number}</p>
                  </div>
                  <Phone size={16} color="var(--rm-muted)" aria-hidden="true" />
                </a>
              );
            })}
          </div>
        )}

        {/* SAFE TIPS — Plus is imported, add tip wired to api */}
        {activeTab === 'tips' && (
          <div className="fade-in">
            <p className="safety-intro">Community-sourced tips for staying safe on your daily commute.</p>

            {tips.map((tip, i) => (
              <div key={tip.id} className="tip-card">
                <div className="tip-card__num">{i + 1}</div>
                <p className="tip-card__text">{tip.text}</p>
              </div>
            ))}

            {showTipInput ? (
              <form className="add-tip-form" onSubmit={handleAddTip}>
                <textarea
                  className="add-tip-textarea"
                  placeholder="Share a safety tip with other commuters…"
                  value={newTipText}
                  onChange={e => setNewTipText(e.target.value)}
                  rows={3}
                  aria-label="New safety tip"
                  autoFocus
                />
                <div className="add-tip-actions">
                  <button type="button" className="add-tip-cancel" onClick={() => setShowTipInput(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="add-tip-submit" disabled={!newTipText.trim() || addingTip}>
                    {addingTip ? 'Adding…' : 'Add tip'}
                  </button>
                </div>
              </form>
            ) : (
              <button className="add-tip-btn" onClick={() => setShowTipInput(true)}>
                <Plus size={16} aria-hidden="true" />
                Add a safety tip
              </button>
            )}
          </div>
        )}

      </div>

      {showReport && (
        <ReportModal
          onClose={() => setShowReport(false)}
          onReportSubmitted={() => getSafetyAlerts().then(setAlerts)}
        />
      )}
    </div>
  );
}