import Phaser from 'phaser';
import type { AvatarConfig } from './types';
import type { CompassDirection } from './assets';

// Every trimmed sprite (idle + walk) renders at this exact height.
const AVATAR_HEIGHT = 48;

export class AvatarRenderer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private fallbackRect: Phaser.GameObjects.Rectangle | null = null;

  private currentLook: string;
  private facing: CompassDirection = 'south';
  private lastMoveTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, config: AvatarConfig) {
    this.scene = scene;
    this.container = scene.add.container(x, y);
    this.currentLook = config.look || 'boy';
    this.build();
  }

  private build() {
    this.container.removeAll(true);
    this.sprite = null;
    this.fallbackRect = null;

    const idleKey = `${this.currentLook}-idle-${this.facing}`;
    if (this.scene.textures.exists(idleKey)) {
      this.sprite = this.scene.add.sprite(0, 0, idleKey);
      this.sprite.setOrigin(0.5, 1); // feet = bottom edge of the trimmed sprite
      this.applySize(idleKey);
      this.container.add(this.sprite);
    } else {
      this.fallbackRect = this.scene.add.rectangle(0, -24, 32, 48, 0xff8fab);
      this.container.add(this.fallbackRect);
    }
  }

  /** Scale so the trimmed character always renders at AVATAR_HEIGHT. */
  private applySize(textureKey: string) {
    if (!this.sprite || !this.scene.textures.exists(textureKey)) return;
    const source = this.scene.textures.get(textureKey).source?.[0];
    if (source && source.height > 0) {
      this.sprite.setScale(AVATAR_HEIGHT / source.height);
    }
  }

  updateState(direction: CompassDirection | 'idle', isMoving: boolean) {
    if (direction !== 'idle') this.facing = direction;
    if (isMoving) this.lastMoveTime = this.scene.time.now;
    if (!this.sprite) return;

    const walkKey = `${this.currentLook}-walk-${this.facing}`;
    const idleKey = `${this.currentLook}-idle-${this.facing}`;
    const hasWalk = this.scene.anims.exists(walkKey);
    const inGrace = this.scene.time.now - this.lastMoveTime < 140; // finish the step smoothly

    if (hasWalk && (isMoving || inGrace)) {
      const alreadyPlaying =
        this.sprite.anims.isPlaying && this.sprite.anims.currentAnim?.key === walkKey;
      if (!alreadyPlaying) {
        this.sprite.play(walkKey, true);
        this.sprite.setY(0); // same ground line as idle
        this.applySize(`${this.currentLook}-walk-${this.facing}-0`);
      }
    } else if (this.sprite.anims.isPlaying || this.sprite.texture.key !== idleKey) {
      this.sprite.stop();
      this.sprite.setTexture(idleKey);
      this.sprite.setFrame(0);
      this.sprite.setY(0);
      this.applySize(idleKey);
    }
  }

  update(config: AvatarConfig) {
    if (config.look && config.look !== this.currentLook) {
      this.currentLook = config.look;
      this.build();
    }
  }

  setPosition(x: number, y: number) { this.container.setPosition(x, y); }
  setDepth(depth: number) { this.container.setDepth(depth); }
  destroy() { this.container.destroy(); }
  getContainer() { return this.container; }
}