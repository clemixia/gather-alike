import { useCallback, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type ActionEvent =
  | { type: 'reaction'; emoji: string; userId: string }
  | { type: 'wave'; userId: string };

export function useActions(
  coupleId: string | null,
  userId: string | null,
  onAction: (action: ActionEvent) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onActionRef = useRef(onAction);
  onActionRef.current = onAction;

  useEffect(() => {
    if (!coupleId || !userId || !supabase) return;

    const channel = supabase.channel(`actions:${coupleId}`, {
      config: { broadcast: { self: false, ack: false } },
    });

    channel.on('broadcast', { event: 'action' }, ({ payload }) => {
      const action = payload as ActionEvent;
      if (action.userId && action.userId !== userId) {
        onActionRef.current(action);
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (supabase) supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [coupleId, userId]);

  const sendReaction = useCallback(
    (emoji: string) => {
      if (!channelRef.current || !userId) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'action',
        payload: { type: 'reaction', emoji, userId },
      });
      // Also trigger locally so the user sees their own reaction
      onActionRef.current({ type: 'reaction', emoji, userId });
    },
    [userId]
  );

  const sendWave = useCallback(() => {
    if (!channelRef.current || !userId) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'action',
      payload: { type: 'wave', userId },
    });
    onActionRef.current({ type: 'wave', userId });
  }, [userId]);

  return { sendReaction, sendWave };
}