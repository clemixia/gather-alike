// src/game/scenes/MainScene.ts
import Phaser from 'phaser';
import { getRoomAtPosition, type Room } from '../rooms';
import type { PlayerPosition } from '../../hooks/useMultiplayer';
import type { AvatarConfig } from '../types';
import { AvatarRenderer } from '../AvatarRenderer';
import { DEFAULT_AVATAR } from '../types';
import { getFurnitureType, type FurnitureInstance } from '../furniture';
import { getHouseLayout, type HouseLayout, findFreeSpot } from '../layouts';


export interface MainSceneConfig {
  avatar?: AvatarConfig;
  layout?: HouseLayout;
  onPositionUpdate?: (pos: Omit<PlayerPosition, 'userId'>) => void;
  onRoomChange?: (room: Room | null) => void;
  onReady?: () => void;
  onFurnitureMove?: (id: string, x: number, y: number) => void;
}

interface RemotePlayer {
  avatar: AvatarRenderer;
  nameText: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
  currentAvatar: AvatarConfig;
}

export default class MainScene extends Phaser.Scene {
  // Player
  private localAvatar!: AvatarRenderer;
  private localNameText!: Phaser.GameObjects.Text;
  private localPhysicsBody!: Phaser.GameObjects.Rectangle;
  private localAvatarConfig: AvatarConfig = DEFAULT_AVATAR;
  private currentDirection: PlayerPosition['direction'] = 'idle';
  private speed = 200;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  // World
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private currentRoom: Room | null = null;
  private currentLayout: HouseLayout | null = null;

  // Remote players
  private remotePlayers = new Map<string, RemotePlayer>();

  // Furniture
  private furnitureSprites = new Map<string, Phaser.GameObjects.Container>();
  private furnitureBodies!: Phaser.Physics.Arcade.StaticGroup;
  private furnitureCollider!: Phaser.Physics.Arcade.Collider;
  private editMode = false;
  private draggingFurniture: { id: string; startX: number; startY: number } | null = null;
  private selectedFurnitureId: string | null = null;
  private selectionIndicator: Phaser.GameObjects.Rectangle | null = null;
  private partnerSpeaking = false;
  private speakingIndicator: Phaser.GameObjects.Text | null = null;

  // Broadcast throttling
  private lastBroadcastTime = 0;
  private lastBroadcastX = 0;
  private lastBroadcastY = 0;
  private broadcastInterval = 100;
  private minMovement = 2;

  // Callbacks
  private callbacksRef: {
    onPositionUpdate?: MainSceneConfig['onPositionUpdate'];
    onRoomChange?: MainSceneConfig['onRoomChange'];
    onReady?: MainSceneConfig['onReady'];
    onFurnitureMove?: MainSceneConfig['onFurnitureMove'];
  } = {};

  constructor() {
    super({ key: 'MainScene' });
  }

  init(data: MainSceneConfig) {
    this.callbacksRef.onPositionUpdate = data.onPositionUpdate;
    this.callbacksRef.onRoomChange = data.onRoomChange;
    this.callbacksRef.onReady = data.onReady;
    this.callbacksRef.onFurnitureMove = data.onFurnitureMove;
    this.localAvatarConfig = data.avatar ?? DEFAULT_AVATAR;
    this.currentLayout = data.layout ?? getHouseLayout(null);
  }

  public updateConfig(config: MainSceneConfig) {
    this.callbacksRef.onPositionUpdate = config.onPositionUpdate;
    this.callbacksRef.onRoomChange = config.onRoomChange;
    this.callbacksRef.onReady = config.onReady;
    this.callbacksRef.onFurnitureMove = config.onFurnitureMove;

    if (config.avatar) {
      this.localAvatarConfig = config.avatar;
      if (this.localAvatar) {
        this.localAvatar.update(config.avatar);
        this.localNameText.setText(config.avatar.name);
      }
    }

    // Handle layout change (user switched house)
    if (config.layout && config.layout.id !== this.currentLayout?.id) {
      this.currentLayout = config.layout;
      this.rebuildWorld();
    }
  }

  create() {
    const layout = this.currentLayout ?? getHouseLayout(null);

    // ─── Floor ───
    this.add.rectangle(
      layout.width / 2,
      layout.height / 2,
      layout.width,
      layout.height,
      layout.floorColor
    );

    // ─── Room labels ───
    for (const room of layout.rooms) {
      if (room.emoji) {
        const cx = room.bounds.x + room.bounds.width / 2;
        const cy = room.bounds.y + room.bounds.height / 2;
        this.add.text(cx, cy, room.emoji, { fontSize: '32px' })
          .setOrigin(0.5)
          .setAlpha(0.4);
      }
    }

    // ─── Walls ───
    this.walls = this.physics.add.staticGroup();
    for (const wall of layout.walls) {
      const wallRect = this.add.rectangle(wall.x, wall.y, wall.w, wall.h, layout.wallColor);
      this.walls.add(wallRect);
    }

    // ─── Local player avatar ───
    const spawnX = layout.spawn.x;
    const spawnY = layout.spawn.y;

    this.localAvatar = new AvatarRenderer(this, spawnX, spawnY, this.localAvatarConfig);
    this.localNameText = this.add
      .text(spawnX, spawnY - 28, this.localAvatarConfig.name, {
        fontSize: '12px',
        color: '#5b4650',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Physics body (invisible)
    this.localPhysicsBody = this.add.rectangle(spawnX, spawnY, 20, 20, 0x000000, 0);
    this.physics.world.enable(this.localPhysicsBody);
    (this.localPhysicsBody.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
    this.physics.add.collider(this.localPhysicsBody, this.walls);

    // ─── Camera ───
    this.cameras.main.setBounds(0, 0, layout.width, layout.height);
    this.cameras.main.startFollow(this.localPhysicsBody, true, 0.1, 0.1);

    // ─── Input ───
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
      }) as any;
    }

    // ─── Furniture drag handlers (scene-level) ───
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.editMode) return;
      const hitId = this.findFurnitureAt(pointer.worldX, pointer.worldY);
      if (hitId) {
        this.selectFurniture(hitId);
        const sprite = this.furnitureSprites.get(hitId);
        if (sprite) {
          this.draggingFurniture = {
            id: hitId,
            startX: pointer.worldX - sprite.x,
            startY: pointer.worldY - sprite.y,
          };
        }
      } else {
        this.clearSelection();
      }
    });

    this.input.on('pointerup', () => {
  if (this.draggingFurniture) {
    const sprite = this.furnitureSprites.get(this.draggingFurniture.id);
    if (sprite) {
      const spot = this.resolveFurnitureDrop(sprite, sprite.x, sprite.y);
      sprite.setPosition(spot.x, spot.y);
      if (this.selectionIndicator) {
        this.selectionIndicator.setPosition(spot.x, spot.y);
      }
      this.callbacksRef.onFurnitureMove?.(this.draggingFurniture.id, spot.x, spot.y);
    }
    this.draggingFurniture = null;
    this.rebuildFurnitureCollision();
  }
});

    this.updateRoom();

    // Send initial position AND notify React that scene is ready
    this.time.delayedCall(400, () => {
      this.callbacksRef.onReady?.();
      this.broadcastPosition(true);
    });
  }

  // ─── Rebuild world when layout changes ───
  private rebuildWorld() {
    // Clear everything and restart the scene with new layout
    this.scene.restart({
      avatar: this.localAvatarConfig,
      layout: this.currentLayout,
      onPositionUpdate: this.callbacksRef.onPositionUpdate,
      onRoomChange: this.callbacksRef.onRoomChange,
      onReady: this.callbacksRef.onReady,
      onFurnitureMove: this.callbacksRef.onFurnitureMove,
    });
  }

  update(_time: number, delta: number) {
    const body = this.localPhysicsBody.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);

    let vx = 0;
    let vy = 0;

    if (this.cursors.left?.isDown || this.wasd.A.isDown) {
      vx = -this.speed;
      this.currentDirection = 'left';
    } else if (this.cursors.right?.isDown || this.wasd.D.isDown) {
      vx = this.speed;
      this.currentDirection = 'right';
    }

    if (this.cursors.up?.isDown || this.wasd.W.isDown) {
      vy = -this.speed;
      this.currentDirection = 'up';
    } else if (this.cursors.down?.isDown || this.wasd.S.isDown) {
      vy = this.speed;
      this.currentDirection = 'down';
    }

    if (vx === 0 && vy === 0) {
      this.currentDirection = 'idle';
    }

    if (vx !== 0 && vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx = (vx / len) * this.speed;
      vy = (vy / len) * this.speed;
    }

    body.setVelocity(vx, vy);

    // Sync avatar position with physics body
    this.localAvatar.setPosition(this.localPhysicsBody.x, this.localPhysicsBody.y);
    this.localNameText.setPosition(this.localPhysicsBody.x, this.localPhysicsBody.y - 28);

    // Throttled broadcast
    const now = _time;
    const dx = this.localPhysicsBody.x - this.lastBroadcastX;
    const dy = this.localPhysicsBody.y - this.lastBroadcastY;
    const moved = Math.abs(dx) > this.minMovement || Math.abs(dy) > this.minMovement;

    if (now - this.lastBroadcastTime > this.broadcastInterval && moved) {
      this.broadcastPosition(false);
    }

    // Handle furniture dragging
    if (this.draggingFurniture) {
      const sprite = this.furnitureSprites.get(this.draggingFurniture.id);
      if (sprite && this.input.activePointer.isDown) {
        const newX = this.input.activePointer.worldX - this.draggingFurniture.startX;
        const newY = this.input.activePointer.worldY - this.draggingFurniture.startY;
        sprite.setPosition(newX, newY);
        if (this.selectionIndicator) {
          this.selectionIndicator.setPosition(newX, newY);
        }
      }  else if (!this.input.activePointer.isDown) {
          if (sprite) {
            const spot = this.resolveFurnitureDrop(sprite, sprite.x, sprite.y);
            sprite.setPosition(spot.x, spot.y);
            if (this.selectionIndicator) {
              this.selectionIndicator.setPosition(spot.x, spot.y);
            }
            this.callbacksRef.onFurnitureMove?.(this.draggingFurniture.id, spot.x, spot.y);
          }
          this.draggingFurniture = null;
          this.rebuildFurnitureCollision();
        }
    }

    this.updateRoom();

    // Interpolate remote players
    this.remotePlayers.forEach((rp) => {
      const lerpFactor = Math.min(1, (delta / 100) * 0.6);
      const newX = rp.avatar.getContainer().x + (rp.targetX - rp.avatar.getContainer().x) * lerpFactor;
      const newY = rp.avatar.getContainer().y + (rp.targetY - rp.avatar.getContainer().y) * lerpFactor;
      rp.avatar.setPosition(newX, newY);
      rp.nameText?.setPosition(newX, newY - 28);
    });

    // Speaking indicator above partner avatar
    const firstRemote = this.remotePlayers.values().next().value;
    if (this.partnerSpeaking && firstRemote) {
      if (!this.speakingIndicator) {
        this.speakingIndicator = this.add
          .text(0, 0, '🔊', { fontSize: '18px' })
          .setOrigin(0.5)
          .setDepth(1000);
      }
      const indicatorX = firstRemote.avatar.getContainer().x + 18;
      const indicatorY = firstRemote.avatar.getContainer().y - 34;
      const pulse = 1 + Math.sin(_time / 120) * 0.18;
      this.speakingIndicator.setPosition(indicatorX, indicatorY);
      this.speakingIndicator.setScale(pulse);
    } else if (this.speakingIndicator) {
      this.speakingIndicator.destroy();
      this.speakingIndicator = null;
    }
  }

  private broadcastPosition(_force: boolean) {
    this.lastBroadcastTime = this.time.now;
    this.lastBroadcastX = this.localPhysicsBody.x;
    this.lastBroadcastY = this.localPhysicsBody.y;

    const payload = {
      x: this.localPhysicsBody.x,
      y: this.localPhysicsBody.y,
      room: this.currentRoom?.id ?? null,
      direction: this.currentDirection,
      avatar: this.localAvatarConfig,
    };

    this.callbacksRef.onPositionUpdate?.(payload);
  }

  private resolveFurnitureDrop(
  sprite: Phaser.GameObjects.Container,
  x: number,
  y: number
): { x: number; y: number } {
  if (!this.currentLayout) return { x, y };
  const w = (sprite.getData('width') as number) ?? 32;
  const h = (sprite.getData('height') as number) ?? 32;
  return findFreeSpot(this.currentLayout, x, y, w, h);
}

  private updateRoom() {
    if (!this.currentLayout) return;
    const room = getRoomAtPosition(
      this.localPhysicsBody.x,
      this.localPhysicsBody.y,
      this.currentLayout.rooms
    );
    if (room?.id !== this.currentRoom?.id) {
      this.currentRoom = room;
      this.callbacksRef.onRoomChange?.(room);
    }
  }

  // ─── Remote Players ───
  public setRemotePlayer(userId: string, pos: PlayerPosition) {
    let rp = this.remotePlayers.get(userId);
    if (!rp) {
      const avatar = new AvatarRenderer(this, pos.x, pos.y, pos.avatar ?? DEFAULT_AVATAR);
      const nameText = this.add
        .text(pos.x, pos.y - 28, pos.avatar?.name ?? '💕', {
          fontSize: '12px',
          color: '#5b4650',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      rp = {
        avatar,
        nameText,
        targetX: pos.x,
        targetY: pos.y,
        currentAvatar: pos.avatar ?? DEFAULT_AVATAR,
      };
      this.remotePlayers.set(userId, rp);
    } else {
      rp.targetX = pos.x;
      rp.targetY = pos.y;
      if (pos.avatar && !avatarsEqual(pos.avatar, rp.currentAvatar)) {
        rp.avatar.update(pos.avatar);
        rp.currentAvatar = pos.avatar;
        rp.nameText.setText(pos.avatar.name ?? '💕');
      }
    }
  }

  public removeRemotePlayer(userId: string) {
    const rp = this.remotePlayers.get(userId);
    if (rp) {
      rp.avatar.destroy();
      rp.nameText.destroy();
      this.remotePlayers.delete(userId);
    }
    if (this.remotePlayers.size === 0 && this.speakingIndicator) {
      this.speakingIndicator.destroy();
      this.speakingIndicator = null;
    }
  }

  public clearRemotePlayers() {
    this.remotePlayers.forEach((rp) => {
      rp.avatar.destroy();
      rp.nameText.destroy();
    });
    this.remotePlayers.clear();
    if (this.speakingIndicator) {
      this.speakingIndicator.destroy();
      this.speakingIndicator = null;
    }
  }

  // ─── Local Avatar ───
  public updateLocalAvatar(config: AvatarConfig) {
    this.localAvatarConfig = config;
    if (this.localAvatar) {
      this.localAvatar.update(config);
      this.localNameText.setText(config.name);
    }
  }

  // ─── Floating Emoji / Wave ───
  public showFloatingEmoji(userId: string, emoji: string) {
    let x: number, y: number;
    const rp = this.remotePlayers.get(userId);
    if (rp) {
      x = rp.avatar.getContainer().x;
      y = rp.avatar.getContainer().y;
    } else {
      x = this.localPhysicsBody.x;
      y = this.localPhysicsBody.y;
    }

    const text = this.add.text(x, y - 40, emoji, { fontSize: '32px' })
      .setOrigin(0.5)
      .setDepth(1000);

    this.tweens.add({
      targets: text,
      y: y - 100,
      alpha: 0,
      scale: 1.5,
      duration: 2000,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  public showWave(userId: string) {
    let x: number, y: number;
    const rp = this.remotePlayers.get(userId);
    if (rp) {
      x = rp.avatar.getContainer().x;
      y = rp.avatar.getContainer().y;
    } else {
      x = this.localPhysicsBody.x;
      y = this.localPhysicsBody.y;
    }

    const text = this.add.text(x + 16, y - 30, '👋', { fontSize: '28px' })
      .setOrigin(0.5)
      .setDepth(1000);

    this.tweens.add({
      targets: text,
      angle: { from: -15, to: 15 },
      duration: 200,
      yoyo: true,
      repeat: 4,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      delay: 1200,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  // ─── Furniture ───
  public setEditMode(enabled: boolean) {
    this.editMode = enabled;
    if (!enabled) {
      this.clearSelection();
    }
  }

  public setFurniture(items: FurnitureInstance[]) {
    const currentIds = new Set(items.map((f) => f.id));
    for (const [id, sprite] of this.furnitureSprites.entries()) {
      if (!currentIds.has(id)) {
        sprite.destroy();
        this.furnitureSprites.delete(id);
      }
    }

    for (const item of items) {
      let sprite = this.furnitureSprites.get(item.id);
      if (!sprite) {
        sprite = this.createFurnitureSprite(item);
        this.furnitureSprites.set(item.id, sprite);
      } else {
        this.updateFurnitureSprite(sprite, item);
      }
    }

    this.rebuildFurnitureCollision();
  }

  private createFurnitureSprite(item: FurnitureInstance): Phaser.GameObjects.Container {
    const type = getFurnitureType(item.type);

    if (!type) {
      const container = this.add.container(item.x, item.y);
      const text = this.add.text(0, 0, '?', { fontSize: '32px' }).setOrigin(0.5);
      container.add([text]);
      container.setDepth(5);
      container.setData('type', item.type);
      container.setData('furnitureId', item.id);
      container.setData('width', 32);
      container.setData('height', 32);
      return container;
    }

    const container = this.add.container(item.x, item.y);
    container.setData('type', item.type);
    container.setData('furnitureId', item.id);
    container.setData('width', type.width);
    container.setData('height', type.height);

    const shadow = this.add.rectangle(0, 2, type.width, type.height, 0x000000, 0.08);
    shadow.setStrokeStyle(1, 0x000000, 0.1);
    container.add(shadow);

    const emojiSize = Math.min(type.width, type.height) * 1.2;
    const emoji = this.add.text(0, 0, type.emoji, {
      fontSize: `${emojiSize}px`,
      align: 'center',
    }).setOrigin(0.5);

    container.add(emoji);
    container.setRotation((item.rotation * Math.PI) / 180);
    container.setDepth(5);

    return container;
  }

  private updateFurnitureSprite(sprite: Phaser.GameObjects.Container, item: FurnitureInstance) {
    if (this.draggingFurniture?.id === item.id) return;
    sprite.setPosition(item.x, item.y);
    sprite.setRotation((item.rotation * Math.PI) / 180);
  }

  private selectFurniture(id: string) {
    this.clearSelection();
    this.selectedFurnitureId = id;

    const sprite = this.furnitureSprites.get(id);
    if (sprite) {
      const w = (sprite.getData('width') as number) ?? 32;
      const h = (sprite.getData('height') as number) ?? 32;

      this.selectionIndicator = this.add.rectangle(
        sprite.x,
        sprite.y,
        w + 8,
        h + 8
      );
      this.selectionIndicator.setStrokeStyle(2, 0xff8fab);
      this.selectionIndicator.setFillStyle(0xff8fab, 0.1);
      this.selectionIndicator.setDepth(4);
    }
  }

  private clearSelection() {
    this.selectedFurnitureId = null;
    if (this.selectionIndicator) {
      this.selectionIndicator.destroy();
      this.selectionIndicator = null;
    }
  }

  private findFurnitureAt(x: number, y: number): string | null {
    for (const [id, sprite] of this.furnitureSprites.entries()) {
      const w = (sprite.getData('width') as number) ?? 32;
      const h = (sprite.getData('height') as number) ?? 32;
      const halfW = w / 2;
      const halfH = h / 2;

      if (
        x >= sprite.x - halfW &&
        x <= sprite.x + halfW &&
        y >= sprite.y - halfH &&
        y <= sprite.y + halfH
      ) {
        return id;
      }
    }
    return null;
  }

  public getSelectedFurnitureId(): string | null {
    return this.selectedFurnitureId;
  }

  public clearFurnitureSelection() {
    this.clearSelection();
  }

  public setPartnerSpeaking(speaking: boolean) {
    this.partnerSpeaking = speaking;
    if (!speaking && this.speakingIndicator) {
      this.speakingIndicator.destroy();
      this.speakingIndicator = null;
    }
  }

  private rebuildFurnitureCollision() {
    if (this.furnitureCollider) {
      this.furnitureCollider.destroy();
    }

    this.furnitureBodies = this.physics.add.staticGroup();

    for (const [id, sprite] of this.furnitureSprites.entries()) {
      const w = (sprite.getData('width') as number) ?? 32;
      const h = (sprite.getData('height') as number) ?? 32;
      const body = this.add.rectangle(sprite.x, sprite.y, w, h, 0x000000, 0);
      this.furnitureBodies.add(body);
      body.setData('furnitureId', id);
    }

    this.furnitureCollider = this.physics.add.collider(this.localPhysicsBody, this.furnitureBodies);
  }
}

function avatarsEqual(a: AvatarConfig, b: AvatarConfig): boolean {
  return (
    a.skin === b.skin &&
    a.hair === b.hair &&
    a.hairColor === b.hairColor &&
    a.clothes === b.clothes &&
    a.clothesColor === b.clothesColor &&
    a.accessory === b.accessory &&
    a.name === b.name
  );
}