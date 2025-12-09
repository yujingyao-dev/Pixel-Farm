# Pixel Farm AI 🚜

A relaxing, feature-rich pixel art farming simulator built with **React**, **TypeScript**, and **Tailwind CSS**. 

Inspired by classics like *Stardew Valley* and *Hay Day*, this game features a complex economy, land expansion mechanics, dynamic weather systems, and an offline progression system.

Try this demo on: https://yujingyao.com/games/pixel-farm/

## ✨ Key Features

### 🌾 Farming & Crops
- **20 Levels of Progression**: Unlock over 50 different crops and products as you level up.
- **Multi-Tile Crops**: Not all crops are 1x1! Manage your grid for large crops like Pumpkins (2x2), Sunflowers (1x2), and the legendary Spirit Tree (2x3).
- **Growth Mechanics**: Crops take real-time to grow. 
- **Land Tiers**: Expand your farm from a small 8x8 plot to a massive 18x18 grid. Outer rings of land have "Rich Soil" which increases crop yield multipliers.

### 🏭 Crafting & Economy
- **Processing**: Convert raw crops into high-value goods (e.g., Wheat → Bread, Sugarcane → Sugar).
- **Order Board**: Fulfill requests from fictional villagers. 
  - **Emergency Orders**: Rare, time-sensitive orders that offer massive Money and XP rewards.
- **Dynamic Yields**: Yields are calculated based on land tier, luck, and equipped mascots.

### 🌤️ World & Atmosphere
- **Day/Night Cycle**: A 24-hour in-game clock (10 minutes real-time = 1 game day) with dynamic lighting overlays.
- **Weather System**: Random weather events including Rain, Snow, Wind, and Clouds. 
  - Crops physically sway in the wind.
  - Rain/Snow particle effects overlay the screen.
- **Ambient Life**: Watch for butterflies, running dogs, and blooming flowers appearing randomly on your farm.

### 🐶 Mascots & Buffs
Adopt and equip mascots to gain passive gameplay bonuses:
- **Speedy Chicken**: Faster growth for basic crops.
- **Lucky Cow**: Chance for double harvests.
- **Crafty Sheep**: Faster crafting speeds.
- **Golden Pig**: XP Boosts.
- **Merchant Dog**: Higher payouts from orders.
- **Wise Owl**: Faster growth for advanced crops.

### 🏆 Events
- **Random Events**: Participate in timed challenges like the "Tomato War" or "Pumpkin Festival".
- **Rewards**: Completing events within the time limit grants huge sums of Gold and XP.

### 💾 Technical Features
- **Offline Progression**: Your farm continues to grow while you are away. Calculates growth and weather changes based on the timestamp difference upon loading a save.
- **Save/Load System**: Export your farm state to a JSON file and import it on any device to continue your progress.
- **Save Migration**: Automatically upgrades old save files (smaller grids) to the new expanded map format.

## 🕹️ How to Play

1.  **Planting**: 
    - Select a seed from the **Inventory** tab.
    - Click (or click and drag) on unlocked soil to plant.
    - Ensure you have enough Money and Space.
2.  **Harvesting**:
    - When a crop starts "bouncing", it is ready.
    - Click the **Harvest** tool or use the **"Harvest All"** button for efficiency.
3.  **Leveling Up**:
    - Harvesting and Crafting give XP.
    - Completing Orders gives the most XP.
4.  **Expanding**:
    - Click the **Expand** button at the bottom to unlock new tiers of land.
    - Higher tiers cost exponentially more but provide better harvest yields.

## 🛠️ Project Structure

- **`App.tsx`**: Main game loop, UI rendering, and state management.
- **`types.ts`**: TypeScript interfaces for GameState, Items, Plots, and Orders.
- **`constants.ts`**: Game configuration (XP curves, expansion costs).
- **`items.ts`**: Definitions for all Crops and Products (prices, growth times).
- **`recipes.ts`**: Crafting recipe definitions.
- **`events.ts`**: Definitions for random game events.
- **`mascots.ts`**: Configuration for buyable mascots and their stats.
- **`services/gameService.ts`**: Core logic for offline calculation, RNG, and helper functions.

## 🚀 Technologies

- **Frontend**: React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons/Assets**: CSS-based pixel art & Emojis (No external image assets required).
- **AI**: Google GenAI SDK (Integrated for texture generation services).

## 📄 License

This project is open-source. Feel free to fork and modify!
