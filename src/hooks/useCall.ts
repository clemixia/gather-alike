import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { PeerConnection } from '../webrtc/PeerConnection';
import type { CallState, SignalMessage } from '../webrtc/types';

interface UseCallOptions {
  coupleId: string | null;
  userId: string | null;
  partnerId: string | null;
  partnerOnline: boolean;
  near: boolean;
  proximityEnabled: boolean;
  preferredMicEnabled: boolean;
  preferredCameraEnabled: boolean;
  onMicPreferenceChange: (enabled: boolean) => void;
  onCameraPreferenceChange: (enabled: boolean) => void;
}

function getMediaErrorMessage(error: unknown): string {
  if (!window.isSecureContext) {
    return 'Voice/video calls require HTTPS or localhost.';
  }

  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Permission denied. Please allow microphone/camera access.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No microphone or camera found.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Your microphone or camera is being used by another app.';
      case 'OverconstrainedError':
        return 'Your device does not support the requested media settings.';
      default:
        return error.message || 'Media error.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while starting the call.';
}

export function useCall({
  coupleId,
  userId,
  partnerId,
  partnerOnline,
  near,
  proximityEnabled,
  preferredMicEnabled,
  preferredCameraEnabled,
  onMicPreferenceChange,
  onCameraPreferenceChange,
}: UseCallOptions) {
  const supported =
    typeof window !== 'undefined' &&
    'RTCPeerConnection' in window &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  const [callState, setCallState] = useState<CallState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(preferredMicEnabled);
  const [cameraEnabled, setCameraEnabled] = useState(preferredCameraEnabled);
  const [error, setError] = useState<string | null>(null);

  const callStateRef = useRef<CallState>(callState);
  const nearRef = useRef(near);
  const partnerOnlineRef = useRef(partnerOnline);
  const proximityEnabledRef = useRef(proximityEnabled);
  const supportedRef = useRef(supported);

  const preferredMicEnabledRef = useRef(preferredMicEnabled);
  const preferredCameraEnabledRef = useRef(preferredCameraEnabled);

  const onMicPreferenceChangeRef = useRef(onMicPreferenceChange);
  const onCameraPreferenceChangeRef = useRef(onCameraPreferenceChange);

  const manualEndedRef = useRef(false);
  const startingRef = useRef(false);

  const peerRef = useRef<PeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const joinedRef = useRef(false);

  const handlerRef = useRef<(message: SignalMessage) => void>(() => {});
  const pendingSignalsRef = useRef<SignalMessage[]>([]);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    nearRef.current = near;
  }, [near]);

  useEffect(() => {
    partnerOnlineRef.current = partnerOnline;
  }, [partnerOnline]);

  useEffect(() => {
    proximityEnabledRef.current = proximityEnabled;
  }, [proximityEnabled]);

  useEffect(() => {
    supportedRef.current = supported;
  }, [supported]);

  useEffect(() => {
    preferredMicEnabledRef.current = preferredMicEnabled;

    if (callStateRef.current === 'idle') {
      setMicEnabled(preferredMicEnabled);
    }
  }, [preferredMicEnabled]);

  useEffect(() => {
    preferredCameraEnabledRef.current = preferredCameraEnabled;

    if (callStateRef.current === 'idle') {
      setCameraEnabled(preferredCameraEnabled);
    }
  }, [preferredCameraEnabled]);

  useEffect(() => {
    onMicPreferenceChangeRef.current = onMicPreferenceChange;
  }, [onMicPreferenceChange]);

  useEffect(() => {
    onCameraPreferenceChangeRef.current = onCameraPreferenceChange;
  }, [onCameraPreferenceChange]);

  const sendSignal = useCallback(
    (message: SignalMessage) => {
      if (!joinedRef.current || !channelRef.current || !userId) return;

      channelRef.current.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          ...message,
          from: userId,
        },
      });
    },
    [userId]
  );

  // Signaling channel
  useEffect(() => {
    if (!coupleId || !userId || !supabase) return;

    const channel = supabase.channel(`call:${coupleId}`, {
      config: {
        broadcast: {
          self: false,
          ack: false,
        },
      },
    });

    channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
      const message = payload as SignalMessage;

      if (message.from && message.from !== userId) {
        handlerRef.current(message);
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        joinedRef.current = true;
      }
    });

    channelRef.current = channel;

    return () => {
      joinedRef.current = false;

      if (supabase) {
        supabase.removeChannel(channel);
      }

      channelRef.current = null;
    };
  }, [coupleId, userId]);

  const refreshLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }
  }, []);

  const cleanupCall = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);

    // Restore UI state to saved preferences.
    setMicEnabled(preferredMicEnabledRef.current);
    setCameraEnabled(preferredCameraEnabledRef.current);

    setCallState('idle');
  }, []);

  const endCall = useCallback(
    (manual = false) => {
      if (manual) {
        manualEndedRef.current = true;
      }

      sendSignal({ kind: 'call-end' });
      cleanupCall();
    },
    [sendSignal, cleanupCall]
  );

  const startCall = useCallback(async () => {
    if (
      !supportedRef.current ||
      !coupleId ||
      !userId ||
      !partnerId ||
      !partnerOnlineRef.current ||
      !nearRef.current ||
      !proximityEnabledRef.current ||
      manualEndedRef.current
    ) {
      return;
    }

    if (peerRef.current || callStateRef.current !== 'idle' || startingRef.current) {
      return;
    }

    startingRef.current = true;
    setCallState('starting');
    setError(null);

    try {
      const wantVideo = preferredCameraEnabledRef.current;

      let stream: MediaStream;
      let cameraFailed = false;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: wantVideo,
        });
      } catch (firstError) {
        // If camera failed, try audio-only.
        if (wantVideo) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: false,
            });

            cameraFailed = true;
          } catch (audioOnlyError) {
            setError(getMediaErrorMessage(audioOnlyError));
            setCallState('error');
            return;
          }
        } else {
          setError(getMediaErrorMessage(firstError));
          setCallState('error');
          return;
        }
      }

      if (cameraFailed) {
        setError('Camera unavailable. Continuing with microphone only.');
        onCameraPreferenceChangeRef.current(false);
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Apply saved mic preference immediately.
      const audioTrack = stream.getAudioTracks()[0];

      if (audioTrack) {
        audioTrack.enabled = preferredMicEnabledRef.current;
      }

      setMicEnabled(preferredMicEnabledRef.current);

      const hasVideoTrack = stream.getVideoTracks().length > 0;
      setCameraEnabled(hasVideoTrack);

      // Deterministic polite/impolite peer for perfect negotiation.
      const polite = userId > partnerId;

      const peer = new PeerConnection({
        polite,
        onSignal: sendSignal,
        onRemoteStream: (incomingStream) => {
          setRemoteStream(new MediaStream(incomingStream.getTracks()));
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            setCallState('connected');
          }

          if (state === 'failed') {
            setError('Call connection failed.');
            cleanupCall();
          }
        },
      });

      peerRef.current = peer;

      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });

      setCallState('connecting');

      // Process signaling messages that arrived before the peer existed.
      const pending = pendingSignalsRef.current.splice(
        0,
        pendingSignalsRef.current.length
      );

      for (const message of pending) {
        await peer.handleSignal(message);
      }
    } catch (err) {
      setError(getMediaErrorMessage(err));
      setCallState('error');
      pendingSignalsRef.current = [];
    } finally {
      startingRef.current = false;
    }
  }, [coupleId, userId, partnerId, sendSignal, cleanupCall]);

  // Signal handler
  useEffect(() => {
    handlerRef.current = (message: SignalMessage) => {
      if (message.kind === 'call-end') {
        manualEndedRef.current = true;
        cleanupCall();
        return;
      }

      if (!peerRef.current) {
        const canStart =
          supportedRef.current &&
          nearRef.current &&
          partnerOnlineRef.current &&
          proximityEnabledRef.current &&
          !manualEndedRef.current;

        if (
          canStart &&
          (message.kind === 'description' || message.kind === 'candidate')
        ) {
          pendingSignalsRef.current.push(message);

          if (!startingRef.current && callStateRef.current === 'idle') {
            void startCall();
          }
        }

        return;
      }

      void peerRef.current.handleSignal(message);
    };
  }, [cleanupCall, startCall]);

  // Reset manual end when proximity is lost.
  useEffect(() => {
    if (!near) {
      manualEndedRef.current = false;
    }
  }, [near]);

  // Auto start/end based on proximity.
  useEffect(() => {
    if (!supported || !proximityEnabled || !partnerOnline) {
      if (callStateRef.current !== 'idle') {
        endCall(false);
      }
      return;
    }

    if (near && callStateRef.current === 'idle' && !manualEndedRef.current) {
      void startCall();
    }

    if (!near && callStateRef.current !== 'idle') {
      endCall(false);
    }
  }, [
    near,
    partnerOnline,
    proximityEnabled,
    supported,
    startCall,
    endCall,
  ]);

  // Show unsupported message if near but browser cannot call.
  useEffect(() => {
    if (!supported && near) {
      setError('This browser does not support voice/video calls.');
    }
  }, [supported, near]);

  // Cleanup on page unload.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (peerRef.current) {
        sendSignal({ kind: 'call-end' });
        peerRef.current.close();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sendSignal]);

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];

    if (!track) return;

    const next = !track.enabled;
    track.enabled = next;

    setMicEnabled(next);
    onMicPreferenceChangeRef.current(next);
    refreshLocalStream();
  }, [refreshLocalStream]);

  const toggleCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    const peer = peerRef.current;

    if (!stream || !peer) return;

    const existingVideoTrack = stream.getVideoTracks()[0];

    if (existingVideoTrack && existingVideoTrack.readyState === 'live') {
      const next = !existingVideoTrack.enabled;
      existingVideoTrack.enabled = next;

      setCameraEnabled(next);
      onCameraPreferenceChangeRef.current(next);
      refreshLocalStream();

      return;
    }

    if (existingVideoTrack) {
      stream.removeTrack(existingVideoTrack);
    }

    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      const videoTrack = videoStream.getVideoTracks()[0];

      stream.addTrack(videoTrack);
      peer.addTrack(videoTrack, stream);

      setCameraEnabled(true);
      onCameraPreferenceChangeRef.current(true);
      refreshLocalStream();
    } catch (err) {
      setError(getMediaErrorMessage(err));
      setCameraEnabled(false);
      onCameraPreferenceChangeRef.current(false);
    }
  }, [refreshLocalStream]);

  return {
    supported,
    callState,
    localStream,
    remoteStream,
    micEnabled,
    cameraEnabled,
    error,
    toggleMic,
    toggleCamera,
    endCall,
  };
}