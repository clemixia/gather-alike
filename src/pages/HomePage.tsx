import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useCouple } from '../hooks/useCouple';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { useAvatar } from '../hooks/useAvatar';
import { useChat } from '../hooks/useChat';
import { useActions, type ActionEvent } from '../hooks/useActions';
import { usePresence } from '../hooks/usePresence';
import { useFurniture } from '../hooks/useFurniture';
import { useProximity, type LocalPosition } from '../hooks/useProximity';
import { useCall } from '../hooks/useCall';
import { isSupabaseConfigured } from '../lib/env';
import GameCanvas, { type GameCanvasHandle } from '../components/GameCanvas';
import AvatarCustomizer from '../components/AvatarCustomizer';
import ChatPanel from '../components/ChatPanel';
import EmojiPicker from '../components/EmojiPicker';
import ActionBar from '../components/ActionBar';
import FurnitureCatalog from '../components/FurnitureCatalog';
import CallPanel from '../components/CallPanel';
import type { Room } from '../game/rooms';
import type { PlayerPosition } from '../hooks/useMultiplayer';
import type { FurnitureType } from '../game/furniture';
import { useSpeakingIndicator } from '../hooks/useSpeakingIndicator';
import { useMediaSettings } from '../hooks/useMediaSettings';
import MediaControls from '../components/MediaControls';
import { getHouseLayout, findFreeSpot } from '../game/layouts';


export default function HomePage() {
  const { session, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading } = useProfile(session?.user?.id ?? null);
  const { couple, loading: coupleLoading } = useCouple(session?.user?.id ?? null);
  const { avatar, loading: avatarLoading, saveAvatar } = useAvatar(session?.user?.id ?? null);
  const { profile: partnerProfile } = useProfile(couple?.partner_id ?? null);

  const gameRef = useRef<GameCanvasHandle>(null);
  const localPositionRef = useRef<LocalPosition | null>(null);

  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [proximityEnabled] = useState(true);
  const {
    micEnabled: micPreference,
    cameraEnabled: cameraPreference,
    setMicEnabled: setMicPreference,
    setCameraEnabled: setCameraPreference,
  } = useMediaSettings();

  const navigate = useNavigate();
  const currentLayout = getHouseLayout(couple?.layout_id);

  const { remotePlayers, partnerOnline, sendPosition, sendAvatarUpdate } = useMultiplayer(
    couple?.couple_id ?? null,
    session?.user?.id ?? null
  );

  const { messages, unreadCount, sendMessage, markAsRead } = useChat(
    couple?.couple_id ?? null,
    session?.user?.id ?? null
  );

  const { partnerStatus, markActive } = usePresence(
    couple?.couple_id ?? null,
    session?.user?.id ?? null
  );

  const { furniture, addFurniture, moveFurniture, rotateFurniture, deleteFurniture } =
    useFurniture(couple?.house_id ?? null, session?.user?.id ?? null);

  const near = useProximity({
    localPositionRef,
    remotePlayers,
    partnerId: couple?.partner_id ?? null,
    partnerOnline,
    enabled: proximityEnabled && sceneReady,
  });

    const {
    supported: webrtcSupported,
    callState,
    localStream,
    remoteStream,
    micEnabled,
    cameraEnabled,
    error: callError,
    toggleMic,
    toggleCamera,
    endCall,
  } = useCall({
    coupleId: couple?.couple_id ?? null,
    userId: session?.user?.id ?? null,
    partnerId: couple?.partner_id ?? null,
    partnerOnline,
    near,
    proximityEnabled,
    preferredMicEnabled: micPreference,
    preferredCameraEnabled: cameraPreference,
    onMicPreferenceChange: setMicPreference,
    onCameraPreferenceChange: setCameraPreference,
  });

  const partnerSpeaking = useSpeakingIndicator(remoteStream, callState === 'connected');
  const localSpeaking = useSpeakingIndicator(localStream, Boolean(localStream) && micEnabled);

    async function handleToggleMic() {
    if (localStream) {
      toggleMic();
      return;
    }

    const next = !micPreference;
    setMicPreference(next);

    // If turning mic on outside a call, request permission early.
    if (next && webrtcSupported) {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach((track) => track.stop());
      } catch {
        setMicPreference(false);
      }
    }
  }

  async function handleToggleCamera() {
    if (localStream) {
      await toggleCamera();
      return;
    }

    const next = !cameraPreference;
    setCameraPreference(next);

    // If turning camera on outside a call, request permission early.
    if (next && webrtcSupported) {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        tempStream.getTracks().forEach((track) => track.stop());
      } catch {
        setCameraPreference(false);
      }
    }
  }

  // Handle incoming reactions/waves
  const handleAction = useCallback(
    (action: ActionEvent) => {
      if (!sceneReady) return;
      const scene = gameRef.current?.getScene();
      if (!scene) return;

      if (action.type === 'reaction') {
        scene.showFloatingEmoji(action.userId, action.emoji);
      } else if (action.type === 'wave') {
        scene.showWave(action.userId);
      }
    },
    [sceneReady]
  );

  const { sendReaction, sendWave } = useActions(
    couple?.couple_id ?? null,
    session?.user?.id ?? null,
    handleAction
  );

  // Sync furniture to scene
  useEffect(() => {
    if (!sceneReady) return;
    const scene = gameRef.current?.getScene();
    scene?.setFurniture(furniture);
  }, [furniture, sceneReady]);

  // Sync edit mode to scene
  useEffect(() => {
    if (!sceneReady) return;
    const scene = gameRef.current?.getScene();
    scene?.setEditMode(editMode);
  }, [editMode, sceneReady]);

  // Poll for selected furniture
  useEffect(() => {
    if (!sceneReady || !editMode) return;

    const interval = setInterval(() => {
      const scene = gameRef.current?.getScene();
      if (scene) {
        setSelectedFurnitureId(scene.getSelectedFurnitureId());
      }
    }, 100);

    return () => clearInterval(interval);
  }, [sceneReady, editMode]);

  // Mark activity on user interactions
  useEffect(() => {
    const handleActivity = () => markActive();

    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('click', handleActivity);

    return () => {
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [markActive]);

  // Sync remote players to scene
  useEffect(() => {
    if (!sceneReady) return;
    const scene = gameRef.current?.getScene();
    if (!scene) return;

    remotePlayers.forEach((pos, userId) => {
      scene.setRemotePlayer(userId, pos);
    });
  }, [remotePlayers, sceneReady]);

  useEffect(() => {
    if (!sceneReady) return;

    if (!partnerOnline) {
      const scene = gameRef.current?.getScene();
      scene?.clearRemotePlayers();
    }
  }, [partnerOnline, sceneReady]);

  useEffect(() => {
    if (!sceneReady) return;
    const scene = gameRef.current?.getScene();
    scene?.updateLocalAvatar(avatar);
  }, [avatar, sceneReady]);

    useEffect(() => {
    if (!sceneReady) return;
    const scene = gameRef.current?.getScene();
    scene?.setPartnerSpeaking(partnerSpeaking);
  }, [partnerSpeaking, sceneReady]);

  if (!isSupabaseConfigured()) {
    return (
      <main className="page">
        <section className="card">
          <h2>Supabase not configured</h2>
          <p className="muted">Add Supabase environment variables.</p>
        </section>
      </main>
    );
  }

  if (authLoading || profileLoading || coupleLoading || avatarLoading) {
    return (
      <main className="page">
        <section className="card">
          <p className="muted">Preparing your home… 💕</p>
        </section>
      </main>
    );
  }

    // Only redirect if we are 100% sure there is no session or no couple
  if (!session || !couple) {
  console.log('🔴 [HomePage] REDIRECTING:', {
    hasSession: Boolean(session),
    hasCouple: Boolean(couple),
    coupleLoading,
    authLoading,
    profileLoading,
    avatarLoading,
  });
  return <Navigate to={!session ? '/login' : '/couple/setup'} replace />;
}

  const sceneConfig = {
    avatar,
    layout: currentLayout,
    onPositionUpdate: (pos: Omit<PlayerPosition, 'userId'>) => {
      localPositionRef.current = {
        x: pos.x,
        y: pos.y,
        room: pos.room,
      };

      sendPosition({ ...pos, avatar });
      markActive();
    },
    onRoomChange: (room: Room | null) => {
      setCurrentRoom(room);
    },
    onReady: () => setSceneReady(true),
    onFurnitureMove: (id: string, x: number, y: number) => {
      moveFurniture(id, x, y);
    },
  };

  async function handleSaveAvatar(config: typeof avatar) {
    const ok = await saveAvatar(config);
    if (ok) sendAvatarUpdate(config);
    return ok;
  }

  function handleFurnitureSelect(type: FurnitureType) {
  const pos = localPositionRef.current;
  const rawX = pos ? pos.x + 50 : 400;
  const rawY = pos ? pos.y : 300;
  const spot = findFreeSpot(currentLayout, rawX, rawY, type.width, type.height);
  addFurniture(type.id, spot.x, spot.y);
}

  function handleRotateSelected() {
    if (!selectedFurnitureId) return;

    const item = furniture.find((f) => f.id === selectedFurnitureId);
    if (!item) return;

    rotateFurniture(selectedFurnitureId, (item.rotation + 90) % 360);
  }

  function handleDeleteSelected() {
    if (!selectedFurnitureId) return;

    deleteFurniture(selectedFurnitureId);
    setSelectedFurnitureId(null);

    const scene = gameRef.current?.getScene();
    scene?.clearFurnitureSelection();
  }

  const statusInfo = partnerOnline
    ? partnerStatus === 'away'
      ? { label: '🌙 Partner: Away', color: '#d4a017' }
      : { label: '💕 Partner: Online', color: 'var(--success)' }
    : { label: '💤 Partner: Offline', color: 'var(--muted)' };

  const partnerName =
    partnerProfile?.display_name ??
    remotePlayers.get(couple.partner_id ?? '')?.avatar?.name ??
    'Partner';

  const showCallPanel = Boolean(couple.partner_id) && (near || callState !== 'idle');

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#fff7f8' }}>
      <GameCanvas ref={gameRef} sceneConfig={sceneConfig} />

      {/* Top-right controls */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 1000,
            display: 'flex',
            gap: '8px',
          }}
        >
          {/* ← NEW BUTTON */}
          <button
            className="button secondary small"
            onClick={() => navigate('/house-selection')}
            style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)' }}
          >
            🏠 House
          </button>
          
          <button
            className="button secondary small"
            onClick={() => setShowCustomizer(true)}
            style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)' }}
          >
            ✨ Customize
          </button>
          <button
            className="button secondary small"
            onClick={() => void signOut()}
            style={{ background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)' }}
          >
            Log out
          </button>
        </div>

      {/* Top-left: couple info + partner status */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '2px solid var(--border)',
        }}
      >
        <p style={{ margin: 0, fontWeight: 700 }}>🏠 {couple.couple_name}</p>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: 'var(--muted)' }}>
          {profile?.display_name}
        </p>
        <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: statusInfo.color }}>
          {statusInfo.label}
        </p>
      </div>

      {/* Bottom-left: current room */}
      <div
        style={{
          position: 'absolute',
          bottom: '80px',
          left: '16px',
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          padding: '10px 14px',
          borderRadius: '12px',
          border: '2px solid var(--border)',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>You are in</p>
        <p style={{ margin: '2px 0 0 0', fontWeight: 700, fontSize: '0.95rem' }}>
          {currentRoom?.name ?? '🏠 Home'}
        </p>
      </div>

      {/* Edit mode controls */}
      {editMode && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            padding: '8px',
            borderRadius: '999px',
            border: '2px solid var(--accent)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <button
            className="button small"
            onClick={() => setCatalogOpen(true)}
            style={{ padding: '8px 14px' }}
          >
            🪑 Add Furniture
          </button>

          {selectedFurnitureId && (
            <>
              <button
                className="button secondary small"
                onClick={handleRotateSelected}
                style={{ padding: '8px 14px' }}
              >
                🔄 Rotate
              </button>
              <button
                className="button danger small"
                onClick={handleDeleteSelected}
                style={{ padding: '8px 14px' }}
              >
                🗑️ Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Media controls */}
      <MediaControls
        supported={webrtcSupported}
        callState={callState}
        micEnabled={micPreference}
        cameraEnabled={cameraPreference}
        onToggleMic={() => void handleToggleMic()}
        onToggleCamera={() => void handleToggleCamera()}
      />

      {/* Action bar */}
      <ActionBar
        chatOpen={chatOpen}
        unreadCount={unreadCount}
        editMode={editMode}
        onToggleChat={() => setChatOpen((o) => !o)}
        onWave={sendWave}
        onOpenEmoji={() => setEmojiOpen(true)}
        onToggleEdit={() => setEditMode((e) => !e)}
      />

            {/* Call panel */}
      {showCallPanel && (
        <CallPanel
          callState={callState}
          near={near}
          supported={webrtcSupported}
          partnerName={partnerName}
          localStream={localStream}
          remoteStream={remoteStream}
          micEnabled={micEnabled}
          cameraEnabled={cameraEnabled}
          partnerSpeaking={partnerSpeaking}
          localSpeaking={localSpeaking}
          error={callError}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onEndCall={() => endCall(true)}
        />
      )}

      {/* Chat panel */}
      {chatOpen && (
        <ChatPanel
          messages={messages}
          userId={session.user.id}
          partnerName={partnerName}
          onSend={sendMessage}
          onMarkRead={markAsRead}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Emoji picker */}
      {emojiOpen && (
        <EmojiPicker
          onSelect={sendReaction}
          onClose={() => setEmojiOpen(false)}
        />
      )}

      {/* Furniture catalog */}
      {catalogOpen && (
        <FurnitureCatalog
          onSelect={handleFurnitureSelect}
          onClose={() => setCatalogOpen(false)}
        />
      )}

      {/* Avatar customizer */}
      {showCustomizer && (
        <AvatarCustomizer
          initial={avatar}
          onSave={handleSaveAvatar}
          onClose={() => setShowCustomizer(false)}
        />
      )}
    </div>
  );
}