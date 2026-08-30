import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../game/config';
import MainScene, { type MainSceneConfig } from '../game/scenes/MainScene';

export interface GameCanvasHandle {
  getScene: () => MainScene | null;
}

interface GameCanvasProps {
  sceneConfig?: MainSceneConfig;
}

const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(({ sceneConfig }, ref) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneConfigRef = useRef(sceneConfig);
  sceneConfigRef.current = sceneConfig;

  useImperativeHandle(ref, () => ({
    getScene: () => {
      if (!gameRef.current) return null;
      return gameRef.current.scene.getScene('MainScene') as MainScene;
    },
  }));

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      const game = new Phaser.Game({
        ...gameConfig,
        parent: containerRef.current,
      });

      game.events.once('ready', () => {
        console.log('[GameCanvas] game ready, starting MainScene');
        game.scene.start('MainScene', sceneConfigRef.current);
      });

      gameRef.current = game;
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Push config updates to the scene when they change
  useEffect(() => {
    const scene = gameRef.current?.scene.getScene('MainScene') as MainScene | undefined;
    if (scene && sceneConfig) {
      scene.updateConfig(sceneConfig);
    }
  }, [sceneConfig]);

  return (
    <div
      ref={containerRef}
      id="game-container"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  );
});

GameCanvas.displayName = 'GameCanvas';
export default GameCanvas;