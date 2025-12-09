
import { MascotType, MascotDef } from './types';

export const MASCOTS: Record<MascotType, MascotDef> = {
  [MascotType.CHICKEN]: {
    id: MascotType.CHICKEN,
    name: 'Speedy Chicken',
    description: 'Basic crops (Lvl 1-5) grow 25% faster.',
    price: 500,
    icon: '🐔'
  },
  [MascotType.COW]: {
    id: MascotType.COW,
    name: 'Lucky Cow',
    description: '15% chance to harvest double crops.',
    price: 1500,
    icon: '🐮'
  },
  [MascotType.SHEEP]: {
    id: MascotType.SHEEP,
    name: 'Crafty Sheep',
    description: 'Crafting speed increased by 20%.',
    price: 3000,
    icon: '🐑'
  },
  [MascotType.PIG]: {
    id: MascotType.PIG,
    name: 'Golden Pig',
    description: 'Gain 20% more XP from everything.',
    price: 5000,
    icon: '🐷'
  },
  [MascotType.DOG]: {
    id: MascotType.DOG,
    name: 'Merchant Dog',
    description: 'Orders reward 20% more money.',
    price: 8000,
    icon: '🐶'
  },
  [MascotType.OWL]: {
    id: MascotType.OWL,
    name: 'Wise Owl',
    description: 'Advanced crops (Lvl 10+) grow 20% faster.',
    price: 12000,
    icon: '🦉'
  }
};
