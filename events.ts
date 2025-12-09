
import { GameEventDef, ItemType } from './types';

export const GAME_EVENTS: GameEventDef[] = [
  {
    id: 'wheat_shortage',
    title: 'Wheat Rush',
    description: 'The Royal Bakery is out of flour! Harvest Wheat quickly!',
    targetItem: ItemType.WHEAT,
    targetAmount: 20,
    durationMs: 120000, // 2 minutes
    unlockLevel: 2,
    rewardMoney: 150,
    rewardXp: 100
  },
  {
    id: 'corn_festival',
    title: 'Corn Festival',
    description: 'The village needs supplies for the popcorn stand.',
    targetItem: ItemType.CORN,
    targetAmount: 15,
    durationMs: 180000, // 3 minutes
    unlockLevel: 4,
    rewardMoney: 300,
    rewardXp: 150
  },
  {
    id: 'tomato_war',
    title: 'Tomato War',
    description: 'The annual food fight is starting! We need ammo!',
    targetItem: ItemType.TOMATO,
    targetAmount: 30,
    durationMs: 180000, // 3 minutes
    unlockLevel: 6,
    rewardMoney: 800,
    rewardXp: 400
  },
  {
    id: 'pumpkin_carving',
    title: 'Spooky Season',
    description: 'The carving contest begins soon. Grow Pumpkins!',
    targetItem: ItemType.PUMPKIN,
    targetAmount: 10,
    durationMs: 240000, // 4 minutes
    unlockLevel: 9,
    rewardMoney: 1200,
    rewardXp: 600
  },
  {
    id: 'berry_smoothie',
    title: 'Smoothie Craze',
    description: 'Everyone wants Strawberry smoothies right now!',
    targetItem: ItemType.STRAWBERRY,
    targetAmount: 25,
    durationMs: 180000, // 3 minutes
    unlockLevel: 12,
    rewardMoney: 1500,
    rewardXp: 800
  },
  {
    id: 'ancient_research',
    title: 'Ancient Research',
    description: 'The Professor needs Ancient Fruits for science.',
    targetItem: ItemType.ANCIENT_FRUIT,
    targetAmount: 5,
    durationMs: 300000, // 5 minutes
    unlockLevel: 17,
    rewardMoney: 5000,
    rewardXp: 2000
  }
];
