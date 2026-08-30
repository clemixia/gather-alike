import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatMessage {
  id: string;
  couple_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  read_at: string | null;
}

export function useChat(coupleId: string | null, userId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Load existing messages
  useEffect(() => {
    async function load() {
      if (!coupleId || !supabase) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('couple_id', coupleId)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) {
        console.error('Failed to load messages:', error);
      } else {
        setMessages(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, [coupleId]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!coupleId || !userId || !supabase) return;

    const channel = supabase
      .channel(`chat:${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Count as unread if it's from partner and chat isn't focused
          if (newMsg.sender_id !== userId) {
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (supabase) supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [coupleId, userId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!coupleId || !userId || !supabase || !text.trim()) return;

      const trimmed = text.trim().slice(0, 2000);

      const { data, error } = await supabase
        .from('messages')
        .insert({
          couple_id: coupleId,
          sender_id: userId,
          text: trimmed,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to send message:', error);
        return;
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    },
    [coupleId, userId]
  );

  const markAsRead = useCallback(async () => {
    if (!coupleId || !userId || !supabase) return;

    // Find unread messages from partner
    const unread = messages.filter(
      (m) => m.sender_id !== userId && !m.read_at
    );

    if (unread.length === 0) return;

    const ids = unread.map((m) => m.id);
    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids);

    setUnreadCount(0);
  }, [coupleId, userId, messages]);

  return { messages, loading, unreadCount, sendMessage, markAsRead };
}