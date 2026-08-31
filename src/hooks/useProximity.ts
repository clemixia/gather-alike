import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { PlayerPosition } from './useMultiplayer';

export interface LocalPosition {
  x: number;
  y: number;
  room: string | null;
}

interface UseProximityOptions {
  localPositionRef: MutableRefObject<LocalPosition | null>;
  remotePlayers: Map<string, PlayerPosition>;
  partnerId: string | null;
  partnerOnline: boolean;
  enabled: boolean;
}

const CONNECT_THRESHOLD = 150;
const DISCONNECT_THRESHOLD = 190;
const CONNECT_DEBOUNCE = 1000;
const DISCONNECT_GRACE = 3000;
const CHECK_INTERVAL = 400;

export function useProximity({
  localPositionRef,
  remotePlayers,
  partnerId,
  partnerOnline,
  enabled,
}: UseProximityOptions) {
  const [near, setNear] = useState(false);
  const nearRef = useRef(false);

  const remotePlayersRef = useRef<Map<string, PlayerPosition>>(remotePlayers);

  useEffect(() => {
    remotePlayersRef.current = remotePlayers;
  }, [remotePlayers]);

  useEffect(() => {
    if (!enabled || !partnerOnline || !partnerId) {
      nearRef.current = false;
      setNear(false);
      return;
    }

    let connectTimer: ReturnType<typeof setTimeout> | null = null;
    let disconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const clearConnectTimer = () => {
      if (connectTimer) {
        clearTimeout(connectTimer);
        connectTimer = null;
      }
    };

    const clearDisconnectTimer = () => {
      if (disconnectTimer) {
        clearTimeout(disconnectTimer);
        disconnectTimer = null;
      }
    };

    const scheduleConnect = () => {
      clearDisconnectTimer();

      if (!nearRef.current && !connectTimer) {
        connectTimer = setTimeout(() => {
          nearRef.current = true;
          setNear(true);
          connectTimer = null;
        }, CONNECT_DEBOUNCE);
      }
    };

    const scheduleDisconnect = () => {
      clearConnectTimer();

      if (nearRef.current && !disconnectTimer) {
        disconnectTimer = setTimeout(() => {
          nearRef.current = false;
          setNear(false);
          disconnectTimer = null;
        }, DISCONNECT_GRACE);
      }
    };

    const check = () => {
      const local = localPositionRef.current;
      const remote = remotePlayersRef.current.get(partnerId);

      if (!local || !remote || !local.room || !remote.room) {
        scheduleDisconnect();
        return;
      }

      const sameRoom = local.room === remote.room;
      const distance = Math.hypot(local.x - remote.x, local.y - remote.y);

      // Hysteresis:
      // - To connect, must be within CONNECT_THRESHOLD
      // - To stay connected, can drift until DISCONNECT_THRESHOLD
      const condition = nearRef.current
        ? sameRoom && distance <= DISCONNECT_THRESHOLD
        : sameRoom && distance <= CONNECT_THRESHOLD;

      if (condition) {
        scheduleConnect();
      } else {
        scheduleDisconnect();
      }
    };

    const interval = setInterval(check, CHECK_INTERVAL);
    check();

    return () => {
      clearInterval(interval);
      clearConnectTimer();
      clearDisconnectTimer();
    };
  }, [enabled, partnerOnline, partnerId, localPositionRef]);

  return near;
}