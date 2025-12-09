
export enum ItemType {
  // Level 1-5 (Basics)
  WHEAT = 'WHEAT',
  LETTUCE = 'LETTUCE',
  CORN = 'CORN',
  CARROT = 'CARROT',
  TOMATO = 'TOMATO',
  POTATO = 'POTATO',
  
  // Level 6-10 (Intermediate & Multi-tile)
  SUNFLOWER = 'SUNFLOWER', // 1x2
  SUGARCANE = 'SUGARCANE',
  EGGPLANT = 'EGGPLANT',
  PUMPKIN = 'PUMPKIN', // 2x2
  MELON = 'MELON', // 2x2
  CHILI = 'CHILI',
  
  // Level 11-15 (Advanced)
  STRAWBERRY = 'STRAWBERRY',
  BLUEBERRY = 'BLUEBERRY',
  GRAPE = 'GRAPE', // 1x2
  PINEAPPLE = 'PINEAPPLE',
  CAULIFLOWER = 'CAULIFLOWER', // 2x2
  
  // Level 16-20 (Expert & Giant)
  ANCIENT_FRUIT = 'ANCIENT_FRUIT',
  STARFRUIT = 'STARFRUIT',
  GEM_BERRY = 'GEM_BERRY',
  GIANT_MUSHROOM = 'GIANT_MUSHROOM', // 2x2
  SPIRIT_TREE = 'SPIRIT_TREE', // 2x3
  
  // Products
  BREAD = 'BREAD',
  SALAD = 'SALAD',
  POPCORN = 'POPCORN',
  POTATO_CHIPS = 'POTATO_CHIPS',
  TOMATO_SOUP = 'TOMATO_SOUP',
  SUGAR = 'SUGAR',
  CARROT_CAKE = 'CARROT_CAKE',
  PIE = 'PIE',
  JAM = 'JAM',
  WINE = 'WINE',
  SPICY_STEW = 'SPICY_STEW',
  FRUIT_SALAD = 'FRUIT_SALAD',
  JUICE = 'JUICE',
  PIZZA = 'PIZZA',
  MAGIC_ELIXIR = 'MAGIC_ELIXIR'
}

export enum MascotType {
  CHICKEN = 'CHICKEN',
  COW = 'COW',
  SHEEP = 'SHEEP',
  PIG = 'PIG',
  DOG = 'DOG',
  OWL = 'OWL'
}

export interface MascotDef {
  id: MascotType;
  name: string;
  description: string;
  price: number;
  icon: string;
}

export interface ItemDef {
  id: ItemType;
  name: string;
  type: 'CROP' | 'PRODUCT';
  sellPrice: number;
  description: string;
  unlockLevel: number;
  // Crop specific
  growthTimeMs?: number; // Time in ms to grow
  seedCost?: number;
  xpReward?: number;
  width?: number; // Grid width (default 1)
  height?: number; // Grid height (default 1)
}

export interface Recipe {
  id: string;
  output: ItemType;
  inputs: { item: ItemType; count: number }[];
  unlockLevel: number;
  craftTimeMs: number;
  xpReward: number;
}

export interface Plot {
  id: number;
  plantedCrop: ItemType | null;
  plantTime: number | null; // Timestamp when planted
  isWithered: boolean;
  occupiedBy: number | null; // If this plot is part of a larger crop, this points to the root plot ID
}

export interface Order {
  id: string;
  items: { item: ItemType; count: number }[];
  rewardMoney: number;
  rewardXp: number;
  expiresAt: number;
}

export interface GameState {
  money: number;
  xp: number;
  level: number;
  inventory: Record<string, number>; // ItemType -> Count
  plots: Plot[]; // 12x12 = 144 plots
  lastSaveTime: number;
  unlockedItems: ItemType[];
  orders: Order[];
  forestTexture: string | null;
  ownedMascots: MascotType[];
  activeMascot: MascotType | null;
}

export const GRID_SIZE = 12;
export const TOTAL_PLOTS = GRID_SIZE * GRID_SIZE;
