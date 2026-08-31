import { useEffect, useRef, useState } from 'react';
import type { CallState } from '../webrtc/types';

interface CallPanelProps {
  callState: CallState;
  near: boolean;
  supported: boolean;
  partnerName: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  partnerSpeaking: boolean;
  localSpeaking: boolean;
  error: string | null;
  onToggleMic: () => void;
  onToggleCamera: () => void | Promise<void>;
  onEndCall: () => void;
}

function SpeakingBars({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <span className="speaking-indicator">
      <span />
      <span />
      <span />
    </span>
  );
}

function VideoView({
  stream,
  muted = false,
  mirrored = false,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transform: mirrored ? 'scaleX(-1)' : undefined,
        display: 'block',
      }}
    />
  );
}

function useVideoTrackActive(stream: MediaStream | null) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const track = stream?.getVideoTracks()[0];

    if (!track) {
      setActive(false);
      return;
    }

    const update = () => {
      setActive(track.readyState === 'live' && track.enabled);
    };

    update();

    track.addEventListener('mute', update);
    track.addEventListener('unmute', update);
    track.addEventListener('ended', update);

    return () => {
      track.removeEventListener('mute', update);
      track.removeEventListener('unmute', update);
      track.removeEventListener('ended', update);
    };
  }, [stream]);

  return active;
}

export default function CallPanel({
  callState,
  near,
  supported,
  partnerName,
  localStream,
  remoteStream,
  micEnabled,
  cameraEnabled,
  partnerSpeaking,
  localSpeaking,
  error,
  onToggleMic,
  onToggleCamera,
  onEndCall,
}: CallPanelProps) {
  const remoteVideoActive = useVideoTrackActive(remoteStream);
  const localVideoActive = useVideoTrackActive(localStream);

  let statusText = '';

  if (!supported) {
    statusText = 'This browser does not support calls.';
  } else if (callState === 'starting') {
    statusText = 'Preparing microphone…';
  } else if (callState === 'connecting') {
    statusText = 'Connecting…';
  } else if (callState === 'connected') {
    statusText = 'Connected';
  } else if (callState === 'error') {
    statusText = error ?? 'Call error.';
  } else if (near) {
    statusText = 'Starting proximity call…';
  } else {
    statusText = 'Call inactive';
  }

  const showRemoteVideo = callState === 'connected' && remoteVideoActive;
  const showLocalPreview = cameraEnabled && localVideoActive;

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '16px',
        zIndex: 1500,
        width: 'min(320px, calc(100vw - 32px))',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '2px solid var(--border)',
        borderRadius: '20px',
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          background: '#fff0f4',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 700 }}>💕 {partnerName}</span>
          <SpeakingBars active={partnerSpeaking} />
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          {statusText}
        </div>
      </div>

      <div style={{ padding: '12px', display: 'grid', gap: '10px' }}>
        {near && callState === 'idle' && (
          <div className="pill" style={{ justifyContent: 'center' }}>
            💕 You're near each other
          </div>
        )}

        <div
          style={{
            position: 'relative',
            height: '180px',
            borderRadius: '14px',
            overflow: 'hidden',
            background: '#201a1d',
          }}
        >
          {showRemoteVideo ? (
            <VideoView stream={remoteStream} />
          ) : showLocalPreview ? (
            <VideoView stream={localStream} muted mirrored />
          ) : (
            <div
              style={{
                height: '100%',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontSize: '2.5rem',
              }}
            >
              {callState === 'error' ? '⚠️' : '🎙️'}
            </div>
          )}

          {showRemoteVideo && showLocalPreview && (
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                width: '88px',
                height: '64px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '2px solid rgba(255, 255, 255, 0.8)',
              }}
            >
              <VideoView stream={localStream} muted mirrored />
            </div>
          )}

          {callState === 'connected' && partnerSpeaking && (
            <div
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                padding: '4px 8px',
                borderRadius: '999px',
                background: 'rgba(0, 0, 0, 0.45)',
                color: '#fff',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🔊 Speaking
            </div>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
          }}
        >
          <button
            className="button secondary small"
            onClick={onToggleMic}
            disabled={!localStream || !supported}
            style={{ padding: '10px 6px' }}
          >
            {micEnabled
              ? localSpeaking
                ? '🔊 Mic on'
                : '🎙️ Mic on'
              : '🔇 Mic off'}
          </button>

          <button
            className="button secondary small"
            onClick={() => void onToggleCamera()}
            disabled={!localStream || !supported}
            style={{ padding: '10px 6px' }}
          >
            {cameraEnabled ? '📷 Cam on' : '📷 Cam off'}
          </button>

          <button
            className="button danger small"
            onClick={onEndCall}
            style={{ padding: '10px 6px' }}
          >
            ❌ End
          </button>
        </div>
      </div>
    </div>
  );
}