
import { ItemType, WeatherType } from './types';

// XP curve for 20 levels
export const LEVEL_XP = [
  0, 
  0, 100, 300, 600, 1000, 
  1500, 2200, 3000, 4000, 5500, 
  7500, 10000, 13000, 17000, 22000, 
  28000, 35000, 45000, 60000, 100000
];

// Costs to upgrade land. Index = target level.
// Level 0 is free (Start).
// Level 1 (10x10): 500
// Level 2 (12x12): 2000
// Level 3 (14x14): 10000
// Level 4 (16x16): 50000
// Level 5 (18x18): 200000
export const EXPANSION_COSTS = [0, 500, 2000, 10000, 50000, 200000];

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
  activeMascot: null,
  weather: WeatherType.SUNNY,
  weatherEndTime: Date.now() + 1000 * 60 * 5, // 5 mins sunny start
  expansionLevel: 0,
  gameTime: 6.0, // Start at 6:00 AM
  activeEvent: null
};
