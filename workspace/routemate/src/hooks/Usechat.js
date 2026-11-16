/**
 * hooks/useChat.js
 *
 * Manages Supabase Realtime (Postgres Changes + Presence + Broadcast)
 * for a single pod chat room.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/Supabase';

const AVATAR_PALETTE = [
  { bg: '#C7EF4E', text: '#003310' },
  { bg: '#A5F3FC', text: '#083344' },
  { bg: '#FDE68A', text: '#451A03' },
  { bg: '#DDD6FE', text: '#2E1065' },
  { bg: '#FBCFE8', text: '#500724' },
];

function getAvatarColors(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

function mapRowToMessage(row, currentUserId) {
  const colors = getAvatarColors(row.user_id || row.sender_name);
  return {
    id: row.id,
    authorId: row.user_id === currentUserId ? 'me' : row.user_id,
    authorName: row.sender_name,
    initials: getInitials(row.sender_name),
    avatarColor: colors.bg,
    avatarText: colors.text,
    text: row.text,
    timestamp: row.created_at,
  };
}

export function useChat(podId, user) {
  const channelRef = useRef(null);
  const typingTimer = useRef(null);
  const userIdRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [onlineCount, setOnlineCount] = useState(1);
  const [typingUsers, setTypingUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  const auth = JSON.parse(localStorage.getItem('rm_auth') || '{}');
  const currentUserId = auth.id || 'anon';
  const currentName = user?.name || auth.name || 'Commuter';

  useEffect(() => {
    if (!podId) return;

    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    let isMounted = true;
    const numericPodId = Number(podId);

    async function initChat() {
      // Resolve current Supabase user ID
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id || currentUserId;
      userIdRef.current = uid;

      // 1. Load existing message history
      const { data: history, error: fetchError } = await supabase
        .from('pod_messages')
        .select('*')
        .eq('pod_id', numericPodId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!isMounted) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setMessages((history ?? []).map((row) => mapRowToMessage(row, uid)));
        setError(null);
      }

      // 2. Join Realtime channel for live inserts, presence & typing
      const channel = supabase.channel(`pod-room-${numericPodId}`, {
        config: {
          presence: { key: uid },
        },
      });

      channel
        // New messages saved to Postgres
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'pod_messages',
            filter: `pod_id=eq.${numericPodId}`,
          },
          (payload) => {
            if (!isMounted) return;
            const mapped = mapRowToMessage(payload.new, uid);
            setMessages((prev) => {
              if (prev.some((m) => m.id === mapped.id)) return prev;
              return [...prev, mapped];
            });
          }
        )
        // Live online commuter count via Presence
        .on('presence', { event: 'sync' }, () => {
          if (!isMounted) return;
          const state = channel.presenceState();
          const count = Object.keys(state).length;
          setOnlineCount(Math.max(1, count));
        })
        // Typing indicators via Broadcast
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (!isMounted || payload.userId === uid) return;
          setTypingUsers((prev) => {
            if (prev.some((u) => u.userId === payload.userId)) return prev;
            return [...prev, { userId: payload.userId, name: payload.name }];
          });
        })
        .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
          if (!isMounted) return;
          setTypingUsers((prev) => prev.filter((u) => u.userId !== payload.userId));
        })
        .subscribe(async (status) => {
          if (!isMounted) return;
          if (status === 'SUBSCRIBED') {
            setConnected(true);
            setError(null);
            await channel.track({ userId: uid, name: currentName });
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnected(false);
            setError('Chat connection interrupted. Reconnecting…');
          }
        });

      channelRef.current = channel;
    }

    initChat();

    return () => {
      isMounted = false;
      clearTimeout(typingTimer.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setMessages([]);
      setOnlineCount(1);
      setTypingUsers([]);
      setConnected(false);
    };
  }, [podId, currentUserId, currentName]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text?.trim();
      if (!trimmed || !podId || !supabase) return false;

      clearTimeout(typingTimer.current);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { userId: userIdRef.current },
      });

      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;
      if (!uid) {
        setError('Please sign in to send messages.');
        return false;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('pod_messages')
        .insert({
          pod_id: Number(podId),
          user_id: uid,
          sender_name: currentName,
          text: trimmed,
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return false;
      }

      // Optimistically append so sender sees it immediately
      if (inserted) {
        const mapped = mapRowToMessage(inserted, uid);
        setMessages((prev) => {
          if (prev.some((m) => m.id === mapped.id)) return prev;
          return [...prev, mapped];
        });
      }

      return true;
    },
    [podId, currentName]
  );

  const startTyping = useCallback(() => {
    if (!channelRef.current || !connected) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: userIdRef.current, name: currentName },
    });

    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { userId: userIdRef.current },
      });
    }, 3000);
  }, [connected, currentName]);

  const stopTyping = useCallback(() => {
    clearTimeout(typingTimer.current);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'stop_typing',
      payload: { userId: userIdRef.current },
    });
  }, []);

  return {
    messages,
    onlineCount,
    typingUsers,
    connected,
    error,
    sendMessage,
    startTyping,
    stopTyping,
  };
}
