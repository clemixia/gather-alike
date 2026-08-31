import type { CallState } from '../webrtc/types';

interface MediaControlsProps {
  supported: boolean;
  callState: CallState;
  micEnabled: boolean;
  cameraEnabled: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
}

export default function MediaControls({
  supported,
  callState,
  micEnabled,
  cameraEnabled,
  onToggleMic,
  onToggleCamera,
}: MediaControlsProps) {
  const callLabel =
    callState === 'connected'
      ? '📞 Call'
      : callState === 'connecting'
        ? '📞 Connecting…'
        : callState === 'starting'
          ? '📞 Starting…'
          : callState === 'error'
            ? '⚠️ Call error'
            : '🎛️ Media settings';

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        border: '2px solid var(--border)',
        borderRadius: '999px',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div
        style={{
          fontSize: '0.85rem',
          fontWeight: 700,
          color: 'var(--muted)',
          paddingLeft: '8px',
        }}
      >
        {callLabel}
      </div>

      <button
        type="button"
        title={micEnabled ? 'Microphone is on' : 'Microphone is off'}
        onClick={onToggleMic}
        disabled={!supported}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: micEnabled ? '2px solid var(--accent)' : '2px solid var(--border)',
          background: micEnabled ? '#fff' : '#ffe0e6',
          fontSize: '1.25rem',
          cursor: supported ? 'pointer' : 'not-allowed',
          opacity: supported ? 1 : 0.5,
        }}
      >
        {micEnabled ? '🎙️' : '🔇'}
      </button>

      <button
        type="button"
        title={cameraEnabled ? 'Camera is on' : 'Camera is off'}
        onClick={onToggleCamera}
        disabled={!supported}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: cameraEnabled ? '2px solid var(--accent)' : '2px solid var(--border)',
          background: cameraEnabled ? '#fff' : '#ffe0e6',
          fontSize: '1.25rem',
          cursor: supported ? 'pointer' : 'not-allowed',
          opacity: supported ? 1 : 0.5,
        }}
      >
        {cameraEnabled ? '🎥' : '🚫'}
      </button>
    </div>
  );
}