
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, ItemType, GRID_SIZE, Plot, Order } from './types';
import { INITIAL_GAME_STATE, LEVEL_XP } from './constants';
import { ITEMS } from './items';
import { RECIPES } from './recipes';
import { initializePlots, calculateOfflineProgress, getLevelFromXp, generateNewOrder } from './services/gameService';
import { generateForestTexture } from './services/geminiService';
import { Tooltip } from './components/Tooltip';

// Icons
const CoinIcon = () => <span className="text-yellow-400 font-bold">G</span>;
const XpIcon = () => <span className="text-blue-400 font-bold">XP</span>;

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
     return { ...INITIAL_GAME_STATE, plots: initializePlots() };
  });
  
  const [selectedTool, setSelectedTool] = useState<ItemType | 'HARVEST' | null>(null);
  const [notifications, setNotifications] = useState<{id: number, text: string}[]>([]);
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'CRAFTING' | 'ORDERS' | 'SETTINGS'>('INVENTORY');
  const [now, setNow] = useState(Date.now());

  // Game Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      
      // Randomly generate orders if we have fewer than 3
      setGameState(prev => {
        if (prev.orders.length < 3 && Math.random() < 0.05) { // Small chance every second
             const newOrder = generateNewOrder(prev.level, prev.orders);
             return { ...prev, orders: [...prev.orders, newOrder] };
        }
        return prev;
      });

    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Notifications helper
  const notify = useCallback((text: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, text }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  // Helper to check if a crop can be planted at a specific index
  const canPlantAt = (index: number, width: number, height: number, plots: Plot[]) => {
      const startRow = Math.floor(index / GRID_SIZE);
      const startCol = index % GRID_SIZE;

      if (startCol + width > GRID_SIZE) return false;
      if (startRow + height > GRID_SIZE) return false;

      for (let r = 0; r < height; r++) {
          for (let c = 0; c < width; c++) {
              const targetIdx = index + (r * GRID_SIZE) + c;
              if (plots[targetIdx].plantedCrop || plots[targetIdx].occupiedBy !== null) {
                  return false;
              }
          }
      }
      return true;
  };

  // Actions
  const handlePlotClick = (plotIndex: number) => {
    const plot = gameState.plots[plotIndex];
    const currentTime = Date.now();

    // HANDLE OCCUPIED PLOTS (Redirect to root)
    if (plot.occupiedBy !== null) {
        handlePlotClick(plot.occupiedBy);
        return;
    }

    // HARVEST
    if (plot.plantedCrop && plot.plantTime) {
       const cropDef = ITEMS[plot.plantedCrop];
       if (cropDef.growthTimeMs && (currentTime - plot.plantTime >= cropDef.growthTimeMs)) {
         // Harvest successful
         const xpGain = cropDef.xpReward || 0;
         
         setGameState(prev => {
            const newInventory = { ...prev.inventory };
            newInventory[plot.plantedCrop!] = (newInventory[plot.plantedCrop!] || 0) + 1;
            
            const newPlots = [...prev.plots];
            
            // Clear root plot
            newPlots[plotIndex] = { ...plot, plantedCrop: null, plantTime: null, occupiedBy: null };
            
            // Clear occupied plots
            const w = cropDef.width || 1;
            const h = cropDef.height || 1;
            for (let r = 0; r < h; r++) {
                for (let c = 0; c < w; c++) {
                    if (r === 0 && c === 0) continue; // Skip root
                    const targetIdx = plotIndex + (r * GRID_SIZE) + c;
                    newPlots[targetIdx] = { ...newPlots[targetIdx], occupiedBy: null, plantedCrop: null };
                }
            }
            
            const newXp = prev.xp + xpGain;
            const newLevel = getLevelFromXp(newXp);
            
            if (newLevel > prev.level) notify(`Level Up! You are now level ${newLevel}`);

            return {
              ...prev,
              inventory: newInventory,
              plots: newPlots,
              xp: newXp,
              level: newLevel,
              unlockedItems: Object.values(ITEMS).filter(i => i.unlockLevel <= newLevel).map(i => i.id)
            };
         });
         notify(`Harvested ${cropDef.name} (+${xpGain} XP)`);
         return;
       } else {
         notify("Not ready yet!");
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
           notify("Not enough space!");
           return;
       }

       const cost = cropDef.seedCost || 0;
       
       if (gameState.money >= cost) {
         setGameState(prev => {
           const newPlots = [...prev.plots];
           // Set Root
           newPlots[plotIndex] = {
             ...plot,
             plantedCrop: selectedTool,
             plantTime: Date.now(),
             isWithered: false,
             occupiedBy: null
           };

           // Set Occupied
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
         notify("Not enough money for seeds!");
       }
    }
  };

  const handleCraft = (recipeId: string) => {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe) return;

    // Check ingredients
    const canCraft = recipe.inputs.every(input => (gameState.inventory[input.item] || 0) >= input.count);
    
    if (canCraft) {
      setGameState(prev => {
        const newInv = { ...prev.inventory };
        // Remove ingredients
        recipe.inputs.forEach(input => {
          newInv[input.item] -= input.count;
        });
        // Add output
        newInv[recipe.output] = (newInv[recipe.output] || 0) + 1;
        
        const newXp = prev.xp + recipe.xpReward;
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
        
        const newXp = prev.xp + order.rewardXp;
        const newLevel = getLevelFromXp(newXp);
        if (newLevel > prev.level) notify(`Level Up! Level ${newLevel}`);

        return {
          ...prev,
          money: prev.money + order.rewardMoney,
          xp: newXp,
          level: newLevel,
          inventory: newInv,
          orders: prev.orders.filter(o => o.id !== orderId),
          unlockedItems: Object.values(ITEMS).filter(i => i.unlockLevel <= newLevel).map(i => i.id)
        };
      });
      notify(`Order Complete! +${order.rewardMoney}G +${order.rewardXp}XP`);
    } else {
      notify("Missing items for order!");
    }
  };

  // Import/Export
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
        const loadedState = JSON.parse(e.target?.result as string);
        // Validate basic structure
        if (loadedState.money !== undefined && loadedState.plots) {
          const { updatedState, messages } = calculateOfflineProgress(loadedState);
          setGameState(updatedState);
          messages.forEach(msg => notify(msg));
        } else {
          notify("Invalid save file");
        }
      } catch (err) {
        notify("Failed to load save");
      }
    };
    reader.readAsText(file);
  };

  const generateForest = async () => {
    notify("Generating magic forest...");
    const texture = await generateForestTexture();
    if (texture) {
      setGameState(prev => ({ ...prev, forestTexture: texture }));
      notify("Forest grown!");
    } else {
      notify("Failed to grow forest (AI Error)");
    }
  };

  // --- RENDER HELPERS ---

  const getCropColor = (itemType: ItemType) => {
    // Simple color mapping for variety
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

  const renderGrid = () => {
    return (
      <div 
        className="grid gap-1 bg-stone-800 p-2 rounded border-4 border-stone-700 shadow-2xl relative z-10"
        style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
      >
        {gameState.plots.map((plot) => {
          // If this plot is merely occupied by another crop, render a placeholder (or nothing visible)
          if (plot.occupiedBy !== null) {
              return (
                 <div 
                    key={plot.id} 
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[#5d4037]/50"
                 />
              );
          }

          let content = null;
          let progress = 0;
          let isReady = false;
          let cropStyle = {};

          if (plot.plantedCrop && plot.plantTime) {
             const def = ITEMS[plot.plantedCrop];
             const elapsed = now - plot.plantTime;
             const duration = def.growthTimeMs || 1000;
             progress = Math.min(100, (elapsed / duration) * 100);
             isReady = progress >= 100;

             // Multi-tile sizing logic
             // Tailwind gap-1 is 0.25rem (4px). 
             // We need to span X cells plus (X-1) gaps.
             const widthMult = def.width || 1;
             const heightMult = def.height || 1;
             
             // Dynamic style for multi-tile
             if (widthMult > 1 || heightMult > 1) {
                 cropStyle = {
                     width: `calc(${widthMult * 100}% + ${(widthMult - 1) * 0.25}rem)`,
                     height: `calc(${heightMult * 100}% + ${(heightMult - 1) * 0.25}rem)`,
                     zIndex: 20
                 };
             }
             
             content = (
               <div 
                 className={`absolute top-0 left-0 transition-all ${isReady ? 'animate-bounce' : ''}`}
                 style={{ width: '100%', height: '100%', ...cropStyle }}
               >
                 {/* Plant Graphic */}
                 <div className={`w-full h-full ${getCropColor(plot.plantedCrop)} rounded-sm shadow-inner relative border border-black/20 overflow-hidden`}>
                    {!isReady && (
                        <div className="absolute bottom-0 w-full bg-black/40 transition-all duration-500" style={{ height: `${100 - progress}%` }}></div>
                    )}
                    {/* Basic Face/Texture for character */}
                    {isReady && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-50">
                            <span className="text-black text-xs font-bold opacity-50">^_^</span>
                        </div>
                    )}
                 </div>
                 {/* Hover Info */}
                 <div className="hidden group-hover:flex absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1 rounded whitespace-nowrap z-50 pointer-events-none">
                    {def.name} {isReady ? '(Ready)' : `${Math.floor(progress)}%`}
                 </div>
               </div>
             );
          }

          return (
            <div 
              key={plot.id}
              onClick={() => handlePlotClick(plot.id)}
              className={`
                w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 
                bg-[#5d4037] border border-[#3e2723] 
                hover:border-yellow-400 cursor-pointer 
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
    <div className="h-screen w-screen bg-[#4a6741] flex flex-col font-mono text-stone-100 relative overflow-hidden">
      
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 opacity-100 pointer-events-none z-0"
        style={{
            backgroundImage: gameState.forestTexture ? `url(${gameState.forestTexture})` : 'none',
            backgroundSize: '128px 128px',
            backgroundRepeat: 'repeat',
            filter: 'brightness(0.8)'
        }}
      >
        {!gameState.forestTexture && (
            <div className="w-full h-full bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-green-800 to-green-900 opacity-50"></div>
        )}
      </div>

      {/* Top Bar */}
      <div className="relative z-20 bg-stone-900/90 p-3 flex justify-between items-center shadow-lg border-b-4 border-stone-700">
         <div className="flex gap-4 items-center">
             <div className="flex flex-col">
                <h1 className="text-xl font-bold text-yellow-500 leading-none">Pixel Farm</h1>
                <span className="text-xs text-stone-400">Level {gameState.level}</span>
             </div>
             <div className="bg-stone-800 px-3 py-1 rounded flex gap-2 items-center border border-stone-600">
                 <CoinIcon /> {gameState.money}
             </div>
             <div className="bg-stone-800 px-3 py-1 rounded flex gap-2 items-center border border-stone-600">
                 <XpIcon /> {Math.floor(gameState.xp)} / {LEVEL_XP[gameState.level + 1] || 'MAX'}
             </div>
         </div>
         
         {/* Toast Notifications */}
         <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col gap-1 pointer-events-none z-50">
            {notifications.map(n => (
                <div key={n.id} className="bg-black/80 text-white px-3 py-1 rounded text-sm animate-fade-in-down border border-stone-500">
                    {n.text}
                </div>
            ))}
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Left: The Farm */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            {renderGrid()}
        </div>

        {/* Right: UI Panel */}
        <div className="w-80 sm:w-96 bg-stone-900/95 border-l-4 border-stone-700 flex flex-col shadow-2xl">
            {/* Tabs */}
            <div className="flex border-b border-stone-700">
                {(['INVENTORY', 'CRAFTING', 'ORDERS', 'SETTINGS'] as const).map(tab => (
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
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                
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
                    </div>
                )}

                {/* CRAFTING */}
                {activeTab === 'CRAFTING' && (
                     <div className="space-y-3">
                        {RECIPES.filter(r => r.unlockLevel <= gameState.level).map(recipe => {
                            const outputItem = ITEMS[recipe.output];
                            const canCraft = recipe.inputs.every(input => (gameState.inventory[input.item] || 0) >= input.count);
                            return (
                                <div key={recipe.id} className="bg-stone-800 p-3 rounded border border-stone-600">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-yellow-200">{outputItem.name}</span>
                                        <span className="text-xs text-blue-300">+{recipe.xpReward}XP</span>
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
                                        Craft
                                    </button>
                                </div>
                            );
                        })}
                        {RECIPES.filter(r => r.unlockLevel > gameState.level).length > 0 && (
                            <div className="text-center text-xs text-stone-500 mt-4">
                                Level up to unlock more recipes!
                            </div>
                        )}
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
                             return (
                                <div key={order.id} className="bg-stone-100 text-stone-900 p-3 rounded border-b-4 border-stone-300 relative">
                                    {/* Paper Clip Visual */}
                                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-stone-400 rounded-full"></div>
                                    
                                    <h4 className="font-bold text-sm mb-2 uppercase tracking-wide">Market Order</h4>
                                    <div className="space-y-1 mb-3">
                                        {order.items.map((req, i) => (
                                            <div key={i} className="flex justify-between text-sm border-b border-stone-200 pb-1">
                                                <span>{ITEMS[req.item].name} x{req.count}</span>
                                                <span className={(gameState.inventory[req.item] || 0) >= req.count ? 'text-green-600 font-bold' : 'text-red-500'}>
                                                    Have: {gameState.inventory[req.item] || 0}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center bg-stone-200 p-2 rounded mb-2">
                                        <span className="font-bold text-yellow-700">{order.rewardMoney} G</span>
                                        <span className="font-bold text-blue-700">{order.rewardXp} XP</span>
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

                {/* SETTINGS */}
                {activeTab === 'SETTINGS' && (
                    <div className="space-y-4">
                        <div className="bg-stone-800 p-3 rounded border border-stone-600">
                             <h3 className="text-stone-400 text-xs uppercase mb-2">Data Management</h3>
                             <div className="grid grid-cols-2 gap-2">
                                 <button onClick={exportSave} className="bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 px-3 rounded">
                                     Export Save
                                 </button>
                                 <label className="bg-green-600 hover:bg-green-500 text-white text-sm py-2 px-3 rounded text-center cursor-pointer">
                                     Import Save
                                     <input type="file" accept=".json" onChange={importSave} ref={inputFileRef} className="hidden" />
                                 </label>
                             </div>
                        </div>

                        <div className="bg-stone-800 p-3 rounded border border-stone-600">
                            <h3 className="text-stone-400 text-xs uppercase mb-2">Environment</h3>
                            <p className="text-xs text-stone-500 mb-3">Use AI to generate a seamless forest border.</p>
                            <button 
                                onClick={generateForest}
                                disabled={!!gameState.forestTexture}
                                className={`w-full text-sm py-2 px-3 rounded ${gameState.forestTexture ? 'bg-stone-700 text-stone-500' : 'bg-purple-600 hover:bg-purple-500 text-white'}`}
                            >
                                {gameState.forestTexture ? 'Forest Generated' : 'Generate Forest (AI)'}
                            </button>
                        </div>
                        
                        <div className="text-center text-xs text-stone-600 mt-8">
                            Pixel Farm v1.1 <br/>
                            Built with React & Tailwind
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
