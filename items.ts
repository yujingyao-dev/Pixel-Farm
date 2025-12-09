
import { ItemType, ItemDef } from './types';

// Helper to create crop quickly
const crop = (id: ItemType, name: string, price: number, seed: number, timeSec: number, xp: number, level: number, w: number = 1, h: number = 1, desc: string = ''): ItemDef => ({
  id, name, type: 'CROP', sellPrice: price, seedCost: seed, growthTimeMs: timeSec * 1000, xpReward: xp, unlockLevel: level, width: w, height: h, description: desc || `Grows in ${timeSec}s`
});

// Helper to create product
const product = (id: ItemType, name: string, price: number, level: number, desc: string): ItemDef => ({
  id, name, type: 'PRODUCT', sellPrice: price, unlockLevel: level, description: desc, xpReward: 0
});

export const ITEMS: Record<ItemType, ItemDef> = {
  // LEVEL 1-5
  [ItemType.WHEAT]: crop(ItemType.WHEAT, 'Wheat', 3, 1, 5, 2, 1, 1, 1, 'Basic grain'),
  [ItemType.LETTUCE]: crop(ItemType.LETTUCE, 'Lettuce', 6, 2, 10, 4, 1, 1, 1, 'Crispy green'),
  [ItemType.CORN]: crop(ItemType.CORN, 'Corn', 10, 5, 20, 6, 2, 1, 1, 'Sweet yellow corn'),
  [ItemType.CARROT]: crop(ItemType.CARROT, 'Carrot', 15, 7, 30, 8, 3, 1, 1, 'Good for eyes'),
  [ItemType.TOMATO]: crop(ItemType.TOMATO, 'Tomato', 20, 10, 45, 10, 4, 1, 1, 'Red and juicy'),
  [ItemType.POTATO]: crop(ItemType.POTATO, 'Potato', 25, 12, 60, 12, 5, 1, 1, 'Boil em, mash em'),

  // LEVEL 6-10
  [ItemType.SUNFLOWER]: crop(ItemType.SUNFLOWER, 'Sunflower', 45, 20, 90, 20, 6, 1, 2, 'Tall beauty (1x2)'),
  [ItemType.SUGARCANE]: crop(ItemType.SUGARCANE, 'Sugarcane', 35, 15, 75, 15, 6, 1, 1, 'Sweet stalks'),
  [ItemType.EGGPLANT]: crop(ItemType.EGGPLANT, 'Eggplant', 50, 25, 120, 25, 7, 1, 1, 'Purple veg'),
  [ItemType.PUMPKIN]: crop(ItemType.PUMPKIN, 'Pumpkin', 80, 40, 180, 40, 8, 2, 2, 'Huge gourd (2x2)'),
  [ItemType.MELON]: crop(ItemType.MELON, 'Melon', 100, 50, 240, 50, 9, 2, 2, 'Sweet summer treat (2x2)'),
  [ItemType.CHILI]: crop(ItemType.CHILI, 'Chili Pepper', 60, 30, 150, 30, 10, 1, 1, 'Spicy!'),

  // LEVEL 11-15
  [ItemType.STRAWBERRY]: crop(ItemType.STRAWBERRY, 'Strawberry', 70, 35, 160, 35, 11, 1, 1, 'Red berries'),
  [ItemType.BLUEBERRY]: crop(ItemType.BLUEBERRY, 'Blueberry', 75, 38, 170, 38, 12, 1, 1, 'Blue berries'),
  [ItemType.GRAPE]: crop(ItemType.GRAPE, 'Grape Vine', 90, 45, 200, 45, 13, 1, 2, 'Vineyard staple (1x2)'),
  [ItemType.PINEAPPLE]: crop(ItemType.PINEAPPLE, 'Pineapple', 120, 60, 300, 60, 14, 1, 1, 'Tropical'),
  [ItemType.CAULIFLOWER]: crop(ItemType.CAULIFLOWER, 'Cauliflower', 150, 75, 360, 80, 15, 2, 2, 'Pale giant (2x2)'),

  // LEVEL 16-20
  [ItemType.ANCIENT_FRUIT]: crop(ItemType.ANCIENT_FRUIT, 'Ancient Fruit', 300, 150, 600, 150, 16, 1, 1, 'Mysterious glow'),
  [ItemType.STARFRUIT]: crop(ItemType.STARFRUIT, 'Starfruit', 400, 200, 900, 200, 17, 1, 1, 'Celestial taste'),
  [ItemType.GEM_BERRY]: crop(ItemType.GEM_BERRY, 'Gem Berry', 600, 300, 1200, 300, 18, 1, 1, 'Worth a fortune'),
  [ItemType.GIANT_MUSHROOM]: crop(ItemType.GIANT_MUSHROOM, 'Giant Shroom', 800, 400, 1800, 500, 19, 2, 2, 'Fungus among us (2x2)'),
  [ItemType.SPIRIT_TREE]: crop(ItemType.SPIRIT_TREE, 'Spirit Tree', 2000, 1000, 3600, 1000, 20, 2, 3, 'Legendary Tree (2x3)'),

  // PRODUCTS
  [ItemType.BREAD]: product(ItemType.BREAD, 'Bread', 15, 2, 'Baked wheat'),
  [ItemType.SALAD]: product(ItemType.SALAD, 'Green Salad', 35, 3, 'Healthy mix'),
  [ItemType.POPCORN]: product(ItemType.POPCORN, 'Popcorn', 25, 4, 'Movie snack'),
  [ItemType.POTATO_CHIPS]: product(ItemType.POTATO_CHIPS, 'Potato Chips', 60, 5, 'Crispy snack'),
  [ItemType.TOMATO_SOUP]: product(ItemType.TOMATO_SOUP, 'Tomato Soup', 70, 6, 'Warm soup'),
  [ItemType.SUGAR]: product(ItemType.SUGAR, 'Sugar', 80, 7, 'Refined cane'),
  [ItemType.CARROT_CAKE]: product(ItemType.CARROT_CAKE, 'Carrot Cake', 120, 8, 'Sweet dessert'),
  [ItemType.PIE]: product(ItemType.PIE, 'Pumpkin Pie', 250, 9, 'Thanksgiving staple'),
  [ItemType.JAM]: product(ItemType.JAM, 'Berry Jam', 180, 12, 'Sticky sweet'),
  [ItemType.WINE]: product(ItemType.WINE, 'Fine Wine', 300, 14, 'Aged to perfection'),
  [ItemType.SPICY_STEW]: product(ItemType.SPICY_STEW, 'Spicy Stew', 220, 11, 'Hot hot hot'),
  [ItemType.FRUIT_SALAD]: product(ItemType.FRUIT_SALAD, 'Fruit Salad', 400, 15, 'Tropical mix'),
  [ItemType.JUICE]: product(ItemType.JUICE, 'Mega Juice', 500, 16, 'Energy drink'),
  [ItemType.PIZZA]: product(ItemType.PIZZA, 'Veggie Pizza', 600, 13, 'Everyone loves it'),
  [ItemType.MAGIC_ELIXIR]: product(ItemType.MAGIC_ELIXIR, 'Magic Elixir', 5000, 20, 'Pure energy')
};
