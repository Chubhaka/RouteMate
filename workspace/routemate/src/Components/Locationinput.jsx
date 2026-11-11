import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Loader, X, Navigation, Train, Bus, Car, MapPin, AlertCircle,
} from 'lucide-react';
import { searchPlaces, reverseGeocode, MIN_QUERY_LENGTH } from '../services/Geocode';
import '../Locationinput.css';

const DEBOUNCE_MS = 300;
const KIND_ICON = { rail: Train, bus: Bus, taxi: Car, place: MapPin };
const CURRENT = { id: '__current__', kind: 'current' };

/**
 * LocationInput — a text input that suggests real places as you type.
 *
 * Props
 *   value                 controlled text
 *   onChange(text, place) called on every keystroke with (text, null) and on
 *                         selection with (place.label, place). One callback, so
 *                         parents never fight over stale state.
 *   placeholder, ariaLabel, required
 *   inputClassName        lets the host form keep its own input styling
 *   allowCurrentLocation  adds a "Use my current location" option
 *
 * Degrades gracefully: if the search service is unreachable the user can keep
 * typing and whatever they typed is used — the form is never blocked.
 */
export default function LocationInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  required = false,
  inputClassName = '',
  allowCurrentLocation = false,
}) {
  const listId   = useId();
  const wrapRef  = useRef(null);
  const typed    = useRef(false); // only search after the user actually typed

  const [results,  setResults]  = useState([]);
  const [status,   setStatus]   = useState('idle'); // idle | loading | ok | empty | error
  const [open,     setOpen]     = useState(false);
  const [active,   setActive]   = useState(-1);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  const query       = value.trim();
  const showCurrent = allowCurrentLocation && query.length < MIN_QUERY_LENGTH;
  const options     = showCurrent ? [CURRENT] : results;

  // ── Debounced search with request cancellation ─────────────────────
  useEffect(() => {
    // Short queries are reset in handleChange (an event handler), so the
    // effect only ever does the async work.
    if (!typed.current || query.length < MIN_QUERY_LENGTH) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus('loading');
      try {
        const places = await searchPlaces(query, { signal: controller.signal });
        setResults(places);
        setStatus(places.length ? 'ok' : 'empty');
        setActive(-1);
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setResults([]);
        setStatus('error');
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // ── Close when clicking outside ────────────────────────────────────
  useEffect(() => {
    function onDocMouseDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────
  function handleChange(e) {
    typed.current = true;
    setGeoError('');
    setOpen(true);
    if (e.target.value.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setStatus('idle');
    }
    onChange(e.target.value, null); // typing invalidates any previously chosen place
  }

  function choose(place) {
    typed.current = false; // the value change below must not trigger a search
    onChange(place.label, place);
    setOpen(false);
    setActive(-1);
    setResults([]);
    setStatus('idle');
  }

  function fillFromGps() {
    if (!navigator.geolocation) {
      setGeoError('Location is not available on this device.');
      return;
    }
    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const place = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        choose(place);
      },
      () => {
        setLocating(false);
        setGeoError('Location permission was denied.');
        setOpen(true);
      },
      { timeout: 8000 },
    );
  }

  function pick(option) {
    if (option === CURRENT) fillFromGps();
    else choose(option);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!options.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive(i => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === 'Enter' && open && active >= 0) {
      e.preventDefault(); // don't submit the surrounding form
      pick(options[active]);
    }
  }

  function clear() {
    typed.current = false;
    onChange('', null);
    setResults([]);
    setStatus('idle');
  }

  const showDropdown =
    open && (options.length > 0 || status !== 'idle' || locating || geoError);

  return (
    <div className="li-wrap" ref={wrapRef}>
      <input
        className={`li-input ${inputClassName}`.trim()}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-required={required || undefined}
        aria-autocomplete="list"
        aria-expanded={Boolean(showDropdown && options.length > 0)}
        aria-controls={options.length > 0 ? listId : undefined}
        aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />

      <div className="li-adorn">
        {(status === 'loading' || locating) && (
          <Loader size={14} className="spin" aria-hidden="true" />
        )}
        {value && (
          <button
            type="button"
            className="li-clear"
            onClick={clear}
            aria-label={`Clear ${ariaLabel ?? 'location'}`}
          >
            <X size={13} aria-hidden="true" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="li-dropdown">
          {options.length > 0 && (
            <ul id={listId} role="listbox" className="li-list">
              {options.map((opt, i) => {
                const isCurrent = opt === CURRENT;
                const Icon = isCurrent ? Navigation : KIND_ICON[opt.kind] ?? MapPin;
                return (
                  <li
                    key={opt.id}
                    id={`${listId}-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className={`li-option ${i === active ? 'li-option--active' : ''}`}
                    onMouseDown={e => e.preventDefault()} // keep input focus
                    onClick={() => pick(opt)}
                    onMouseEnter={() => setActive(i)}
                  >
                    <span className={`li-option__icon li-kind--${isCurrent ? 'current' : opt.kind}`}>
                      <Icon size={15} aria-hidden="true" />
                    </span>
                    <span className="li-option__text">
                      <span className="li-option__name">
                        {isCurrent ? 'Use my current location' : opt.name}
                      </span>
                      {!isCurrent && opt.detail && (
                        <span className="li-option__detail">{opt.detail}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {locating && (
            <div className="li-status" role="status">Finding your location…</div>
          )}
          {status === 'loading' && options.length === 0 && (
            <div className="li-status" role="status">Searching…</div>
          )}
          {status === 'empty' && (
            <div className="li-status" role="status">
              No matches found. What you typed will still be used.
            </div>
          )}
          {status === 'error' && (
            <div className="li-status li-status--error" role="status">
              <AlertCircle size={13} aria-hidden="true" />
              The place search is unreachable right now. What you type will still be saved.
            </div>
          )}
          {geoError && (
            <div className="li-status li-status--error" role="status">
              <AlertCircle size={13} aria-hidden="true" />
              {geoError}
            </div>
          )}

          <div className="li-attrib">Search by Photon · © OpenStreetMap contributors</div>
        </div>
      )}
    </div>
  );
}