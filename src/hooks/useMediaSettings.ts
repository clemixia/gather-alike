import { useCallback, useState } from 'react';

const MIC_KEY = 'our-tiny-home:mic-enabled';
const CAMERA_KEY = 'our-tiny-home:camera-enabled';

function readBoolean(key: string, fallback: boolean): boolean {
  try {
    const value = localStorage.getItem(key);
    if (value === null) return fallback;
    return value === '1';
  } catch {
    return fallback;
  }
}

function writeBoolean(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // Ignore storage errors.
  }
}

export function useMediaSettings() {
  const [micEnabled, setMicEnabledState] = useState(() =>
    readBoolean(MIC_KEY, true)
  );

  const [cameraEnabled, setCameraEnabledState] = useState(() =>
    readBoolean(CAMERA_KEY, false)
  );

  const setMicEnabled = useCallback((value: boolean) => {
    setMicEnabledState(value);
    writeBoolean(MIC_KEY, value);
  }, []);

  const setCameraEnabled = useCallback((value: boolean) => {
    setCameraEnabledState(value);
    writeBoolean(CAMERA_KEY, value);
  }, []);

  const toggleMic = useCallback(() => {
    setMicEnabledState((prev) => {
      const next = !prev;
      writeBoolean(MIC_KEY, next);
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraEnabledState((prev) => {
      const next = !prev;
      writeBoolean(CAMERA_KEY, next);
      return next;
    });
  }, []);

  return {
    micEnabled,
    cameraEnabled,
    setMicEnabled,
    setCameraEnabled,
    toggleMic,
    toggleCamera,
  };
}