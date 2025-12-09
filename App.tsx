
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, ItemType, GRID_SIZE, Plot, Order, MascotType, TOTAL_PLOTS, WeatherType } from './types';
import { INITIAL_GAME_STATE, LEVEL_XP, EXPANSION_COSTS } from './constants';
import { ITEMS } from './items';
import { RECIPES } from './recipes';
import { MASCOTS } from './mascots';
import { GAME_EVENTS } from './events';
import { 
  initializePlots, 
  calculateOfflineProgress, 
  getLevelFromXp, 
  generateNewOrder, 
  getAdjustedGrowthTime,
  getAdjustedCraftTime,
  getAdjustedXp,
  getAdjustedOrderMoney,
  getNextWeather,
  getPlotTier,
  getTierYieldMultiplier,
  generateRandomEvent
} from './services/gameService';
import { Tooltip } from './components/Tooltip';

// Icons
const CoinIcon = () => <span className="text-yellow-400 font-bold">G</span>;
const XpIcon = () => <span className="text-blue-400 font-bold">XP</span>;

// Ambient System Types
type AmbientEntity = {
  id: number;
  type: 'BUTTERFLY' | 'DOG' | 'FLOWER';
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  createdAt: number;
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
     return { ...INITIAL_GAME_STATE, plots: initializePlots(0) };
  });
  
  const [selectedTool, setSelectedTool] = useState<ItemType | 'HARVEST' | null>(null);
  const [notifications, setNotifications] = useState<{id: number, text: string}[]>([]);
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'CRAFTING' | 'ORDERS' | 'MASCOTS'>('INVENTORY');
  const [now, setNow] = useState(Date.now());
  const [isDragging, setIsDragging] = useState(false);
  const [ambientEntities, setAmbientEntities] = useState<AmbientEntity[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Game Loop
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      
      setGameState(prev => {
        let nextState = { ...prev };

        // 1. Time Advancement
        // Advance 0.04 hours per second (2.4 hours per minute). 1 Full day = 10 minutes.
        const timeIncrement = 0.04; 
        nextState.gameTime = (prev.gameTime + timeIncrement) % 24;

        // 2. Weather
        if (currentTime > prev.weatherEndTime) {
            const nextW = getNextWeather();
            nextState.weather = nextW.type;
            nextState.weatherEndTime = currentTime + nextW.duration;
        }

        // 3. Orders
        const validOrders = prev.orders.filter(o => o.expiresAt > currentTime);
        if (validOrders.length < 3 && Math.random() < 0.05) { 
             const newOrder = generateNewOrder(prev.level, validOrders);
             nextState.orders = [...validOrders, newOrder];
        } else if (validOrders.length !== prev.orders.length) {
             nextState.orders = validOrders;
        }

        // 4. Random Events
        // Check if event failed/expired
        if (prev.activeEvent && currentTime > prev.activeEvent.endTime) {
            const eventDef = GAME_EVENTS.find(e => e.id === prev.activeEvent!.eventId);
            setNotifications(old => [...old, { id: Date.now(), text: `Event Failed: ${eventDef?.title}` }]);
            nextState.activeEvent = null;
        }
        // Try spawn event (1% chance per second if no event)
        if (!prev.activeEvent && Math.random() < 0.01) {
            const newEventDef = generateRandomEvent(prev.level);
            if (newEventDef) {
                nextState.activeEvent = {
                    eventId: newEventDef.id,
                    startTime: currentTime,
                    endTime: currentTime + newEventDef.durationMs,
                    currentProgress: 0
                };
                // We can't call notify inside here easily without effect, so we do it via effect detection or state array
            }
        }

        return nextState;
      });

      // Ambient Life Spawning
      if (Math.random() < 0.03) { // 3% chance per second
        const typeRoll = Math.random();
        let type: AmbientEntity['type'] = 'BUTTERFLY';
        if (typeRoll > 0.6) type = 'FLOWER';
        if (typeRoll > 0.95) type = 'DOG';

        const newEntity: AmbientEntity = {
            id: currentTime,
            type,
            x: Math.random() * 90, 
            y: Math.random() * 90,
            createdAt: currentTime
        };
        setAmbientEntities(prev => [...prev, newEntity]);
      }

      setAmbientEntities(prev => prev.filter(e => {
          const age = currentTime - e.createdAt;
          if (e.type === 'DOG') return age < 8000;
          if (e.type === 'FLOWER') return age < 15000;
          return age < 10000;
      }));

    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Effect to notify event start
  const prevEventRef = useRef<string | null>(null);
  useEffect(() => {
      const currentEventId = gameState.activeEvent?.eventId || null;
      if (currentEventId !== prevEventRef.current && currentEventId) {
          const def = GAME_EVENTS.find(e => e.id === currentEventId);
          if (def) notify(`📢 New Event: ${def.title}!`);
      }
      prevEventRef.current = currentEventId;
  }, [gameState.activeEvent]);

  const notify = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => {
      const newList = [...prev, { id, text }];
      if (newList.length > 5) return newList.slice(newList.length - 5);
      return newList;
    });
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000); 
  }, []);

  const canPlantAt = (index: number, width: number, height: number, plots: Plot[]) => {
      const startRow = Math.floor(index / GRID_SIZE);
      const startCol = index % GRID_SIZE;

      if (startCol + width > GRID_SIZE) return false;
      if (startRow + height > GRID_SIZE) return false;

      for (let r = 0; r < height; r++) {
          for (let c = 0; c < width; c++) {
              const targetIdx = index + (r * GRID_SIZE) + c;
              if (targetIdx >= plots.length) return false;
              const p = plots[targetIdx];
              if (p.plantedCrop || p.occupiedBy !== null || !p.isUnlocked) {
                  return false;
              }
          }
      }
      return true;
  };

  const checkEventProgress = (items: Record<string, number>, currentEvent: any, state: GameState) => {
      if (!currentEvent) return null;
      const eventDef = GAME_EVENTS.find(e => e.id === currentEvent.eventId);
      if (!eventDef) return null;

      const harvestedAmount = items[eventDef.targetItem] || 0;
      if (harvestedAmount > 0) {
          const newProgress = currentEvent.currentProgress + harvestedAmount;
          if (newProgress >= eventDef.targetAmount) {
              // Complete
              return { completed: true, def: eventDef };
          }
          return { completed: false, progress: newProgress };
      }
      return null;
  };

  const handlePlotInteraction = (plotIndex: number) => {
    const plot = gameState.plots[plotIndex];
    if (!plot.isUnlocked) {
        if (!isDragging) notify(`Land locked! Buy expansion to unlock Tier ${plot.tier} land.`);
        return;
    }

    const currentTime = Date.now();

    if (plot.occupiedBy !== null) {
        handlePlotInteraction(plot.occupiedBy);
        return;
    }

    // HARVEST
    if (plot.plantedCrop && plot.plantTime) {
       const cropDef = ITEMS[plot.plantedCrop];
       const duration = getAdjustedGrowthTime(plot.plantedCrop, gameState.activeMascot);

       if ((currentTime - plot.plantTime >= duration)) {
         const baseXp = cropDef.xpReward || 0;
         const finalXp = getAdjustedXp(baseXp, gameState.activeMascot);
         
         setGameState(prev => {
            const newInventory = { ...prev.inventory };
            let yieldCount = 1;
            const tierMult = getTierYieldMultiplier(plot.tier);
            const calculatedYield = 1 * tierMult;
            yieldCount = Math.floor(calculatedYield);
            if (Math.random() < (calculatedYield - yieldCount)) yieldCount += 1;
            if (prev.activeMascot === MascotType.COW && Math.random() < 0.15) {
                yieldCount *= 2;
                notify("Lucky Cow! Double Harvest! 🐮");
            }

            newInventory[plot.plantedCrop!] = (newInventory[plot.plantedCrop!] || 0) + yieldCount;
            
            // Event Logic
            let nextActiveEvent = prev.activeEvent;
            let moneyBonus = 0;
            let xpBonus = 0;
            if (prev.activeEvent) {
                const eventRes = checkEventProgress({ [plot.plantedCrop!]: yieldCount }, prev.activeEvent, prev);
                if (eventRes?.completed) {
                     nextActiveEvent = null;
                     moneyBonus = eventRes.def.rewardMoney;
                     xpBonus = eventRes.def.rewardXp;
                     notify(`🏆 Event Complete: ${eventRes.def.title}! (+${moneyBonus}G, +${xpBonus}XP)`);
                } else if (eventRes) {
                     nextActiveEvent = { ...prev.activeEvent, currentProgress: eventRes.progress };
                }
            }

            const newPlots = [...prev.plots];
            newPlots[plotIndex] = { ...plot, plantedCrop: null, plantTime: null, occupiedBy: null };
            
            const w = cropDef.width || 1;
            const h = cropDef.height || 1;
            for (let r = 0; r < h; r++) {
                for (let c = 0; c < w; c++) {
                    if (r === 0 && c === 0) continue; 
                    const targetIdx = plotIndex + (r * GRID_SIZE) + c;
                    if (targetIdx < TOTAL_PLOTS) {
                        newPlots[targetIdx] = { ...newPlots[targetIdx], occupiedBy: null, plantedCrop: null };
                    }
                }
            }
            
            const newXp = prev.xp + finalXp + xpBonus;
            const newLevel = getLevelFromXp(newXp);
            if (newLevel > prev.level) notify(`Level Up! You are now level ${newLevel}`);

            return {
              ...prev,
              inventory: newInventory,
              plots: newPlots,
              xp: newXp,
              money: prev.money + moneyBonus,
              level: newLevel,
              activeEvent: nextActiveEvent,
              unlockedItems: Object.values(ITEMS).filter(i => i.unlockLevel <= newLevel).map(i => i.id)
            };
         });
         notify(`Harvested ${cropDef.name} (+${finalXp} XP)`);
         return;
       } else {
         if (!isDragging) notify("Not ready yet!");
         return;
       }
    }

    // PLANT
    if (!plot.plantedCrop && selectedTool && selectedTool !== 'HARVEST') {
       const cropDef = ITEMS[selectedTool];
       if (cropDef.type !== 'CROP') return;

       const w = cropDef.width || 1;
       const h = cropDef.height || 1;

       if (!canPlantAt(plotIndex, w, h, gameState.plots)) {
           if (!isDragging) notify("Cannot plant here (Space or Locked)");
           return;
       }

       const cost = cropDef.seedCost || 0;
       
       if (gameState.money >= cost) {
         setGameState(prev => {
           if (prev.money < cost) return prev; 
           if (!canPlantAt(plotIndex, w, h, prev.plots)) return prev;

           const newPlots = [...prev.plots];
           
           newPlots[plotIndex] = {
             ...plot,
             plantedCrop: selectedTool,
             plantTime: Date.now(),
             isWithered: false,
             occupiedBy: null
           };

           for (let r = 0; r < h; r++) {
               for (let c = 0; c < w; c++) {
                   if (r === 0 && c === 0) continue; 
                   const targetIdx = plotIndex + (r * GRID_SIZE) + c;
                   newPlots[targetIdx] = { ...newPlots[targetIdx], occupiedBy: plotIndex };
               }
           }

           return {
             ...prev,
             money: prev.money - cost,
             plots: newPlots
           };
         });
       } else {
         if (!isDragging) notify("Not enough money for seeds!");
       }
    }
  };

  const handleHarvestAll = () => {
    let harvestedCount = 0;
    
    setGameState(prev => {
        const newInventory = { ...prev.inventory };
        const newPlots = [...prev.plots];
        let currentXp = prev.xp;
        let earnedXp = 0;
        const earnedItems: Record<string, number> = {};

        prev.plots.forEach((plot, index) => {
            if (plot.occupiedBy !== null) return;
            if (!plot.plantedCrop || !plot.plantTime) return;

            const cropDef = ITEMS[plot.plantedCrop];
            const duration = getAdjustedGrowthTime(plot.plantedCrop, prev.activeMascot);
            const isReady = (Date.now() - plot.plantTime) >= duration;

            if (isReady) {
                harvestedCount++;
                const cropXp = getAdjustedXp(cropDef.xpReward || 0, prev.activeMascot);
                currentXp += cropXp;
                earnedXp += cropXp;

                let yieldCount = 1;
                const tierMult = getTierYieldMultiplier(plot.tier);
                yieldCount = Math.floor(1 * tierMult);
                if (Math.random() < ((1 * tierMult) - yieldCount)) yieldCount += 1;
                if (prev.activeMascot === MascotType.COW && Math.random() < 0.15) yieldCount *= 2;

                newInventory[plot.plantedCrop!] = (newInventory[plot.plantedCrop!] || 0) + yieldCount;
                earnedItems[cropDef.id] = (earnedItems[cropDef.id] || 0) + yieldCount; // Use ID for logic

                newPlots[index] = { ...plot, plantedCrop: null, plantTime: null, occupiedBy: null };
                const w = cropDef.width || 1;
                const h = cropDef.height || 1;
                for (let r = 0; r < h; r++) {
                    for (let c = 0; c < w; c++) {
                        if (r === 0 && c === 0) continue; 
                        const targetIdx = index + (r * GRID_SIZE) + c;
                        if (targetIdx < TOTAL_PLOTS) newPlots[targetIdx] = { ...newPlots[targetIdx], occupiedBy: null, plantedCrop: null };
                    }
                }
            }
        });

        if (harvestedCount === 0) {
            notify("Nothing ready to harvest!");
            return prev;
        }

        // Event Check Batch
        let nextActiveEvent = prev.activeEvent;
        let moneyBonus = 0;
        let xpBonus = 0;

        if (prev.activeEvent) {
             const eventRes = checkEventProgress(earnedItems, prev.activeEvent, prev);
             if (eventRes?.completed) {
                  nextActiveEvent = null;
                  moneyBonus = eventRes.def.rewardMoney;
                  xpBonus = eventRes.def.rewardXp;
                  notify(`🏆 Event Complete: ${eventRes.def.title}!`);
             } else if (eventRes) {
                  nextActiveEvent = { ...prev.activeEvent, currentProgress: eventRes.progress };
             }
        }
        
        // Notification String
        const itemSummary = Object.entries(earnedItems).map(([id, count]) => `${ITEMS[id as ItemType].name} x${count}`).join(', ');
        notify(`Harvested: ${itemSummary} (+${earnedXp} XP)`);

        const finalLevel = getLevelFromXp(currentXp + xpBonus);
        if (finalLevel > prev.level) notify(`Level Up! You are now level ${finalLevel}`);

        return {
            ...prev,
            inventory: newInventory,
            plots: newPlots,
            xp: currentXp + xpBonus,
            money: prev.money + moneyBonus,
            level: finalLevel,
            activeEvent: nextActiveEvent,
            unlockedItems: Object.values(ITEMS).filter(i => i.unlockLevel <= finalLevel).map(i => i.id)
        };
    });
  };

  // ... (Keep handleExpandLand, handleCraft, handleSell, handleCompleteOrder, exportSave, importSave, buyMascot, equipMascot same)
  const handleExpandLand = () => {
    const nextLevel = gameState.expansionLevel + 1;
    if (nextLevel >= EXPANSION_COSTS.length) {
        notify("Max expansion reached!");
        return;
    }
    const cost = EXPANSION_COSTS[nextLevel];

    if (gameState.money >= cost) {
        setGameState(prev => {
            const nextLvl = prev.expansionLevel + 1;
            const newPlots = prev.plots.map(p => ({
                ...p,
                isUnlocked: p.tier <= nextLvl
            }));
            
            return {
                ...prev,
                money: prev.money - cost,
                expansionLevel: nextLvl,
                plots: newPlots
            };
        });
        notify(`Land Expanded! (Level ${nextLevel})`);
    } else {
        notify(`Need ${cost}G to expand!`);
    }
  };

  const handleCraft = (recipeId: string) => {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) return;

    const canCraft = recipe.inputs.every(input => (gameState.inventory[input.item] || 0) >= input.count);
    
    if (canCraft) {
      setGameState(prev => {
        const newInv = { ...prev.inventory };
        recipe.inputs.forEach(input => {
          newInv[input.item] -= input.count;
        });
        newInv[recipe.output] = (newInv[recipe.output] || 0) + 1;
        
        const xpReward = getAdjustedXp(recipe.xpReward, prev.activeMascot);
        const newXp = prev.xp + xpReward;
        const newLevel = getLevelFromXp(newXp);
        
        return {
          ...prev,
          inventory: newInv,
          xp: newXp,
          level: newLevel,
           unlockedItems: Object.values(ITEMS).filter(i => i.unlockLevel <= newLevel).map(i => i.id)
        };
      });
      notify(`Crafted ${ITEMS[recipe.output].name}`);
    } else {
      notify("Missing ingredients!");
    }
  };

  const handleSell = (item: ItemType) => {
    if ((gameState.inventory[item] || 0) > 0) {
      setGameState(prev => {
        const newInv = { ...prev.inventory };
        newInv[item]--;
        return {
          ...prev,
          inventory: newInv,
          money: prev.money + ITEMS[item].sellPrice
        };
      });
    }
  };

  const handleCompleteOrder = (orderId: string) => {
    const order = gameState.orders.find(o => o.id === orderId);
    if (!order) return;

    const canFulfill = order.items.every(req => (gameState.inventory[req.item] || 0) >= req.count);

    if (canFulfill) {
      setGameState(prev => {
        const newInv = { ...prev.inventory };
        order.items.forEach(req => {
           newInv[req.item] -= req.count;
        });
        
        const moneyReward = getAdjustedOrderMoney(order.rewardMoney, prev.activeMascot);
        const xpReward = getAdjustedXp(order.rewardXp, prev.activeMascot);

        const newXp = prev.xp + xpReward;
        const newLevel = getLevelFromXp(newXp);
        if (newLevel > prev.level) notify(`Level Up! Level ${newLevel}`);

        return {
          ...prev,
          money: prev.money + moneyReward,
          xp: newXp,
          level: newLevel,
          inventory: newInv,
          orders: prev.orders.filter(o => o.id !== orderId),
          unlockedItems: Object.values(ITEMS).filter(i => i.unlockLevel <= newLevel).map(i => i.id)
        };
      });
      notify("Order Complete!");
    } else {
      notify("Missing items for order!");
    }
  };

  const inputFileRef = useRef<HTMLInputElement>(null);

  const exportSave = () => {
    const dataStr = JSON.stringify({ ...gameState, lastSaveTime: Date.now() });
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `pixel_farm_save_${new Date().toISOString().slice(0,10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importSave = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);
        let newPlots = initializePlots(0);
        let expansionLvl = raw.expansionLevel || 0;

        if (Array.isArray(raw.plots) && raw.plots.length === 144) {
            notify("Migrating old save...");
            expansionLvl = Math.max(expansionLvl, 2); 
            newPlots = initializePlots(expansionLvl);
            for(let r=0; r<12; r++) {
                for(let c=0; c<12; c++) {
                    const oldIdx = r*12 + c;
                    const newR = r + 3;
                    const newC = c + 3;
                    const newIdx = newR * 18 + newC;
                    const oldP = raw.plots[oldIdx];
                    newPlots[newIdx] = {
                        ...newPlots[newIdx],
                        plantedCrop: oldP.plantedCrop,
                        plantTime: oldP.plantTime,
                        isWithered: oldP.isWithered,
                        occupiedBy: oldP.occupiedBy !== null ? (Math.floor(oldP.occupiedBy/12)+3)*18 + (oldP.occupiedBy%12+3) : null
                    };
                }
            }
        } else if (Array.isArray(raw.plots) && raw.plots.length === TOTAL_PLOTS) {
            newPlots = raw.plots;
        }

        const safeState: GameState = {
            ...INITIAL_GAME_STATE,
            ...raw,
            plots: newPlots,
            expansionLevel: expansionLvl,
            inventory: raw.inventory || {},
            orders: raw.orders || [],
            ownedMascots: raw.ownedMascots || [],
            unlockedItems: raw.unlockedItems || [ItemType.WHEAT],
            weather: raw.weather || WeatherType.SUNNY,
            weatherEndTime: raw.weatherEndTime || Date.now() + 60000,
            gameTime: raw.gameTime || 6.0,
            activeEvent: raw.activeEvent || null
        };

        const { updatedState, messages } = calculateOfflineProgress(safeState);
        setGameState(updatedState);
        messages.forEach(msg => notify(msg));
        notify("Game Loaded Successfully!");
      } catch (err) {
        console.error(err);
        notify("Failed to load save");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const buyMascot = (mascotId: MascotType) => {
    const mascot = MASCOTS[mascotId];
    if (gameState.money >= mascot.price) {
        setGameState(prev => ({
            ...prev,
            money: prev.money - mascot.price,
            ownedMascots: [...prev.ownedMascots, mascotId],
            activeMascot: prev.activeMascot || mascotId 
        }));
        notify(`You adopted the ${mascot.name}!`);
    } else {
        notify("Not enough money!");
    }
  };

  const equipMascot = (mascotId: MascotType) => {
      setGameState(prev => ({ ...prev, activeMascot: mascotId }));
      notify(`Equipped ${MASCOTS[mascotId].name}`);
  };

  // --- RENDER HELPERS ---

  const getCropColor = (itemType: ItemType) => {
    if (itemType.includes('WHEAT')) return 'bg-yellow-200';
    if (itemType.includes('CORN')) return 'bg-yellow-500';
    if (itemType.includes('CARROT')) return 'bg-orange-500';
    if (itemType.includes('PUMPKIN')) return 'bg-orange-700';
    if (itemType.includes('TOMATO')) return 'bg-red-500';
    if (itemType.includes('LETTUCE')) return 'bg-green-400';
    if (itemType.includes('POTATO')) return 'bg-amber-200';
    if (itemType.includes('BERRY')) return 'bg-purple-500';
    if (itemType.includes('MELON')) return 'bg-green-300';
    if (itemType.includes('TREE')) return 'bg-emerald-800';
    return 'bg-green-600';
  };

  const getSoilColor = (tier: number, isUnlocked: boolean) => {
      if (!isUnlocked) return 'bg-[#4a6741] border-[#3e5736]';
      switch(tier) {
          case 0: return 'bg-[#795548] border-[#5d4037]';
          case 1: return 'bg-[#6d4c41] border-[#4e342e]'; 
          case 2: return 'bg-[#5d4037] border-[#3e2723]';
          case 3: return 'bg-[#4e342e] border-[#3e2723]';
          case 4: return 'bg-[#3e2723] border-[#251815]';
          case 5: return 'bg-[#281a17] border-black';
          default: return 'bg-[#795548]';
      }
  };

  const getDayPhaseColor = () => {
      const h = gameState.gameTime;
      // Night: 22 - 5
      if (h >= 22 || h < 5) return 'bg-blue-900/40 mix-blend-multiply'; 
      // Dawn: 5 - 7
      if (h >= 5 && h < 7) return 'bg-orange-500/20 mix-blend-overlay';
      // Dusk: 18 - 20
      if (h >= 18 && h < 20) return 'bg-pink-500/20 mix-blend-overlay';
      // Night start: 20 - 22
      if (h >= 20 && h < 22) return 'bg-indigo-900/30 mix-blend-multiply';
      // Day
      return '';
  };

  const formatGameTime = () => {
      const h = Math.floor(gameState.gameTime);
      const m = Math.floor((gameState.gameTime - h) * 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const getWeatherOverlay = () => {
    switch (gameState.weather) {
        case WeatherType.RAINY:
            return (
                <div className="absolute inset-0 pointer-events-none z-30 opacity-40 mix-blend-overlay flex overflow-hidden">
                    <style>{`
                        @keyframes rain { 0% { background-position: 0% 0%; } 100% { background-position: 20% 100%; } }
                        .rain-layer {
                            width: 100%; height: 100%;
                            background-image: linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
                            background-size: 2px 30px;
                            animation: rain 0.5s linear infinite;
                        }
                    `}</style>
                    <div className="rain-layer"></div>
                </div>
            );
        case WeatherType.SNOWY:
            return (
                <div className="absolute inset-0 pointer-events-none z-30 opacity-60">
                     <style>{`
                        @keyframes snow { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
                        .snowflake { position: absolute; background: white; border-radius: 50%; width: 4px; height: 4px; animation: snow linear infinite; }
                     `}</style>
                     {Array.from({length: 20}).map((_, i) => (
                         <div key={i} className="snowflake" style={{ 
                             left: `${Math.random()*100}%`, 
                             animationDuration: `${Math.random()*5+5}s`,
                             animationDelay: `${Math.random()*5}s`,
                             opacity: Math.random()
                         }}></div>
                     ))}
                     <div className="absolute inset-0 bg-white/10 mix-blend-soft-light"></div>
                </div>
            );
        case WeatherType.CLOUDY:
            return <div className="absolute inset-0 pointer-events-none z-30 bg-black/20 mix-blend-multiply transition-colors duration-1000"></div>;
        case WeatherType.WINDY:
             return <div className="absolute inset-0 pointer-events-none z-30 bg-yellow-900/5 mix-blend-overlay"></div>;
        default: return null;
    }
  };

  const getWeatherIcon = () => {
      switch(gameState.weather) {
          case WeatherType.SUNNY: return '☀️';
          case WeatherType.RAINY: return '🌧️';
          case WeatherType.CLOUDY: return '☁️';
          case WeatherType.SNOWY: return '❄️';
          case WeatherType.WINDY: return '🍃';
      }
  };

  const renderGrid = () => {
    return (
      <div 
        className="grid gap-0.5 bg-stone-950 p-2 rounded shadow-2xl relative z-10 select-none"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
        onMouseLeave={() => setIsDragging(false)}
      >
        {gameState.plots.map((plot, index) => {
          if (plot.occupiedBy !== null) {
              return (
                 <div 
                    key={plot.id} 
                    className={`w-6 h-6 sm:w-8 sm:h-8 ${getSoilColor(plot.tier, plot.isUnlocked)}`}
                    onMouseEnter={() => { if (isDragging) handlePlotInteraction(index); }}
                    onMouseDown={() => { setIsDragging(true); handlePlotInteraction(index); }}
                 />
              );
          }

          let content = null;
          let progress = 0;
          let isReady = false;
          let cropStyle = {};

          if (plot.isUnlocked && plot.plantedCrop && plot.plantTime) {
             const def = ITEMS[plot.plantedCrop];
             const elapsed = now - plot.plantTime;
             const duration = getAdjustedGrowthTime(plot.plantedCrop, gameState.activeMascot); 
             progress = Math.min(100, (elapsed / duration) * 100);
             isReady = progress >= 100;

             const widthMult = def.width || 1;
             const heightMult = def.height || 1;
             
             if (widthMult > 1 || heightMult > 1) {
                 cropStyle = {
                     width: `calc(${widthMult * 100}% + ${(widthMult - 1) * 0.125}rem)`,
                     height: `calc(${heightMult * 100}% + ${(heightMult - 1) * 0.125}rem)`,
                     zIndex: 20
                 };
             }
             
             const swayClass = (gameState.weather === WeatherType.WINDY || gameState.weather === WeatherType.RAINY) 
                ? 'animate-[wiggle_1s_ease-in-out_infinite]' 
                : '';
             
             content = (
               <div 
                 className={`absolute top-0 left-0 transition-all ${isReady ? 'animate-bounce' : swayClass} pointer-events-none`}
                 style={{ width: '100%', height: '100%', ...cropStyle }}
               >
                 <style>{`
                    @keyframes wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
                 `}</style>
                 <div className={`w-full h-full ${getCropColor(plot.plantedCrop)} rounded-sm shadow-inner relative border border-black/20 overflow-hidden`}>
                    {!isReady && (
                        <div className="absolute bottom-0 w-full bg-black/40 transition-all duration-500" style={{ height: `${100 - progress}%` }}></div>
                    )}
                    {isReady && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-50">
                            <span className="text-black text-[8px] font-bold opacity-50">^_^</span>
                        </div>
                    )}
                 </div>
               </div>
             );
          } else if (!plot.isUnlocked) {
               content = <div className="w-full h-full flex items-center justify-center text-green-900/20 text-[10px]">🔒</div>;
          }

          return (
            <div 
              key={plot.id}
              onMouseDown={() => { setIsDragging(true); handlePlotInteraction(index); }}
              onMouseEnter={() => { if (isDragging) handlePlotInteraction(index); }}
              className={`
                w-6 h-6 sm:w-8 sm:h-8
                border 
                ${getSoilColor(plot.tier, plot.isUnlocked)}
                ${plot.isUnlocked ? 'hover:border-yellow-400 cursor-pointer' : 'cursor-not-allowed'}
                relative
                group
              `}
            >
              {content}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-screen w-screen bg-[#4a6741] flex flex-col font-mono text-stone-100 relative overflow-hidden transition-colors duration-1000">
      
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-100 pointer-events-none z-0"
        style={{
            backgroundImage: gameState.forestTexture ? `url(${gameState.forestTexture})` : 'none',
            backgroundSize: '128px 128px',
            backgroundRepeat: 'repeat',
            filter: gameState.weather === WeatherType.RAINY ? 'brightness(0.6) grayscale(0.3)' : 
                    gameState.weather === WeatherType.CLOUDY ? 'brightness(0.8)' : 
                    gameState.weather === WeatherType.SNOWY ? 'brightness(1.1) contrast(0.8)' : 
                    'brightness(0.9)'
        }}
      >
        {!gameState.forestTexture && (
            <div className="w-full h-full bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-green-800 to-green-900 opacity-50"></div>
        )}
      </div>

      {/* Time & Weather Overlay */}
      {getWeatherOverlay()}
      <div className={`absolute inset-0 pointer-events-none z-10 transition-colors duration-[2000ms] ${getDayPhaseColor()}`}></div>

      {/* Ambient Life Layer */}
      <div className="absolute inset-0 pointer-events-none z-1 overflow-hidden">
        {ambientEntities.map(entity => {
            const age = now - entity.createdAt;
            let transform = `translate(0,0)`;
            let opacity = 1;
            let icon = '';

            if (entity.type === 'BUTTERFLY') {
                icon = '🦋';
                const xOffset = Math.sin(age / 500) * 50;
                const yOffset = Math.cos(age / 700) * 50;
                transform = `translate(${xOffset}px, ${yOffset}px)`;
                if (age > 8000) opacity = 1 - ((age - 8000) / 2000); 
            } else if (entity.type === 'DOG') {
                icon = '🐕';
                const progress = age / 8000;
                const distance = 800; 
                transform = `translateX(${progress * distance}px)`;
                if (age > 7500) opacity = 0;
            } else if (entity.type === 'FLOWER') {
                icon = '🌻';
                if (age < 1000) opacity = age / 1000;
                if (age > 14000) opacity = 1 - ((age - 14000) / 1000);
            }

            return (
                <div 
                    key={entity.id}
                    className="absolute transition-transform duration-75"
                    style={{
                        top: `${entity.y}%`,
                        left: `${entity.x}%`,
                        transform,
                        opacity,
                        fontSize: entity.type === 'DOG' ? '24px' : '16px'
                    }}
                >
                    {icon}
                </div>
            );
        })}
      </div>

      {/* Top Bar */}
      <div className="relative z-40 bg-stone-900/90 p-3 flex justify-between items-center shadow-lg border-b-4 border-stone-700 h-20">
         <div className="flex gap-4 items-center">
             <div className="flex flex-col">
                <h1 className="text-xs text-stone-400 uppercase tracking-widest leading-none">Level</h1>
                <span className="text-4xl font-bold text-yellow-500 leading-none">{gameState.level}</span>
             </div>
             
             <div className="flex flex-col justify-center gap-1 h-full">
                 <div className="bg-stone-800 px-3 py-1 rounded flex gap-2 items-center border border-stone-600 text-sm">
                     <CoinIcon /> {gameState.money}
                 </div>
                 <div className="bg-stone-800 px-3 py-1 rounded flex gap-2 items-center border border-stone-600 text-sm">
                     <XpIcon /> {Math.floor(gameState.xp)} / {LEVEL_XP[gameState.level + 1] || 'MAX'}
                 </div>
             </div>
         </div>

         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-80">
            <span className="text-2xl">{getWeatherIcon()}</span>
            <span className="text-lg font-mono font-bold text-yellow-200">{formatGameTime()}</span>
         </div>
         
         <div className="flex items-center gap-4">
             {gameState.activeMascot && (
                 <div className="hidden sm:flex items-center gap-2 bg-stone-800 px-3 py-1 rounded border border-yellow-500/50">
                     <span className="text-2xl" role="img" aria-label="mascot">{MASCOTS[gameState.activeMascot].icon}</span>
                     <div className="flex flex-col">
                        <span className="text-[10px] text-stone-400 uppercase leading-none">Companion</span>
                        <span className="text-xs font-bold text-yellow-100">{MASCOTS[gameState.activeMascot].name}</span>
                     </div>
                 </div>
             )}
             
             <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className="bg-stone-800 p-2 rounded border border-stone-600 hover:bg-stone-700"
             >
                 {isSidebarOpen ? '👉' : '👈'}
             </button>
         </div>
         
         <div className="absolute top-24 right-4 flex flex-col gap-1 pointer-events-none z-50 items-end">
            {notifications.map(n => (
                <div key={n.id} className="bg-black/80 text-white px-3 py-1 rounded text-sm animate-fade-in-down border border-stone-500 shadow-lg">
                    {n.text}
                </div>
            ))}
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative z-20">
        
        {/* Left: The Farm */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto relative custom-scrollbar">
            
            {/* Active Event Widget */}
            {gameState.activeEvent && (
                <div className="absolute top-4 left-4 z-50 bg-stone-900/90 border border-yellow-500 p-3 rounded shadow-xl w-64 animate-pulse-slow">
                    <h3 className="text-yellow-500 font-bold text-sm uppercase mb-1">
                        🏆 {GAME_EVENTS.find(e => e.id === gameState.activeEvent!.eventId)?.title}
                    </h3>
                    <p className="text-xs text-stone-300 mb-2">
                        {GAME_EVENTS.find(e => e.id === gameState.activeEvent!.eventId)?.description}
                    </p>
                    <div className="w-full bg-stone-700 h-2 rounded mb-1">
                        <div 
                            className="bg-yellow-500 h-full rounded transition-all duration-500" 
                            style={{ width: `${(gameState.activeEvent.currentProgress / GAME_EVENTS.find(e => e.id === gameState.activeEvent!.eventId)!.targetAmount) * 100}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-xs text-stone-400 font-mono">
                        <span>{gameState.activeEvent.currentProgress} / {GAME_EVENTS.find(e => e.id === gameState.activeEvent!.eventId)!.targetAmount}</span>
                        <span>{Math.ceil((gameState.activeEvent.endTime - now) / 1000)}s</span>
                    </div>
                </div>
            )}

            {renderGrid()}
            
            {/* Quick Actions Panel */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30">
                 <Tooltip text="Harvest all ready crops">
                    <button 
                        onClick={handleHarvestAll}
                        className="bg-yellow-600 hover:bg-yellow-500 text-white border-b-4 border-yellow-800 active:border-b-0 active:translate-y-1 px-4 py-2 rounded font-bold shadow-lg flex items-center gap-2"
                    >
                        🧺 Harvest All
                    </button>
                 </Tooltip>
                 
                 {gameState.expansionLevel < 5 && (
                    <Tooltip text={`Unlock next land tier (Yield Bonus +${((gameState.expansionLevel + 1) * 0.2 + 1).toFixed(1)}x)`}>
                        <button 
                            onClick={handleExpandLand}
                            className="bg-green-700 hover:bg-green-600 text-white border-b-4 border-green-900 active:border-b-0 active:translate-y-1 px-4 py-2 rounded font-bold shadow-lg flex items-center gap-2"
                        >
                            🚧 Expand ({EXPANSION_COSTS[gameState.expansionLevel + 1]}G)
                        </button>
                    </Tooltip>
                 )}
            </div>
        </div>

        {/* Right: UI Panel (Collapsible) */}
        <div 
            className={`
                bg-stone-900/95 border-l-4 border-stone-700 flex flex-col shadow-2xl relative z-40 transition-all duration-300 ease-in-out
                ${isSidebarOpen ? 'w-80 sm:w-96 translate-x-0' : 'w-0 translate-x-full opacity-0'}
            `}
        >
            {/* Tabs */}
            <div className="flex border-b border-stone-700 min-w-[20rem]">
                {(['INVENTORY', 'CRAFTING', 'ORDERS', 'MASCOTS'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 text-sm font-bold hover:bg-stone-800 transition-colors ${activeTab === tab ? 'bg-stone-800 text-yellow-500 border-b-2 border-yellow-500' : 'text-stone-500'}`}
                    >
                        {tab.slice(0, 3)}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar min-w-[20rem]">
                
                {/* INVENTORY & PLANTING */}
                {activeTab === 'INVENTORY' && (
                    <div className="space-y-4">
                        <div className="bg-stone-800 p-3 rounded border border-stone-600">
                            <h3 className="text-stone-400 text-xs uppercase mb-2">Tools</h3>
                             <button
                                onClick={() => setSelectedTool(null)}
                                className={`w-full text-left px-3 py-2 rounded mb-1 text-sm border ${selectedTool === null ? 'border-yellow-500 bg-stone-700' : 'border-stone-700 hover:bg-stone-700'}`}
                             >
                                ✋ Cursor (Inspect)
                             </button>
                             <button
                                onClick={() => setSelectedTool('HARVEST')}
                                className={`w-full text-left px-3 py-2 rounded mb-1 text-sm border ${selectedTool === 'HARVEST' ? 'border-yellow-500 bg-stone-700' : 'border-stone-700 hover:bg-stone-700'}`}
                             >
                                🧺 Harvest
                             </button>
                        </div>

                        <div className="bg-stone-800 p-3 rounded border border-stone-600">
                            <h3 className="text-stone-400 text-xs uppercase mb-2">Seeds (Level {gameState.level})</h3>
                            <div className="grid grid-cols-4 gap-2">
                                {Object.values(ITEMS).filter(i => i.type === 'CROP' && i.unlockLevel <= gameState.level).map(crop => (
                                    <Tooltip key={crop.id} text={`${crop.name} (${crop.width}x${crop.height}): ${crop.seedCost}G`}>
                                        <button
                                            onClick={() => setSelectedTool(crop.id)}
                                            className={`
                                                aspect-square flex flex-col items-center justify-center p-1 rounded border-2
                                                ${selectedTool === crop.id ? 'border-yellow-500 bg-stone-700' : 'border-stone-600 hover:bg-stone-700'}
                                            `}
                                        >
                                            <div className={`w-3 h-3 ${getCropColor(crop.id)} rounded-full mb-1`}></div>
                                            <span className="text-[9px]">{crop.seedCost}G</span>
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>

                        <div className="bg-stone-800 p-3 rounded border border-stone-600">
                            <h3 className="text-stone-400 text-xs uppercase mb-2">Storage</h3>
                            <div className="space-y-1">
                                {Object.entries(gameState.inventory).map(([itemId, count]: [string, number]) => {
                                    if (count <= 0) return null;
                                    const item = ITEMS[itemId as ItemType];
                                    return (
                                        <div key={itemId} className="flex justify-between items-center text-sm p-1 hover:bg-stone-700 rounded group">
                                            <div className="flex items-center gap-2">
                                                <span className="text-stone-300">{item.name}</span>
                                                <span className="text-stone-500">x{count}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleSell(itemId as ItemType)}
                                                className="text-yellow-500 hover:text-yellow-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                            >
                                                Sell {item.sellPrice}G
                                            </button>
                                        </div>
                                    )
                                })}
                                {Object.values(gameState.inventory).every(c => c === 0) && (
                                    <span className="text-xs text-stone-500 italic">Inventory empty</span>
                                )}
                            </div>
                        </div>
                        
                        <div className="bg-stone-800 p-3 rounded border border-stone-600 mt-4">
                             <h3 className="text-stone-400 text-xs uppercase mb-2">System</h3>
                             <div className="grid grid-cols-2 gap-2">
                                 <button onClick={exportSave} className="bg-blue-900/50 hover:bg-blue-800 text-blue-200 text-xs py-2 px-3 rounded border border-blue-800">
                                     Export Save
                                 </button>
                                 <label className="bg-green-900/50 hover:bg-green-800 text-green-200 text-xs py-2 px-3 rounded border border-green-800 text-center cursor-pointer">
                                     Import Save
                                     <input type="file" accept=".json" onChange={importSave} ref={inputFileRef} className="hidden" />
                                 </label>
                             </div>
                        </div>
                    </div>
                )}

                {/* CRAFTING */}
                {activeTab === 'CRAFTING' && (
                     <div className="space-y-3">
                        {RECIPES.filter(r => r.unlockLevel <= gameState.level).map(recipe => {
                            const outputItem = ITEMS[recipe.output];
                            const canCraft = recipe.inputs.every(input => (gameState.inventory[input.item] || 0) >= input.count);
                            const craftTime = getAdjustedCraftTime(recipe.craftTimeMs, gameState.activeMascot);
                            return (
                                <div key={recipe.id} className="bg-stone-800 p-3 rounded border border-stone-600">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-yellow-200">{outputItem.name}</span>
                                        <span className="text-xs text-blue-300">+{getAdjustedXp(recipe.xpReward, gameState.activeMascot)}XP</span>
                                    </div>
                                    <div className="text-xs text-stone-400 mb-2 flex flex-wrap gap-2">
                                        Requires: 
                                        {recipe.inputs.map((input, idx) => (
                                            <span key={idx} className={(gameState.inventory[input.item] || 0) >= input.count ? 'text-green-400' : 'text-red-400'}>
                                                {input.count} {ITEMS[input.item].name}
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => handleCraft(recipe.id)}
                                        disabled={!canCraft}
                                        className={`w-full py-1 text-sm rounded ${canCraft ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-stone-700 text-stone-500 cursor-not-allowed'}`}
                                    >
                                        Craft ({craftTime / 1000}s)
                                    </button>
                                </div>
                            );
                        })}
                     </div>
                )}

                {/* ORDERS */}
                {activeTab === 'ORDERS' && (
                    <div className="space-y-3">
                         {gameState.orders.length === 0 && (
                            <div className="text-center p-4 text-stone-500 text-sm">
                                Waiting for orders... <br/>
                                <span className="text-xs">(Orders arrive over time)</span>
                            </div>
                         )}
                         {gameState.orders.map(order => {
                             const canFulfill = order.items.every(req => (gameState.inventory[req.item] || 0) >= req.count);
                             const rewardMoney = getAdjustedOrderMoney(order.rewardMoney, gameState.activeMascot);
                             const rewardXp = getAdjustedXp(order.rewardXp, gameState.activeMascot);
                             const timeLeft = Math.max(0, Math.ceil((order.expiresAt - now) / 1000));
                             
                             return (
                                <div 
                                    key={order.id} 
                                    className={`
                                        p-3 rounded border-b-4 relative transition-all
                                        ${order.isEmergency 
                                            ? 'bg-red-900/20 border-red-800 text-red-100 ring-1 ring-red-500' 
                                            : 'bg-stone-100 text-stone-900 border-stone-300'
                                        }
                                    `}
                                >
                                    <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full ${order.isEmergency ? 'bg-red-800' : 'bg-stone-400'}`}></div>
                                    
                                    <div className="flex justify-between items-start mb-2 border-b border-black/10 pb-1">
                                        <div className="flex flex-col">
                                            <span className={`text-xs font-bold uppercase ${order.isEmergency ? 'text-red-400' : 'text-stone-500'}`}>
                                                {order.isEmergency ? '⚠ URGENT REQUEST' : 'Market Order'}
                                            </span>
                                            <span className="font-bold text-sm">{order.requesterName}</span>
                                        </div>
                                        <span className="text-xs font-mono">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                                    </div>

                                    <p className="text-xs italic opacity-80 mb-3">"{order.requesterQuote}"</p>

                                    <div className="space-y-1 mb-3">
                                        {order.items.map((req, i) => (
                                            <div key={i} className="flex justify-between text-sm border-b border-black/5 pb-1">
                                                <span>{ITEMS[req.item].name} x{req.count}</span>
                                                <span className={(gameState.inventory[req.item] || 0) >= req.count ? 'text-green-600 font-bold' : 'text-red-500'}>
                                                    Have: {gameState.inventory[req.item] || 0}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center bg-black/10 p-2 rounded mb-2">
                                        <span className="font-bold text-yellow-700">{rewardMoney} G</span>
                                        <span className="font-bold text-blue-700">{rewardXp} XP</span>
                                    </div>
                                    <button
                                        onClick={() => handleCompleteOrder(order.id)}
                                        disabled={!canFulfill}
                                        className={`w-full py-2 font-bold text-white rounded shadow-sm ${canFulfill ? 'bg-green-600 hover:bg-green-500' : 'bg-stone-400 cursor-not-allowed'}`}
                                    >
                                        {canFulfill ? 'Deliver!' : 'Gathering...'}
                                    </button>
                                </div>
                             )
                         })}
                    </div>
                )}

                {/* MASCOTS */}
                {activeTab === 'MASCOTS' && (
                    <div className="space-y-4">
                        <div className="text-xs text-stone-400 p-2 bg-stone-800 rounded border border-stone-600">
                            Equip a mascot to gain special farming powers! You can only have one active at a time.
                        </div>

                        {Object.values(MASCOTS).map(mascot => {
                            const isOwned = gameState.ownedMascots.includes(mascot.id);
                            const isActive = gameState.activeMascot === mascot.id;
                            const canAfford = gameState.money >= mascot.price;

                            return (
                                <div key={mascot.id} className={`p-3 rounded border-2 relative overflow-hidden ${isActive ? 'bg-stone-800 border-yellow-500' : 'bg-stone-800 border-stone-600'}`}>
                                    {isActive && <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[10px] px-2 font-bold">EQUIPPED</div>}
                                    
                                    <div className="flex gap-3 items-start mb-3">
                                        <div className="text-4xl bg-stone-900 p-2 rounded border border-stone-700">{mascot.icon}</div>
                                        <div>
                                            <h4 className={`font-bold ${isOwned ? 'text-white' : 'text-stone-400'}`}>{mascot.name}</h4>
                                            <p className="text-xs text-stone-500 leading-tight mt-1">{mascot.description}</p>
                                        </div>
                                    </div>

                                    {isOwned ? (
                                        <button 
                                            onClick={() => equipMascot(mascot.id)}
                                            disabled={isActive}
                                            className={`w-full py-1 text-sm rounded ${isActive ? 'bg-stone-700 text-stone-500 cursor-default' : 'bg-green-600 hover:bg-green-500 text-white'}`}
                                        >
                                            {isActive ? 'Active' : 'Equip'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => buyMascot(mascot.id)}
                                            disabled={!canAfford}
                                            className={`w-full py-1 text-sm rounded flex justify-center items-center gap-1 ${canAfford ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-stone-700 text-stone-500 cursor-not-allowed'}`}
                                        >
                                            Buy for {mascot.price}G
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
