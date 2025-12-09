
import { GameState, ItemType, Order, Plot, GRID_SIZE, TOTAL_PLOTS } from '../types';
import { ITEMS } from '../items';
import { LEVEL_XP } from '../constants';

export const getLevelFromXp = (xp: number): number => {
  let level = 1;
  for (let i = 2; i < LEVEL_XP.length; i++) {
    if (xp >= LEVEL_XP[i]) {
      level = i;
    } else {
      break;
    }
  }
  return level;
};

export const initializePlots = (): Plot[] => {
  const plots: Plot[] = [];
  for (let i = 0; i < TOTAL_PLOTS; i++) {
    plots.push({
      id: i,
      plantedCrop: null,
      plantTime: null,
      isWithered: false,
      occupiedBy: null
    });
  }
  return plots;
};

export const calculateOfflineProgress = (savedState: GameState): { updatedState: GameState; messages: string[] } => {
  const now = Date.now();
  const diff = now - savedState.lastSaveTime;
  const messages: string[] = [];
  
  // Clone state to avoid mutations
  const newState = { ...savedState, plots: [...savedState.plots] };
  let grownCount = 0;

  newState.plots = newState.plots.map(plot => {
    // Only process the root plot of a crop
    if (plot.plantedCrop && plot.plantTime && plot.occupiedBy === null) {
      const cropDef = ITEMS[plot.plantedCrop];
      if (cropDef.growthTimeMs) {
        const finishTime = plot.plantTime + cropDef.growthTimeMs;
        if (finishTime <= now && finishTime > savedState.lastSaveTime) {
          grownCount++;
        }
      }
    }
    return plot;
  });

  if (grownCount > 0) {
    messages.push(`${grownCount} crops finished growing while you were away!`);
  }
  
  if (diff > 60000) {
      messages.push(`You were away for ${(diff / 60000).toFixed(0)} minutes.`);
  }

  newState.lastSaveTime = now;
  return { updatedState: newState, messages };
};

export const generateNewOrder = (level: number, currentOrders: Order[]): Order => {
  const availableItems = Object.values(ITEMS).filter(i => i.unlockLevel <= level);
  // Pick 1-4 random items
  const numItems = Math.floor(Math.random() * 3) + 1;
  const items: { item: ItemType; count: number }[] = [];
  
  for (let i = 0; i < numItems; i++) {
    const randomItem = availableItems[Math.floor(Math.random() * availableItems.length)];
    // products are harder to get, ask for less. crops ask for more.
    const count = randomItem.type === 'PRODUCT' ? 1 : Math.floor(Math.random() * 5) + 3;
    
    // Check if item already in this order to avoid duplicates, just add to count if so
    const existing = items.find(x => x.item === randomItem.id);
    if (existing) {
        existing.count += count;
    } else {
        items.push({ item: randomItem.id, count });
    }
  }

  // Calculate rewards
  let totalValue = 0;
  items.forEach(req => {
    totalValue += (ITEMS[req.item].sellPrice * req.count);
  });

  // Bonus for order
  const moneyReward = Math.floor(totalValue * 1.5);
  const xpReward = Math.floor(totalValue * 0.5);

  return {
    id: `order_${Date.now()}_${Math.random()}`,
    items,
    rewardMoney: moneyReward,
    rewardXp: xpReward,
    expiresAt: Date.now() + 60000 * 5 // 5 minutes
  };
};
