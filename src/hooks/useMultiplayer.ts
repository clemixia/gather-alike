import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AvatarConfig } from '../game/types';

export interface PlayerPosition {
  userId: string;
  x: number;
  y: number;
  room: string | null;
  direction: 'up' | 'down' | 'left' | 'right' | 'idle';
  avatar?: AvatarConfig;
}

export function useMultiplayer(coupleId: string | null, userId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<Map<string, PlayerPosition>>(new Map());
  const [partnerOnline, setPartnerOnline] = useState(false);

  // Store the latest position so we can send it when the channel subscribes
  const latestPositionRef = useRef<Omit<PlayerPosition, 'userId'> | null>(null);
  const channelStateRef = useRef<'not_joined' | 'joined'>('not_joined');

  const sendFnRef = useRef<(pos: Omit<PlayerPosition, 'userId'>) => void>(() => {});
  const sendAvatarFnRef = useRef<(avatar: AvatarConfig) => void>(() => {});

  useEffect(() => {
    if (!coupleId || !userId || !supabase) return;

    const channelName = `couple:${coupleId}`;

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: userId },
      },
    });

    channel.on('broadcast', { event: 'position' }, ({ payload }) => {
      const pos = payload as PlayerPosition;
      if (pos.userId && pos.userId !== userId) {
        setRemotePlayers((prev) => {
          const next = new Map(prev);
          next.set(pos.userId, pos);
          return next;
        });
      }
    });

    channel.on('broadcast', { event: 'position' }, ({ payload }) => {
        const pos = payload as PlayerPosition;
        console.log('[useMultiplayer] received position broadcast from', pos.userId, 'at', pos.x, pos.y);
        if (pos.userId && pos.userId !== userId) {
            setRemotePlayers((prev) => {
            const next = new Map(prev);
            next.set(pos.userId, pos);
            return next;
            });
        }
        });

    channel.on('presence', { event: 'join' }, () => {
      const state = channel.presenceState();
      const otherKeys = Object.keys(state).filter((k) => k !== userId);
      setPartnerOnline(otherKeys.length > 0);
    });

    channel.on('presence', { event: 'leave' }, () => {
      const state = channel.presenceState();
      const otherKeys = Object.keys(state).filter((k) => k !== userId);
      setPartnerOnline(otherKeys.length > 0);
      if (otherKeys.length === 0) {
        setRemotePlayers(new Map());
      }
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const otherKeys = Object.keys(state).filter((k) => k !== userId);
      setPartnerOnline(otherKeys.length > 0);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channelStateRef.current = 'joined';
        channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });

        // Send the latest known position immediately so the partner sees us
        if (latestPositionRef.current) {
          channel.send({
            type: 'broadcast',
            event: 'position',
            payload: { ...latestPositionRef.current, userId },
          });
        }
      }
    });

    sendFnRef.current = (pos) => {
      latestPositionRef.current = pos;
      if (channelStateRef.current !== 'joined') return;
      channel.send({
        type: 'broadcast',
        event: 'position',
        payload: { ...pos, userId },
      });
    };

    sendAvatarFnRef.current = (avatar) => {
      if (channelStateRef.current !== 'joined') return;
      channel.send({
        type: 'broadcast',
        event: 'avatar_update',
        payload: { userId, avatar },
      });
    };

    channelRef.current = channel;

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
      channelRef.current = null;
      channelStateRef.current = 'not_joined';
      latestPositionRef.current = null;
      setRemotePlayers(new Map());
      setPartnerOnline(false);
    };
  }, [coupleId, userId]);

  const sendPosition = useCallback((pos: Omit<PlayerPosition, 'userId'>) => {
    sendFnRef.current(pos);
  }, []);

  const sendAvatarUpdate = useCallback((avatar: AvatarConfig) => {
    sendAvatarFnRef.current(avatar);
  }, []);

  return {
    remotePlayers,
    partnerOnline,
    sendPosition,
    sendAvatarUpdate,
  };
}