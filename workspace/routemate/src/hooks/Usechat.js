import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/Supabase';

export function useChat(podId, currentUser) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Load message history & subscribe to live inserts
  useEffect(() => {
    if (!podId || !supabase) return;
    let active = true;

    async function loadHistory() {
      setLoading(true);
      const { data, error } = await supabase
        .from('pod_messages')
        .select('*')
        .eq('pod_id', podId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error && active) {
        setMessages(data ?? []);
      }
      if (active) setLoading(false);
    }

    loadHistory();

    // Subscribe to new messages in this pod
    const channel = supabase
      .channel(`pod-chat-${podId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pod_messages',
          filter: `pod_id=eq.${podId}`,
        },
        (payload) => {
          setMessages((prev) => {
            // Avoid duplicates if already added
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [podId]);

  // 2. Send a new message
  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || !podId || !supabase) return;

      const auth = JSON.parse(localStorage.getItem('rm_auth') || '{}');
      const senderName = currentUser?.name || auth.name || 'Commuter';

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      const { error } = await supabase.from('pod_messages').insert({
        pod_id: Number(podId),
        user_id: userId,
        sender_name: senderName,
        text: trimmed,
      });

      if (error) {
        console.error('Failed to send message:', error.message);
      }
    },
    [podId, currentUser]
  );

  return { messages, sendMessage, loading };
}
