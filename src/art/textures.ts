import type * as Phaser from 'phaser';
import { generateFx } from './fx';
import { generateWorld } from './world';
import { generateUnits, createUnitAnims } from './units';
import { generateTowers } from './towers';

export { TOWER_TEX, TOWER_PARTS } from './towers';
export { ENEMY_TEX, SOLDIER_TEX } from './units';
export { shade } from './draw';

/** Paint every texture at the device's render scale and register animations. */
export function generateAll(scene: Phaser.Scene): void {
  generateFx(scene);
  generateWorld(scene);
  generateUnits(scene);
  createUnitAnims(scene);
  generateTowers(scene);
}
