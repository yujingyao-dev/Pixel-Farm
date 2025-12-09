

import { GameState, ItemType, Order, Plot, GRID_SIZE, TOTAL_PLOTS, MascotType, WeatherType } from '../types';
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

// Calculate tier based on distance from center (Ring logic)
// Center of 18x18 (0-17) is roughly 8.5, 8.5
// Tier 0: 8x8 Area (x: 5-12, y: 5-12)
// Tier 1: 10x10 Area (x: 4-13, y: 4-13)
// ...
// Tier 5: 18x18 Area (x: 0-17, y: 0-17)
export const getPlotTier = (index: number): number => {
    const x = index % GRID_SIZE;
    const y = Math.floor(index / GRID_SIZE);
    
    // Calculate distance from center box
    // Distance from the range [9-1, 9] (Indices 8,9 are centerish)
    // Actually easier to just check bounds
    
    // Check Tier 0 (Center 8x8: 5 to 12)
    if (x >= 5 && x <= 12 && y >= 5 && y <= 12) return 0;
    // Check Tier 1 (Center 10x10: 4 to 13)
    if (x >= 4 && x <= 13 && y >= 4 && y <= 13) return 1;
    // Check Tier 2 (Center 12x12: 3 to 14)
    if (x >= 3 && x <= 14 && y >= 3 && y <= 14) return 2;
    // Check Tier 3 (Center 14x14: 2 to 15)
    if (x >= 2 && x <= 15 && y >= 2 && y <= 15) return 3;
    // Check Tier 4 (Center 16x16: 1 to 16)
    if (x >= 1 && x <= 16 && y >= 1 && y <= 16) return 4;
    
    return 5;
};

export const initializePlots = (expansionLevel: number = 0): Plot[] => {
  const plots: Plot[] = [];
  for (let i = 0; i < TOTAL_PLOTS; i++) {
    const tier = getPlotTier(i);
    plots.push({
      id: i,
      plantedCrop: null,
      plantTime: null,
      isWithered: false,
      occupiedBy: null,
      tier: tier,
      isUnlocked: tier <= expansionLevel
    });
  }
  return plots;
};

// --- WEATHER HELPERS ---

export const getNextWeather = (): { type: WeatherType; duration: number } => {
  const rand = Math.random();
  let type = WeatherType.SUNNY;
  
  // Probabilities: Sunny 40%, Cloudy 20%, Windy 15%, Rainy 15%, Snowy 10%
  if (rand > 0.4 && rand <= 0.6) type = WeatherType.CLOUDY;
  else if (rand > 0.6 && rand <= 0.75) type = WeatherType.WINDY;
  else if (rand > 0.75 && rand <= 0.90) type = WeatherType.RAINY;
  else if (rand > 0.90) type = WeatherType.SNOWY;

  // Duration: 2 to 5 minutes
  const duration = (Math.floor(Math.random() * 3) + 2) * 60 * 1000;
  
  return { type, duration };
};

// --- MASCOT & GAMEPLAY BUFF HELPERS ---

export const getAdjustedGrowthTime = (cropId: ItemType, mascot: MascotType | null): number => {
  const crop = ITEMS[cropId];
  if (!crop.growthTimeMs) return 0;
  let time = crop.growthTimeMs;

  // CHICKEN: Speed up crops level 1-5
  if (mascot === MascotType.CHICKEN && crop.unlockLevel <= 5) {
    time *= 0.75;
  }
  // OWL: Speed up crops level 10+
  if (mascot === MascotType.OWL && crop.unlockLevel >= 10) {
    time *= 0.8;
  }

  return time;
};

export const getAdjustedCraftTime = (baseTime: number, mascot: MascotType | null): number => {
  // SHEEP: Speed up crafting
  if (mascot === MascotType.SHEEP) {
    return baseTime * 0.8;
  }
  return baseTime;
};

export const getAdjustedXp = (baseXp: number, mascot: MascotType | null): number => {
  // PIG: More XP
  if (mascot === MascotType.PIG) {
    return Math.ceil(baseXp * 1.2);
  }
  return baseXp;
};

export const getAdjustedOrderMoney = (baseMoney: number, mascot: MascotType | null): number => {
  // DOG: More money from orders
  if (mascot === MascotType.DOG) {
    return Math.ceil(baseMoney * 1.2);
  }
  return baseMoney;
};

// Get crop yield based on land tier
// Tier 0: 1x
// Tier 1: 1.2x
// Tier 2: 1.4x
// Tier 3: 1.6x
// Tier 4: 1.8x
// Tier 5: 2.0x
export const getTierYieldMultiplier = (tier: number): number => {
    return 1 + (tier * 0.2);
};

// ---------------------------

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
      // Use adjusted growth time
      const growthDuration = getAdjustedGrowthTime(plot.plantedCrop, savedState.activeMascot);
      
      const finishTime = plot.plantTime + growthDuration;
      if (finishTime <= now && finishTime > savedState.lastSaveTime) {
        grownCount++;
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

  // Update weather if expired offline
  if (now > newState.weatherEndTime) {
      const next = getNextWeather();
      newState.weather = next.type;
      newState.weatherEndTime = now + next.duration;
  }

  newState.lastSaveTime = now;
  return { updatedState: newState, messages };
};

// --- FICTIONAL ORDER DATA ---
const REQUESTER_NAMES = [
  "Mayor Thomas", "Granny Smith", "Chef Pierre", "Wizard Zale", "Merchant Goro", 
  "Little Timmy", "Farmer Joe", "Witch Hazel", "Captain Redbeard", "Lady Victoria",
  "Carpenter Robin", "Blacksmith Clint", "Dr. Harvey", "Artist Leah", "Fisherman Willy"
];

const REQUESTER_QUOTES = [
  "I need these for my secret recipe!",
  "The festival is starting soon, hurry!",
  "I'm starving, please help.",
  "Will pay extra for fresh goods.",
  "Don't ask why I need so many...",
  "My guests will be arriving any minute!",
  "The spirits demanded this offering.",
  "Just a little snack for the road.",
  "I bet you can't grow these in time.",
  "Quality ingredients make quality meals.",
  "My cat loves these, strangely enough.",
  "It's for a science experiment!"
];

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

  // Emergency Order Logic
  const isEmergency = Math.random() < 0.15; // 15% chance
  
  // Base Multipliers
  let moneyMult = 1.5;
  let xpMult = 0.5;
  let duration = 60000 * 5; // 5 mins

  if (isEmergency) {
    moneyMult = 2.5; // Huge money bonus
    xpMult = 1.0;    // Double XP bonus
    duration = 60000 * 2; // Only 2 mins
  }

  const moneyReward = Math.floor(totalValue * moneyMult);
  const xpReward = Math.floor(totalValue * xpMult);

  const name = REQUESTER_NAMES[Math.floor(Math.random() * REQUESTER_NAMES.length)];
  const quote = REQUESTER_QUOTES[Math.floor(Math.random() * REQUESTER_QUOTES.length)];

  return {
    id: `order_${Date.now()}_${Math.random()}`,
    items,
    rewardMoney: moneyReward,
    rewardXp: xpReward,
    expiresAt: Date.now() + duration,
    requesterName: name,
    requesterQuote: quote,
    isEmergency
  };
};
