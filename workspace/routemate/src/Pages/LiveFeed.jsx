import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Users, Shield, MessageSquare,
  Plus, ThumbsUp, MessageCircle, Share2, Clock,
  Bus, Flag, Loader, X,
} from 'lucide-react';
import { getFeed, createPost, toggleLike as apiToggleLike } from '../services/api';
import PageHeader from '../components/PageHeader';
import '../LiveFeed.css';

const TABS = [
  { id: 'all',       label: 'All'       },
  { id: 'delays',    label: 'Delays'    },
  { id: 'crowd',     label: 'Crowd'     },
  { id: 'safety',    label: 'Safety'    },
  { id: 'community', label: 'Community' },
];

export default function LiveFeed() {
  const [activeTab,   setActiveTab]   = useState('all');
  const [posts,       setPosts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [createText,  setCreateText]  = useState('');
  const [createType,  setCreateType]  = useState('community');
  const [posting,     setPosting]     = useState(false);
  const [toast,       setToast]       = useState('');

  useEffect(() => {
    getFeed().then(data => { setPosts(data); setLoading(false); });
  }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  const filtered = activeTab === 'all'
    ? posts
    : posts.filter(p => p.type === activeTab);

  // ── Like toggle ───────────────────────────────────────────────────
  const handleLike = useCallback(async (id) => {
    const updated = await apiToggleLike(id);
    setPosts(prev => prev.map(p => p.id === id ? updated : p));
  }, []);

  // ── Post update — actually writes to the data layer ───────────────
  async function handlePost(e) {
    e.preventDefault();
    if (!createText.trim()) return;
    setPosting(true);
    const newPost = await createPost({ type: createType, text: createText.trim() });
    setPosts(prev => [newPost, ...prev]);
    setCreateText('');
    setShowCreate(false);
    setPosting(false);
    showToast('Update posted to your pod!');
  }

  // ── Share (Web Share API with clipboard fallback) ─────────────────
  async function handleShare(post) {
    const text = `Route Mate update: ${post.text}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(text); showToast('Copied to clipboard!'); }
      catch { showToast('Unable to share.'); }
    }
  }

  return (
    <div className="feed-page">
      <PageHeader
        title="Live feed"
        subtitle={<><span className="live-dot-inline" aria-hidden="true" />Your route · updating now</>}
        action={
          <button
            className="feed-create-btn"
            onClick={() => setShowCreate(s => !s)}
            aria-expanded={showCreate}
            aria-label="Create update"
          >
            {showCreate ? <X size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
          </button>
        }
      />

      {/* Toast */}
      {toast && <div className="feed-toast" role="status" aria-live="polite">{toast}</div>}

      {/* Create update panel */}
      {showCreate && (
        <form className="create-panel" onSubmit={handlePost} noValidate>
          <div className="create-type-row" role="group" aria-label="Post category">
            {['delays', 'crowd', 'safety', 'community'].map(t => (
              <button
                key={t}
                type="button"
                className={`create-type-btn ${createType === t ? 'create-type-btn--active' : ''}`}
                onClick={() => setCreateType(t)}
                aria-pressed={createType === t}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <textarea
            className="create-textarea"
            placeholder="Share a commute update with your pod…"
            value={createText}
            onChange={e => setCreateText(e.target.value)}
            rows={3}
            aria-label="Update text"
          />
          <div className="create-row-actions">
            <button
              type="button"
              className="create-attach"
              onClick={() => showToast('Photo uploads coming in v2')}
            >
              <Flag size={15} aria-hidden="true" /> Flag stop
            </button>
            <button
              type="submit"
              className="create-post-btn"
              disabled={!createText.trim() || posting}
            >
              {posting ? 'Posting…' : 'Post update'}
            </button>
          </div>
        </form>
      )}

      {/* Tab strip */}
      <div className="feed-tabs" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`feed-tab ${activeTab === tab.id ? 'feed-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="feed-list">
        {loading ? (
          <div className="feed-loading">
            <Loader size={22} className="spin" aria-hidden="true" />
            <p>Loading feed…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="feed-empty">
            <MessageSquare size={32} color="var(--rm-muted)" aria-hidden="true" />
            <p>No updates in this category yet.</p>
            <button className="feed-empty-btn" onClick={() => { setShowCreate(true); setCreateType(activeTab === 'all' ? 'community' : activeTab); }}>
              Be the first to post
            </button>
          </div>
        ) : filtered.map(item => (
          <article
            key={item.id}
            className={`feed-item ${item.isAlert ? 'feed-item--alert' : ''} ${item.isOfficial ? 'feed-item--official' : ''}`}
          >
            <div className="feed-item__top">
              <div
                className="feed-avatar"
                style={{ background: item.avatarColor, color: item.avatarText }}
                aria-hidden="true"
              >
                {item.initials}
              </div>
              <div className="feed-item__meta">
                <span className="feed-item__author">{item.authorName}</span>
                <span className="feed-item__time">
                  <Clock size={11} aria-hidden="true" /> {item.time}
                </span>
              </div>
              <span
                className="feed-tag"
                style={{ background: item.tagColor, color: item.tagText }}
              >
                {item.tag}
              </span>
            </div>

            <p className="feed-item__text">{item.text}</p>

            <div className="feed-item__actions">
              <button
                className={`feed-action ${item.liked ? 'feed-action--liked' : ''}`}
                onClick={() => handleLike(item.id)}
                aria-pressed={item.liked}
                aria-label={`Like — ${item.likes} likes`}
              >
                <ThumbsUp size={14} aria-hidden="true" />
                <span>{item.likes}</span>
              </button>
              <button
                className="feed-action"
                onClick={() => showToast('Comments coming in v2')}
                aria-label={`${item.comments} comments`}
              >
                <MessageCircle size={14} aria-hidden="true" />
                <span>{item.comments}</span>
              </button>
              <button
                className="feed-action"
                onClick={() => handleShare(item)}
                aria-label="Share update"
              >
                <Share2 size={14} aria-hidden="true" />
                <span>Share</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}