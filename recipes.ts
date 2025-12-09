
import { ItemType, Recipe } from './types';

export const RECIPES: Recipe[] = [
  { id: 'r_bread', output: ItemType.BREAD, inputs: [{ item: ItemType.WHEAT, count: 3 }], unlockLevel: 2, craftTimeMs: 2000, xpReward: 5 },
  { id: 'r_salad', output: ItemType.SALAD, inputs: [{ item: ItemType.LETTUCE, count: 2 }, { item: ItemType.TOMATO, count: 1 }], unlockLevel: 3, craftTimeMs: 3000, xpReward: 10 },
  { id: 'r_popcorn', output: ItemType.POPCORN, inputs: [{ item: ItemType.CORN, count: 2 }], unlockLevel: 4, craftTimeMs: 2000, xpReward: 8 },
  { id: 'r_chips', output: ItemType.POTATO_CHIPS, inputs: [{ item: ItemType.POTATO, count: 2 }], unlockLevel: 5, craftTimeMs: 4000, xpReward: 15 },
  { id: 'r_soup', output: ItemType.TOMATO_SOUP, inputs: [{ item: ItemType.TOMATO, count: 3 }], unlockLevel: 6, craftTimeMs: 5000, xpReward: 20 },
  { id: 'r_sugar', output: ItemType.SUGAR, inputs: [{ item: ItemType.SUGARCANE, count: 2 }], unlockLevel: 7, craftTimeMs: 3000, xpReward: 15 },
  { id: 'r_cake', output: ItemType.CARROT_CAKE, inputs: [{ item: ItemType.CARROT, count: 2 }, { item: ItemType.WHEAT, count: 2 }, { item: ItemType.SUGAR, count: 1 }], unlockLevel: 8, craftTimeMs: 8000, xpReward: 30 },
  { id: 'r_pie', output: ItemType.PIE, inputs: [{ item: ItemType.PUMPKIN, count: 1 }, { item: ItemType.WHEAT, count: 2 }, { item: ItemType.SUGAR, count: 1 }], unlockLevel: 9, craftTimeMs: 10000, xpReward: 50 },
  { id: 'r_stew', output: ItemType.SPICY_STEW, inputs: [{ item: ItemType.CHILI, count: 2 }, { item: ItemType.TOMATO, count: 2 }, { item: ItemType.POTATO, count: 2 }], unlockLevel: 11, craftTimeMs: 12000, xpReward: 60 },
  { id: 'r_jam', output: ItemType.JAM, inputs: [{ item: ItemType.STRAWBERRY, count: 2 }, { item: ItemType.BLUEBERRY, count: 2 }, { item: ItemType.SUGAR, count: 1 }], unlockLevel: 12, craftTimeMs: 8000, xpReward: 40 },
  { id: 'r_pizza', output: ItemType.PIZZA, inputs: [{ item: ItemType.WHEAT, count: 4 }, { item: ItemType.TOMATO, count: 2 }, { item: ItemType.LETTUCE, count: 1 }], unlockLevel: 13, craftTimeMs: 15000, xpReward: 80 },
  { id: 'r_wine', output: ItemType.WINE, inputs: [{ item: ItemType.GRAPE, count: 3 }, { item: ItemType.SUGAR, count: 1 }], unlockLevel: 14, craftTimeMs: 20000, xpReward: 100 },
  { id: 'r_fruit_salad', output: ItemType.FRUIT_SALAD, inputs: [{ item: ItemType.PINEAPPLE, count: 1 }, { item: ItemType.MELON, count: 1 }, { item: ItemType.STRAWBERRY, count: 2 }], unlockLevel: 15, craftTimeMs: 10000, xpReward: 90 },
  { id: 'r_juice', output: ItemType.JUICE, inputs: [{ item: ItemType.STARFRUIT, count: 1 }, { item: ItemType.ANCIENT_FRUIT, count: 1 }], unlockLevel: 18, craftTimeMs: 15000, xpReward: 150 },
  { id: 'r_elixir', output: ItemType.MAGIC_ELIXIR, inputs: [{ item: ItemType.GEM_BERRY, count: 1 }, { item: ItemType.SPIRIT_TREE, count: 1 }, { item: ItemType.WINE, count: 1 }], unlockLevel: 20, craftTimeMs: 60000, xpReward: 1000 },
];
