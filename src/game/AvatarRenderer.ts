import Phaser from 'phaser';
import {
  SKIN_COLORS,
  HAIR_COLORS,
  CLOTHES_COLORS,
} from './types';
import type { AvatarConfig } from './types';

export class AvatarRenderer {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, config: AvatarConfig) {
    this.scene = scene;
    this.container = scene.add.container(x, y);
    this.build(config);
  }

  private build(config: AvatarConfig) {
    this.container.removeAll(true);

    const skinColor = SKIN_COLORS[config.skin];
    const hairColor = HAIR_COLORS[config.hairColor];
    const clothesColor = CLOTHES_COLORS[config.clothesColor];

    // Body (clothes)
    let body: Phaser.GameObjects.Rectangle;
    if (config.clothes === 'dress') {
      body = this.scene.add.rectangle(0, 8, 22, 22, clothesColor);
    } else if (config.clothes === 'hoodie') {
      body = this.scene.add.rectangle(0, 8, 24, 22, clothesColor);
    } else {
      body = this.scene.add.rectangle(0, 8, 20, 20, clothesColor);
    }
    this.container.add(body);

    // Head
    const head = this.scene.add.circle(0, -10, 10, skinColor);
    this.container.add(head);

    // Hair
    this.addHair(config.hair, hairColor);

    // Accessory
    this.addAccessory(config.accessory);
  }

  private addHair(style: AvatarConfig['hair'], color: number) {
    switch (style) {
      case 'short': {
        const hair = this.scene.add.rectangle(0, -14, 18, 8, color);
        this.container.add(hair);
        break;
      }
      case 'long': {
        const top = this.scene.add.rectangle(0, -14, 20, 8, color);
        const left = this.scene.add.rectangle(-9, -4, 4, 16, color);
        const right = this.scene.add.rectangle(9, -4, 4, 16, color);
        this.container.add([top, left, right]);
        break;
      }
      case 'curly': {
        const c1 = this.scene.add.circle(-6, -14, 5, color);
        const c2 = this.scene.add.circle(0, -16, 5, color);
        const c3 = this.scene.add.circle(6, -14, 5, color);
        this.container.add([c1, c2, c3]);
        break;
      }
      case 'ponytail': {
        const top = this.scene.add.rectangle(0, -14, 18, 8, color);
        const tail = this.scene.add.rectangle(8, -4, 4, 14, color);
        this.container.add([top, tail]);
        break;
      }
      case 'bald':
      default:
        break;
    }
  }

  private addAccessory(accessory: AvatarConfig['accessory']) {
    switch (accessory) {
      case 'hat': {
        const brim = this.scene.add.rectangle(0, -20, 24, 3, 0x4a3728);
        const top = this.scene.add.rectangle(0, -26, 16, 8, 0x4a3728);
        this.container.add([brim, top]);
        break;
      }
      case 'glasses': {
        const left = this.scene.add.circle(-5, -10, 3, 0x333333);
        const right = this.scene.add.circle(5, -10, 3, 0x333333);
        const bridge = this.scene.add.rectangle(0, -10, 4, 1, 0x333333);
        left.setFillStyle(0xffffff, 0.3);
        right.setFillStyle(0xffffff, 0.3);
        this.container.add([left, right, bridge]);
        break;
      }
      case 'bow': {
        const bow = this.scene.add.rectangle(0, -20, 10, 6, 0xff4d6d);
        this.container.add(bow);
        break;
      }
      case 'flower': {
        const center = this.scene.add.circle(-8, -16, 3, 0xffeb3b);
        const p1 = this.scene.add.circle(-11, -16, 2, 0xff8fab);
        const p2 = this.scene.add.circle(-5, -16, 2, 0xff8fab);
        const p3 = this.scene.add.circle(-8, -19, 2, 0xff8fab);
        const p4 = this.scene.add.circle(-8, -13, 2, 0xff8fab);
        this.container.add([center, p1, p2, p3, p4]);
        break;
      }
      case 'none':
      default:
        break;
    }
  }

  update(config: AvatarConfig) {
    this.build(config);
  }

  setPosition(x: number, y: number) {
    this.container.setPosition(x, y);
  }

  setDepth(depth: number) {
    this.container.setDepth(depth);
  }

  destroy() {
    this.container.destroy();
  }

  getContainer() {
    return this.container;
  }
}