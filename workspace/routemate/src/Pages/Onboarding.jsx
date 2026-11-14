import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Train, Bus, Car, ArrowRight, ArrowLeft,
  MapPin, Clock, Check, Users, Zap, AlertCircle, Loader
} from 'lucide-react';
import LocationInput from '../Components/Locationinput';
import { completeOnboarding, getSuggestedPods } from '../services/api';
import '../Onboarding.css';

const TOTAL_STEPS = 6;

/* ── Step data ──────────────────────────────────────────────────── */

const TRANSPORT_OPTIONS = [
  { id: 'gautrain', icon: Train, label: 'Gautrain',   color: '#185FA5', bg: '#E6F1FB' },
  { id: 'bus',      icon: Bus,   label: 'Bus',         color: '#085420', bg: '#DCFCE7' },
  { id: 'taxi',     icon: Car,   label: 'Minibus taxi',color: '#B45309', bg: '#FEF3C7' },
  { id: 'train',    icon: Train, label: 'Metrorail',   color: '#7C3AED', bg: '#EDE9FE' },
];

const INTEREST_OPTIONS = [
  '☕ Coffee',  '🎵 Music',   '📚 Study',   '💼 Business',
  '🎙️ Podcasts','💻 Tech',    '🏃 Fitness', '📰 News',
  '🎨 Design',  '🍕 Food',    '🌿 Nature',  '📷 Photography',
];

/* ── Progress bar ───────────────────────────────────────────────── */
function ProgressBar({ step }) {
  return (
    <div className="ob-progress" role="progressbar"
      aria-valuenow={step} aria-valuemin={1} aria-valuemax={TOTAL_STEPS}
      aria-label={`Step ${step} of ${TOTAL_STEPS}`}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`ob-progress__seg ${i < step ? 'ob-progress__seg--done' : ''} ${i === step - 1 ? 'ob-progress__seg--active' : ''}`}
        />
      ))}
    </div>
  );
}

/* ── Nav buttons ────────────────────────────────────────────────── */
function NavRow({ onBack, onNext, nextLabel = 'Continue', nextDisabled = false, showBack = true }) {
  return (
    <div className="ob-nav">
      {showBack ? (
        <button className="ob-nav__back" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
      ) : <div />}
      <button
        className="ob-nav__next"
        onClick={onNext}
        disabled={nextDisabled}
      >
        {nextLabel}
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 1 — Welcome
══════════════════════════════════════════════════════════════════════ */
function StepWelcome({ onNext }) {
  const auth = JSON.parse(localStorage.getItem('rm_auth') || '{}');
  const name = auth.name ? auth.name.split(' ')[0] : 'there';

  return (
    <div className="ob-step fade-in">
      <div className="ob-welcome">
        <div className="ob-welcome__icon" aria-hidden="true">
          <svg width="64" height="64" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="24" fill="#C7EF4E"/>
            <path d="M12 24 Q18 14 24 20 Q30 26 36 16"
              stroke="#003310" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <circle cx="12" cy="24" r="3" fill="#003310"/>
            <circle cx="36" cy="16" r="3" fill="#003310"/>
          </svg>
        </div>
        <h1 className="ob-welcome__title">Hi, {name} 👋</h1>
        <p className="ob-welcome__body">
          Welcome to Route Mate — the commuting app built around your community.
          Let's take 2 minutes to personalise your experience.
        </p>

        <div className="ob-welcome__points">
          {[
            { icon: '🚆', text: 'Set your daily route and transport type' },
            { icon: '🕐', text: 'Tell us when you usually commute' },
            { icon: '👥', text: 'Join pods with fellow commuters' },
          ].map((p, i) => (
            <div key={i} className="ob-welcome__point">
              <span className="ob-welcome__point-icon" aria-hidden="true">{p.icon}</span>
              <span>{p.text}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="ob-primary-btn" onClick={onNext}>
        Let's get started <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 2 — Select transport type
══════════════════════════════════════════════════════════════════════ */
function StepTransport({ data, onChange, onNext, onBack }) {
  return (
    <div className="ob-step fade-in">
      <div className="ob-step__header">
        <h2 className="ob-step__title">How do you commute?</h2>
        <p className="ob-step__sub">Select all that apply — you can change this later.</p>
      </div>

      <div className="transport-grid">
        {TRANSPORT_OPTIONS.map(opt => {
          const Icon = opt.icon;
          const sel  = data.includes(opt.id);
          return (
            <button
              key={opt.id}
              className={`transport-card ${sel ? 'transport-card--sel' : ''}`}
              onClick={() =>
                onChange(sel
                  ? data.filter(x => x !== opt.id)
                  : [...data, opt.id])
              }
              aria-pressed={sel}
            >
              <div className="transport-card__icon" style={{ background: sel ? opt.color : opt.bg }}>
                <Icon size={22} color={sel ? '#fff' : opt.color} aria-hidden="true" />
              </div>
              <span className="transport-card__label">{opt.label}</span>
              {sel && (
                <div className="transport-card__check" aria-hidden="true">
                  <Check size={12} color="#fff" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <NavRow
        onBack={onBack}
        onNext={onNext}
        nextDisabled={data.length === 0}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 3 — Set route (with place search)
══════════════════════════════════════════════════════════════════════ */
function StepRoute({ data, onChange, onNext, onBack }) {
  return (
    <div className="ob-step fade-in">
      <div className="ob-step__header">
        <h2 className="ob-step__title">Set your frequent route</h2>
        <p className="ob-step__sub">We'll use this to suggest pods and show you relevant alerts.</p>
      </div>

      <div className="route-form">
        <div className="route-form__label">Boarding stop</div>
        <div className="route-input-wrap">
          <div className="route-input-dot route-input-dot--from" aria-hidden="true" />
          <LocationInput
            inputClassName="route-input"
            ariaLabel="Boarding stop"
            placeholder="Where do you board?"
            value={data.from}
            onChange={(text, place) => onChange({ ...data, from: text, fromPlace: place })}
            allowCurrentLocation
          />
          <MapPin size={15} className="route-input-icon" aria-hidden="true" />
        </div>

        <div className="route-form__connector" aria-hidden="true" />

        <div className="route-form__label">Destination stop</div>
        <div className="route-input-wrap">
          <div className="route-input-dot route-input-dot--to" aria-hidden="true" />
          <LocationInput
            inputClassName="route-input"
            ariaLabel="Destination stop"
            placeholder="Where are you going?"
            value={data.to}
            onChange={(text, place) => onChange({ ...data, to: text, toPlace: place })}
          />
          <MapPin size={15} className="route-input-icon" aria-hidden="true" />
        </div>
      </div>

      <NavRow
        onBack={onBack}
        onNext={onNext}
        nextDisabled={!data.from.trim() || !data.to.trim()}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 4 — Set commute time
══════════════════════════════════════════════════════════════════════ */
function StepTime({ data, onChange, onNext, onBack }) {
  const TIME_SLOTS = [
    '5:00–6:30am', '6:30–8:00am', '7:00–9:00am',
    '8:00–10:00am', '12:00–2:00pm', '4:00–6:00pm',
    '5:00–7:00pm',  '7:00–9:00pm',
  ];

  return (
    <div className="ob-step fade-in">
      <div className="ob-step__header">
        <h2 className="ob-step__title">When do you commute?</h2>
        <p className="ob-step__sub">Pick your usual time window. This helps match you with the right pod.</p>
      </div>

      <div className="time-grid">
        {TIME_SLOTS.map(slot => (
          <button
            key={slot}
            className={`time-slot ${data.includes(slot) ? 'time-slot--sel' : ''}`}
            onClick={() =>
              onChange(data.includes(slot)
                ? data.filter(s => s !== slot)
                : [...data, slot])
            }
            aria-pressed={data.includes(slot)}
          >
            <Clock size={13} aria-hidden="true" />
            {slot}
          </button>
        ))}
      </div>

      <div className="ob-custom-time">
        <p className="ob-custom-time__label">Or set a custom time</p>
        <div className="ob-custom-time__row">
          <input type="time" className="ob-time-input" defaultValue="07:30" />
          <span className="ob-time-sep">to</span>
          <input type="time" className="ob-time-input" defaultValue="09:00" />
        </div>
      </div>

      <NavRow
        onBack={onBack}
        onNext={onNext}
        nextDisabled={data.length === 0}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 5 — Select interests
══════════════════════════════════════════════════════════════════════ */
function StepInterests({ data, onChange, onNext, onBack }) {
  return (
    <div className="ob-step fade-in">
      <div className="ob-step__header">
        <h2 className="ob-step__title">What are you into?</h2>
        <p className="ob-step__sub">Pick at least 3. We'll use this to match you with like-minded commuters.</p>
      </div>

      <div className="interests-grid">
        {INTEREST_OPTIONS.map(interest => {
          const sel = data.includes(interest);
          return (
            <button
              key={interest}
              className={`interest-chip ${sel ? 'interest-chip--sel' : ''}`}
              onClick={() =>
                onChange(sel
                  ? data.filter(x => x !== interest)
                  : [...data, interest])
              }
              aria-pressed={sel}
            >
              {interest}
            </button>
          );
        })}
      </div>

      <p className="interests-count">
        {data.length} selected {data.length >= 3
          ? '✓'
          : `— pick ${3 - data.length} more`}
      </p>

      <NavRow
        onBack={onBack}
        onNext={onNext}
        nextDisabled={data.length < 3}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STEP 6 — Suggested Transit Pods (loaded from the data layer)
══════════════════════════════════════════════════════════════════════ */
function StepPods({ pods, loading, loadError, onRetry, joined, onToggle, onFinish, saving }) {
  return (
    <div className="ob-step fade-in">
      <div className="ob-step__header">
        <h2 className="ob-step__title">Your suggested pods</h2>
        <p className="ob-step__sub">Based on your route and interests. Join now or find more later.</p>
      </div>

      <div className="suggested-pods">
        {loading && (
          <p className="ob-step__sub" role="status">
            <Loader size={14} className="spin" aria-hidden="true" /> Finding pods for you…
          </p>
        )}

        {loadError && (
          <div className="auth-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" /> {loadError}
            <button className="auth-switch__link" onClick={onRetry} type="button">Try again</button>
          </div>
        )}

        {!loading && !loadError && pods.length === 0 && (
          <p className="ob-step__sub">No pods to suggest yet — you can create the first one from the Pods tab.</p>
        )}

        {pods.map(pod => {
          const isJoined = joined.includes(pod.id);
          return (
            <div key={pod.id} className={`suggested-pod ${isJoined ? 'suggested-pod--joined' : ''}`}>
              <div className="suggested-pod__head">
                <div>
                  <p className="suggested-pod__name">{pod.name}</p>
                  <p className="suggested-pod__meta">{pod.type}</p>
                </div>
                <span className="suggested-pod__match">
                  {pod.match > 0 ? `${pod.match}% match` : 'Suggested'}
                </span>
              </div>
              <div className="suggested-pod__foot">
                <span className="suggested-pod__members">
                  <Users size={12} aria-hidden="true" />{' '}
                  {pod.members === 0 ? 'Be the first to join' : `${pod.members} members`}
                </span>
                <button
                  className={`suggested-pod__btn ${isJoined ? 'suggested-pod__btn--joined' : ''}`}
                  onClick={() => onToggle(pod.id)}
                  aria-pressed={isJoined}
                >
                  {isJoined ? <><Check size={13} aria-hidden="true" /> Joined</> : 'Join pod'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ob-finish-row">
        <button className="ob-skip-btn" onClick={onFinish} disabled={saving}>
          Skip for now
        </button>
        <button
          className="ob-primary-btn ob-primary-btn--wide"
          onClick={onFinish}
          disabled={joined.length === 0 || saving}
        >
          <Zap size={16} aria-hidden="true" />
          {saving ? 'Saving…' : 'Start commuting'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Onboarding component
══════════════════════════════════════════════════════════════════════ */
export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep]     = useState(1);
  const [transport, setTransport] = useState([]);
  const [route,     setRoute]     = useState({ from: '', to: '' });
  const [times,     setTimes]     = useState([]);
  const [interests, setInterests] = useState([]);
  const [joinedPods,setJoinedPods]= useState([]);

  const [suggested,    setSuggested]    = useState([]);
  const [podsLoading,  setPodsLoading]  = useState(false);
  const [podsError,    setPodsError]    = useState('');
  const [saving,       setSaving]       = useState(false);
  const [saveError,    setSaveError]    = useState('');

  async function loadSuggestions() {
    setPodsLoading(true);
    setPodsError('');
    try {
      setSuggested(await getSuggestedPods({ transport, route, times, interests }));
    } catch (err) {
      setPodsError(err.message || 'Could not load pods.');
    }
    setPodsLoading(false);
  }

  function next() {
    if (step === 5) loadSuggestions(); // entering the pods step
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  }
  function back() { setStep(s => Math.max(s - 1, 1)); }

  // Saves to the data layer (Supabase when configured, local demo otherwise).
  // Only leaves onboarding once the save succeeded — a failure shows an error
  // and lets the user try again instead of silently losing their answers.
  async function finish() {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await completeOnboarding({
        transport, route, times, interests, joinedPodIds: joinedPods,
      });
      navigate('/home', { replace: true });
    } catch (err) {
      setSaveError(err.message || 'We could not save your profile. Please try again.');
      setSaving(false);
    }
  }

  return (
    <div className="onboarding">
      {/* Top bar */}
      <div className="ob-topbar">
        <div className="ob-topbar__logo">
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="24" fill="#C7EF4E"/>
            <path d="M12 24 Q18 14 24 20 Q30 26 36 16"
              stroke="#003310" strokeWidth="3" strokeLinecap="round" fill="none"/>
          </svg>
          Route Mate
        </div>
        <button
          className="ob-topbar__skip"
          onClick={finish}
          disabled={saving}
          aria-label="Skip onboarding"
        >
          Skip
        </button>
      </div>

      <ProgressBar step={step} />

      <div className="ob-body">
        {saveError && (
          <div className="auth-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" /> {saveError}
          </div>
        )}

        {step === 1 && <StepWelcome   onNext={next} />}
        {step === 2 && <StepTransport data={transport} onChange={setTransport} onNext={next} onBack={back} />}
        {step === 3 && <StepRoute     data={route}     onChange={setRoute}     onNext={next} onBack={back} />}
        {step === 4 && <StepTime      data={times}     onChange={setTimes}     onNext={next} onBack={back} />}
        {step === 5 && <StepInterests data={interests} onChange={setInterests} onNext={next} onBack={back} />}
        {step === 6 && (
          <StepPods
            pods={suggested}
            loading={podsLoading}
            loadError={podsError}
            onRetry={loadSuggestions}
            joined={joinedPods}
            onToggle={id =>
              setJoinedPods(prev =>
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
              )
            }
            onFinish={finish}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}