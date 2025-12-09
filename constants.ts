
import { ItemType } from './types';

// XP curve for 20 levels
export const LEVEL_XP = [
  0, 
  0, 100, 300, 600, 1000, 
  1500, 2200, 3000, 4000, 5500, 
  7500, 10000, 13000, 17000, 22000, 
  28000, 35000, 45000, 60000, 100000
];

export const INITIAL_GAME_STATE = {
  money: 50,
  xp: 0,
  level: 1,
  inventory: { [ItemType.WHEAT]: 5 },
  plots: [],
  lastSaveTime: Date.now(),
  unlockedItems: [ItemType.WHEAT],
  orders: [],
  forestTexture: null,
  ownedMascots: [],
  activeMascot: null
};
