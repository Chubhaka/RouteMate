import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Send, MapPin, Wifi, WifiOff,
  Users, AlertTriangle, Loader,
} from 'lucide-react';
import { useChat } from '../hooks/useChat';
import '../PodChat.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, isMine }) {
  if (msg.isSystem) {
    return (
      <div className="bubble-system" role="status">
        {msg.text}
      </div>
    );
  }

  return (
    <div className={`bubble-wrap ${isMine ? 'bubble-wrap--mine' : ''}`}>
      {!isMine && (
        <div
          className="bubble-av"
          style={{ background: msg.avatarColor, color: msg.avatarText }}
          aria-hidden="true"
        >
          {msg.initials ?? getInitials(msg.authorName)}
        </div>
      )}
      <div className={`bubble ${isMine ? 'bubble--mine' : ''}`}>
        {!isMine && (
          <span className="bubble__author">{msg.authorName}</span>
        )}
        <p className="bubble__text">{msg.text}</p>
        <span className="bubble__time">{msg.timeLabel ?? formatTime(msg.timestamp)}</span>
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator({ users }) {
  if (!users.length) return null;
  const label = users.length === 1
    ? `${users[0].name} is typing`
    : `${users.map(u => u.name).join(', ')} are typing`;
  return (
    <div className="typing-indicator" aria-live="polite" aria-label={label}>
      <div className="typing-dots">
        <span /><span /><span />
      </div>
      <span className="typing-label">{label}</span>
    </div>
  );
}

// ── Main PodChat component ────────────────────────────────────────────────────
export default function PodChat({ pod, onClose }) {
  const auth = JSON.parse(localStorage.getItem('rm_auth') || '{}');
  const name = auth.name ?? 'You';

  const user = {
    name,
    initials:    getInitials(name),
    avatarColor: '#C7EF4E',
    avatarText:  '#003310',
  };

  const {
    messages, onlineCount, typingUsers,
    connected, error,
    sendMessage, startTyping, stopTyping,
  } = useChat(String(pod.id), user);

  const [inputText,   setInputText]   = useState('');
  const [showLocPin,  setShowLocPin]  = useState(false);
  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleSend = useCallback(() => {
    const ok = sendMessage(inputText);
    if (ok) {
      setInputText('');
      stopTyping();
      inputRef.current?.focus();
    }
  }, [inputText, sendMessage, stopTyping]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInputChange(e) {
    setInputText(e.target.value);
    if (e.target.value.trim()) {
      startTyping();
    } else {
      stopTyping();
    }
  }

  function handleShareLocation() {
    if (!navigator.geolocation) { setShowLocPin(false); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      sendMessage(`📍 Shared location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setShowLocPin(false);
    }, () => {
      sendMessage('📍 Location sharing not available');
      setShowLocPin(false);
    });
  }

  return (
    <div className="pod-chat" role="main" aria-label={`Chat for ${pod.name}`}>

      {/* ── Header ── */}
      <div className="pod-chat__header">
        <button
          className="pod-chat__back"
          onClick={onClose}
          aria-label="Back to pods"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>

        <div className="pod-chat__info">
          <div className="pod-chat__avatar" aria-hidden="true">
            {pod.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="pod-chat__name">{pod.name}</p>
            <p className="pod-chat__meta">
              <Users size={11} aria-hidden="true" />
              {onlineCount > 0 ? `${onlineCount} online` : pod.type}
            </p>
          </div>
        </div>

        <div className={`pod-chat__status ${connected ? 'pod-chat__status--on' : 'pod-chat__status--off'}`}
          aria-label={connected ? 'Connected' : 'Disconnected'}
          title={connected ? 'Connected to chat' : 'Disconnected'}
        >
          {connected
            ? <Wifi size={16} aria-hidden="true" />
            : <WifiOff size={16} aria-hidden="true" />}
        </div>
      </div>

      {/* ── Offline / error banner ── */}
      {error && (
        <div className="pod-chat__offline" role="alert">
          <AlertTriangle size={14} aria-hidden="true" />
          {error}
        </div>
      )}

      {/* ── Messages ── */}
      <div className="pod-chat__messages" aria-live="polite" aria-label="Messages">
        {messages.length === 0 && !connected && (
          <div className="pod-chat__connecting">
            <Loader size={20} className="spin" aria-hidden="true" />
            <p>Connecting to pod…</p>
          </div>
        )}

        {messages.length === 0 && connected && (
          <div className="pod-chat__empty">
            <p>No messages yet — be the first to post!</p>
          </div>
        )}

        {messages.map(msg => (
          <Bubble
            key={msg.id}
            msg={msg}
            isMine={msg.authorId === 'me' || msg.authorName === name}
          />
        ))}

        <TypingIndicator users={typingUsers} />

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="pod-chat__input-bar">
        {showLocPin && (
          <div className="pod-chat__loc-confirm">
            <p>Share your current location with the pod?</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="loc-btn loc-btn--cancel" onClick={() => setShowLocPin(false)}>Cancel</button>
              <button className="loc-btn loc-btn--share"  onClick={handleShareLocation}>Share</button>
            </div>
          </div>
        )}

        <div className="pod-chat__input-row">
          <button
            className="pod-chat__loc-btn"
            onClick={() => setShowLocPin(s => !s)}
            aria-label="Share location"
            title="Share location"
            disabled={!connected}
          >
            <MapPin size={18} aria-hidden="true" />
          </button>

          <textarea
            ref={inputRef}
            className="pod-chat__textarea"
            placeholder={connected ? 'Share an update…' : 'Connecting…'}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={!connected}
            aria-label="Message input"
          />

          <button
            className={`pod-chat__send ${inputText.trim() && connected ? 'pod-chat__send--active' : ''}`}
            onClick={handleSend}
            disabled={!inputText.trim() || !connected}
            aria-label="Send message"
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

    </div>
  );
}