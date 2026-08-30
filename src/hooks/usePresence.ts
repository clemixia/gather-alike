import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type PresenceStatus = 'online' | 'away' | 'offline';

const AWAY_TIMEOUT_MS = 60_000;

export function usePresence(coupleId: string | null, userId: string | null) {
  const [partnerStatus, setPartnerStatus] = useState<PresenceStatus>('offline');
  const [localStatus, setLocalStatus] = useState<PresenceStatus>('online');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const awayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const markActive = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    
    // Only update if we were away
    if (localStatus === 'away') {
      console.log('[usePresence] marking active, was away');
      setLocalStatus('online');
    }

    // Always track in channel to notify partner
    if (channelRef.current && userId) {
      channelRef.current.track({
        user_id: userId,
        status: 'online',
        last_active: new Date(now).toISOString(),
      });
    }
  }, [userId, localStatus]);

  useEffect(() => {
    if (!coupleId || !userId || !supabase) return;

    const channel = supabase.channel(`presence:${coupleId}`, {
      config: {
        presence: { key: userId },
      },
    });

    const updatePartnerStatus = () => {
      const state = channel.presenceState();
      const otherKeys = Object.keys(state).filter((k) => k !== userId);

      console.log('[usePresence] updatePartnerStatus, otherKeys:', otherKeys.length);

      if (otherKeys.length === 0) {
        setPartnerStatus('offline');
        return;
      }

      const partnerPresence = state[otherKeys[0]]?.[0];
      if (!partnerPresence) {
        setPartnerStatus('offline');
        return;
      }

      const status = (partnerPresence as any).status as PresenceStatus | undefined;
      console.log('[usePresence] partner status:', status);
      setPartnerStatus(status ?? 'online');
    };

    channel.on('presence', { event: 'sync' }, updatePartnerStatus);
    channel.on('presence', { event: 'join' }, updatePartnerStatus);
    channel.on('presence', { event: 'leave' }, updatePartnerStatus);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({
          user_id: userId,
          status: 'online',
          last_active: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      if (supabase) supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [coupleId, userId]);

  // Away detection timer
  useEffect(() => {
    awayTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed > AWAY_TIMEOUT_MS && localStatus === 'online') {
        console.log('[usePresence] going away after', elapsed, 'ms');
        setLocalStatus('away');
        if (channelRef.current && userId) {
          channelRef.current.track({
            user_id: userId,
            status: 'away',
            last_active: new Date(lastActivityRef.current).toISOString(),
          });
        }
      }
    }, 5000);

    return () => {
      if (awayTimerRef.current) clearInterval(awayTimerRef.current);
    };
  }, [userId, localStatus]);

  // Mark active on mount
  useEffect(() => {
    markActive();
  }, [markActive]);

  return { partnerStatus, localStatus, markActive };
}