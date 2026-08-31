import { useEffect, useRef, useState } from 'react';

export function useSpeakingIndicator(stream: MediaStream | null, enabled: boolean) {
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);

  useEffect(() => {
    if (!stream || !enabled) {
      if (speakingRef.current) {
        speakingRef.current = false;
        setSpeaking(false);
      }
      return;
    }

    const audioTrack = stream.getAudioTracks()[0];

    if (!audioTrack) {
      setSpeaking(false);
      return;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as any).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();

    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.3;

    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    let raf = 0;
    let quietFrames = 0;

    const resume = () => {
      if (context.state === 'suspended') {
        context.resume().catch(() => {});
      }
    };

    const tick = () => {
      if (context.state === 'running') {
        if (!audioTrack.enabled || audioTrack.readyState !== 'live') {
          quietFrames++;
          if (quietFrames > 15 && speakingRef.current) {
            speakingRef.current = false;
            setSpeaking(false);
          }
        } else {
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }

          const average = sum / dataArray.length;
          const level = average / 255;

          // Tune this if the indicator is too sensitive or not sensitive enough.
          const isAboveThreshold = level > 0.08;

          if (isAboveThreshold) {
            quietFrames = 0;

            if (!speakingRef.current) {
              speakingRef.current = true;
              setSpeaking(true);
            }
          } else {
            quietFrames++;

            if (quietFrames > 15 && speakingRef.current) {
              speakingRef.current = false;
              setSpeaking(false);
            }
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    resume();
    window.addEventListener('pointerdown', resume);
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerdown', resume);
      source.disconnect();
      analyser.disconnect();
      context.close().catch(() => {});
      speakingRef.current = false;
      setSpeaking(false);
    };
  }, [stream, enabled]);

  return speaking;
}