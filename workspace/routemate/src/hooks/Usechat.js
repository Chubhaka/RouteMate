/**
 * hooks/useChat.js
 *
 * Manages the Socket.io connection for a single pod chat room.
 *
 * Returns:
 *   messages       — array of message objects, newest last
 *   onlineCount    — number of sockets currently in the pod room
 *   typingUsers    — array of names currently typing
 *   connected      — boolean socket connection status
 *   sendMessage(text) — sends a message to the room
 *   startTyping()     — emits a typing event (debounced internally)
 *   stopTyping()      — emits stop_typing
 *
 * Usage:
 *   const { messages, sendMessage, connected, onlineCount } = useChat(podId, user);
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_CHAT_SERVER ?? 'http://localhost:3001';

export function useChat(podId, user) {
  const socketRef      = useRef(null);
  const typingTimer    = useRef(null);

  const [messages,    setMessages]    = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);  // [{ userId, name }]
  const [connected,   setConnected]   = useState(false);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    if (!podId) return;

    // ── Connect ───────────────────────────────────────────────────────
    const socket = io(SERVER_URL, {
      transports:        ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      // Join the pod room immediately after connecting
      socket.emit('join_pod', { podId, user });
    });

    socket.on('connect_error', (err) => {
      setConnected(false);
      setError('Could not connect to chat server. Using offline mode.');
      console.warn('[useChat] connect_error:', err.message);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // ── Message events ────────────────────────────────────────────────

    // Full history on join
    socket.on('message_history', ({ messages: history }) => {
      setMessages(history ?? []);
    });

    // Single new message broadcast
    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    // System events (user joined/left)
    socket.on('system_message', (msg) => {
      setMessages(prev => [...prev, { ...msg, isSystem: true }]);
    });

    // ── Presence ──────────────────────────────────────────────────────

    socket.on('member_count', ({ count }) => {
      setOnlineCount(count);
    });

    // ── Typing indicators ─────────────────────────────────────────────

    socket.on('user_typing', ({ userId, name }) => {
      setTypingUsers(prev => {
        if (prev.find(u => u.userId === userId)) return prev;
        return [...prev, { userId, name }];
      });
    });

    socket.on('user_stop_typing', ({ userId }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== userId));
    });

    socket.on('user_left', ({ userId }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== userId));
    });

    // ── Cleanup on unmount / podId change ─────────────────────────────
    return () => {
      clearTimeout(typingTimer.current);
      socket.disconnect();
      socketRef.current = null;
      setMessages([]);
      setOnlineCount(0);
      setTypingUsers([]);
      setConnected(false);
    };
  }, [podId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ───────────────────────────────────────────────────────────────

  const sendMessage = useCallback((text) => {
    if (!text?.trim() || !socketRef.current?.connected) return false;
    socketRef.current.emit('send_message', { podId, text, user });
    // Clear any pending typing indicator
    clearTimeout(typingTimer.current);
    socketRef.current.emit('stop_typing', { podId });
    return true;
  }, [podId, user]);

  const startTyping = useCallback(() => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('typing', { podId, user });
    // Auto-stop after 3 seconds of no new keystrokes
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', { podId });
    }, 3000);
  }, [podId, user]);

  const stopTyping = useCallback(() => {
    clearTimeout(typingTimer.current);
    socketRef.current?.emit('stop_typing', { podId });
  }, [podId]);

  return { messages, onlineCount, typingUsers, connected, error, sendMessage, startTyping, stopTyping };
}