import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { AppConfig, Character, EditorFocus, Location, SubLocation, ProfileUnlock, UnlockCondition, LoreEntry } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from 'recharts';

interface PreviewWindowProps {
    config: AppConfig;
    setEditorFocus: (focus: EditorFocus) => void;
    onLocationUpdate: (locationId: string, newPosition: { x: number; y: number }, subLocationId?: string) => void;
}

// Helper function for deterministic location assignment in preview
const getPreviewLocationForCharacter = (char: Character, allLocs: Location[]): Location | undefined => {
    if (allLocs.length === 0) return undefined;
    
    // A simple hash function to create a deterministic-but-distributed index
    const simpleHash = (str: string): number => {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + charCode;
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash);
    };

    // Use a hash of the variable name (or ID as fallback) to pick a location.
    // This makes the preview location dependent on the variable config, not character order.
    const hash = simpleHash(char.locationVariable || char.id);
    return allLocs[hash % allLocs.length];
};

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative group flex items-center">
        {children}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
            {text}
        </div>
    </div>
);

const LockIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
);

const CharacterTabView: React.FC<{ char: Character, statSystem: 'bar' | 'radar' | 'doughnut', config: AppConfig, setEditorFocus: (focus: EditorFocus) => void }> = ({ char, statSystem, config, setEditorFocus }) => {
    const { uiLabels, characterStatSystemConfig } = config;
    const scale = config.size.width / 1000;

    const getStatValue = (stat: Character['stats'][0]) => {
        if (stat.type === 'fixed') return stat.value || 0;
        return 50; // Dummy value for variable stats in preview
    };

    const getGaugeValue = (gauge: Character['gauges'][0]) => {
         return 50; // Dummy value for preview bar width, consistent with stats
    };

    const statData = char.stats?.map(stat => ({ name: stat.name, value: getStatValue(stat), color: stat.color, fullMark: stat.max })) || [];

    return (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-y-auto custom-scrollbar" style={{ gap: `${1.5 * scale}rem` }}>
            <div className="flex flex-col items-center">
                <img 
                    src={char.images.default || 'https://via.placeholder.com/256'} 
                    alt={char.name} 
                    className="object-cover rounded-full border-4 border-white shadow-2xl cursor-pointer" 
                    style={{ 
                        width: `${256 * scale}px`, 
                        height: `${256 * scale}px`,
                        marginBottom: `${1 * scale}rem`
                    }}
                    onClick={() => setEditorFocus({target: {type: 'character', id: char.id, field: 'images'}})}
                />
                <h3 className="font-bold text-white cursor-pointer" style={{ fontSize: `${2.25 * scale}rem`}} onClick={() => setEditorFocus({target: {type: 'character', id: char.id, field: 'name'}})}>{char.name}</h3>
                <p className="text-gray-300 cursor-pointer" style={{ fontSize: `${1.125 * scale}rem`, marginBottom: `${0.5 * scale}rem`}} onClick={() => setEditorFocus({target: {type: 'character', id: char.id, field: 'origin'}})}>{`[${char.origin}]`}</p>
                <p className="text-cyan-300" style={{ fontSize: `${0.875 * scale}rem`, marginBottom: `${1 * scale}rem`}}>{uiLabels.character.currentLocationPrefix} [{char.locationVariable || '???'}]</p>
                
                <div className="w-full p-4 content-panel" style={{marginBottom: `${1 * scale}rem`}} onClick={() => setEditorFocus({target: {type: 'global', field: 'uiLabels'}})}>
                   <h4 className="font-semibold text-center text-yellow-400" style={{ fontSize: `${1.25 * scale}rem`, marginBottom: `${0.75 * scale}rem`}}>{uiLabels.character.relationshipTitle}</h4>
                   <div className="text-center" style={{marginBottom: `${0.5 * scale}rem`}}><p className="font-bold text-cyan-300" style={{ fontSize: `${1.5 * scale}rem`}}>[{char.relationshipVariable}]</p></div>
                   
                   <div className="w-full space-y-2" onClick={(e) => { e.stopPropagation(); setEditorFocus({target: { type: 'character', id: char.id, field: 'gauges' }})}}>
                        {char.gauges.map(gauge => {
                            const value = getGaugeValue(gauge);
                            return (
                                <div key={gauge.id}>
                                    <div className="flex justify-between items-center mb-1 text-gray-300" style={{ fontSize: `${0.875 * scale}rem`}}>
                                        <span>{gauge.name}</span>
                                        <span>[{gauge.variable}]/{gauge.max}</span>
                                    </div>
                                    <div className="w-full bg-black/30 rounded-full h-2.5"><div className="h-2.5 rounded-full" style={{ width: `${(value/gauge.max)*100}%`, backgroundColor: gauge.color }}></div></div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {statSystem === 'radar' && char.stats && char.stats.length > 2 && (
                    <div className="w-full p-4 content-panel flex flex-col" style={{height: `${256 * scale}px`}} onClick={() => setEditorFocus({target: {type: 'character', id: char.id, field: 'stats'}})}>
                        <h4 className="font-semibold text-center text-yellow-400" style={{ fontSize: `${1.25 * scale}rem`, marginBottom: `${0.75 * scale}rem`}}>{uiLabels.character.statsTitle}</h4>
                        <ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="80%" data={statData.map(s => ({subject: s.name, value: s.value, fullMark: s.fullMark }))}><PolarGrid stroke="rgba(255, 255, 255, 0.3)"/><PolarAngleAxis dataKey="subject" stroke="#fff" tick={{fontSize: 12 * scale}} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} /><Radar name={char.name} dataKey="value" stroke={characterStatSystemConfig.radar.color} fill={characterStatSystemConfig.radar.color} fillOpacity={0.6} /><RechartsTooltip contentStyle={{backgroundColor: '#333', border: '1px solid #555'}}/></RadarChart></ResponsiveContainer>
                    </div>
                )}
                {statSystem === 'doughnut' && char.stats && char.stats.length > 0 && (
                     <div className="w-full p-4 content-panel flex flex-col" style={{height: `${256 * scale}px`}} onClick={() => setEditorFocus({target: {type: 'character', id: char.id, field: 'stats'}})}>
                        <h4 className="font-semibold text-center text-yellow-400" style={{ fontSize: `${1.25 * scale}rem`, marginBottom: `${0.75 * scale}rem`}}>{uiLabels.character.statsTitle}</h4>
                        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={'60%'} outerRadius={'80%'} fill="#8884d8" paddingAngle={5}>{statData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie><RechartsTooltip contentStyle={{backgroundColor: '#333', border: '1px solid #555'}}/></PieChart></ResponsiveContainer>
                    </div>
                )}
                 {statSystem === 'bar' && char.stats && char.stats.length > 0 && (
                    <div className="w-full p-4 content-panel" onClick={() => setEditorFocus({target: {type: 'character', id: char.id, field: 'stats'}})}>
                        <h4 className="font-semibold text-center text-yellow-400" style={{ fontSize: `${1.25 * scale}rem`, marginBottom: `${0.75 * scale}rem`}}>{uiLabels.character.statsTitle}</h4>
                        <div className="space-y-2">{char.stats.map(stat => (<div key={stat.id}><div className="flex justify-between text-gray-200" style={{fontSize: `${0.875*scale}rem`}}><span>{stat.name}</span><span>{stat.type === 'variable' ? `[${stat.variable}]` : stat.value}/{stat.max}</span></div><div className="w-full bg-black/30 rounded-full h-2"><div className="h-2 rounded-full" style={{width: `${getStatValue(stat)/stat.max*100}%`, backgroundColor: stat.color}}></div></div></div>))}</div>
                    </div>
                )}
            </div>
            <div className="flex flex-col">
                 <div className="p-4 content-panel cursor-pointer" style={{marginBottom: `${1 * scale}rem`}} onClick={() => setEditorFocus({target: {type: 'character', id: char.id, field: 'profile'}})}>
                    <h4 className="font-semibold text-yellow-400" style={{fontSize: `${1.25 * scale}rem`, marginBottom: `${0.5 * scale}rem`}}>{uiLabels.character.profileTitle}</h4><p className="text-gray-200" style={{fontSize: `${1 * scale}rem`}}>{char.profile}</p>
                </div>
                <div className="p-4 content-panel" style={{marginBottom: `${1 * scale}rem`}}><h4 className="font-semibold text-yellow-400" style={{fontSize: `${1.25 * scale}rem`, marginBottom: `${0.5 * scale}rem`}}>{uiLabels.character.innerThoughtTitle}</h4><p className="italic text-gray-200" style={{fontSize: `${1 * scale}rem`}}>"[{char.innerThoughtVariable}]"</p></div>
                 <div className="p-4 content-panel flex-grow" onClick={() => setEditorFocus({target: {type: 'character', id: char.id, field: 'unlocks'}})}>
                    <h4 className="font-semibold text-yellow-400" style={{fontSize: `${1.25 * scale}rem`, marginBottom: `${0.5 * scale}rem`}}>{uiLabels.character.unlocksTitle}</h4>
                    <div className="space-y-3">
                        {char.profileUnlocks.map(unlock => {
                           const isUnlocked = !unlock.conditions || unlock.conditions.length === 0;
                           if (isUnlocked) {
                               return <div key={unlock.id}><h5 className="font-semibold text-white" style={{fontSize: `${1.05 * scale}rem`}}>{unlock.title}</h5><p className="text-gray-300" style={{fontSize: `${0.95 * scale}rem`, marginTop: '0.25em'}}>{unlock.content}</p></div>;
                           }
                           
                           const lockedTitle = unlock.lockedTitle || (unlock.hidden ? "비밀 정보" : unlock.title);
                           const lockedContent = unlock.lockedContent || '';

                           return (
                               <div key={unlock.id} className="text-gray-500 italic opacity-70">
                                   <div className="flex items-center" style={{fontSize: `${1.05 * scale}rem`}}><LockIcon /><span>{lockedTitle}</span></div>
                                   {lockedContent && <p className="pl-5" style={{fontSize: `${0.9 * scale}rem`}}>{lockedContent}</p>}
                               </div>
                           );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DraggablePin: React.FC<{
    item: Location | SubLocation;
    onUpdate: PreviewWindowProps['onLocationUpdate'];
    parentRef: React.RefObject<HTMLDivElement>;
    onPinClick: (item: Location | SubLocation) => void;
    parentId?: string;
    scale: number;
}> = ({ item, onUpdate, parentRef, onPinClick, parentId, scale }) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, initialX: item.x, initialY: item.y });

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY, initialX: item.x, initialY: item.y };
        e.preventDefault();
        e.stopPropagation();
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !parentRef.current) return;
        const parentRect = parentRef.current.getBoundingClientRect();
        const dx = (e.clientX - dragStart.current.x) / parentRect.width * 100;
        const dy = (e.clientY - dragStart.current.y) / parentRect.height * 100;
        const newX = Math.max(0, Math.min(100, dragStart.current.initialX + dx));
        const newY = Math.max(0, Math.min(100, dragStart.current.initialY + dy));
        onUpdate(parentId || item.id, { x: newX, y: newY }, parentId ? item.id : undefined);
    }, [isDragging, onUpdate, item.id, parentRef, parentId]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        if (isDragging) {
             e.stopPropagation(); // prevent click event if it was a drag
        }
        setIsDragging(false)
    }, [isDragging]);
    
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPinClick(item);
    }

    useEffect(() => {
        if(isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const isSubLocation = 'useSubMap' in item;

    return (
        <div className="absolute transition-all duration-100" style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)' }} onMouseDown={handleMouseDown} onClick={handleClick}>
             <Tooltip text={item.name}>
                 <div className={`rounded-full border-2 border-white shadow-lg cursor-pointer ${isSubLocation ? 'bg-yellow-400' : 'bg-green-400'}`} style={{ width: `${16*scale}px`, height: `${16*scale}px`}}></div>
             </Tooltip>
            <div className="text-center bg-black/50 rounded-full px-2 py-0.5 mt-1 whitespace-nowrap" style={{ fontSize: `${12*scale}px`}}>{item.name}</div>
        </div>
    )
}

type ActiveMapState = {
    type: 'main' | 'sub';
    url: string;
    name: string;
    parentId?: string;
};


const MapTabView: React.FC<Pick<PreviewWindowProps, 'config' | 'setEditorFocus' | 'onLocationUpdate'>> = ({ config, setEditorFocus, onLocationUpdate }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [activeMap, setActiveMap] = useState<ActiveMapState>({ type: 'main', url: config.map.backgroundImageUrl, name: config.uiLabels.map.mainMapName });
    const scale = config.size.width / 1000;

    useEffect(() => {
        if (activeMap.type === 'main') {
            setActiveMap({ type: 'main', url: config.map.backgroundImageUrl, name: config.uiLabels.map.mainMapName });
        }
    }, [config.map.backgroundImageUrl, config.uiLabels.map.mainMapName]);
    
    const handlePinClick = (item: Location | SubLocation) => {
        if ('useSubMap' in item && item.useSubMap && item.subMapImageUrl) {
            setActiveMap({ type: 'sub', url: item.subMapImageUrl, name: item.name, parentId: item.id });
        }
    };
    
    const backToMainMap = () => {
         setActiveMap({ type: 'main', url: config.map.backgroundImageUrl, name: config.uiLabels.map.mainMapName });
    }
    
    const charactersByLocation = useMemo(() => {
        const distribution: Record<string, Character[]> = {};
        config.characters.forEach((char) => {
            const loc = getPreviewLocationForCharacter(char, config.locations);
            if (loc) {
                 if(!distribution[loc.id]) distribution[loc.id] = [];
                 distribution[loc.id].push(char);
            }
        });
        return distribution;
    }, [config.characters, config.locations]);
    
    const currentLocations = useMemo(() => {
        if(activeMap.type === 'sub') {
            const parent = config.locations.find(l => l.id === activeMap.parentId);
            return parent?.subLocations || [];
        }
        return config.locations;
    }, [activeMap, config.locations]);

    return (
        <div ref={mapContainerRef} className="h-full relative content-panel overflow-hidden" onClick={() => setEditorFocus({ target: { type: 'global', field: 'map' } })}>
            <div className="absolute inset-0 bg-cover bg-center transition-all duration-500" style={{ backgroundImage: `url('${activeMap.url}')` }} />
            <div className="absolute inset-0 bg-black/30"></div>
            <div className="absolute inset-0">
                {currentLocations.map((loc) => (
                    <DraggablePin key={loc.id} item={loc} onUpdate={onLocationUpdate} parentRef={mapContainerRef} onPinClick={handlePinClick} parentId={activeMap.parentId} scale={scale} />
                ))}

                {activeMap.type === 'main' && Object.entries(charactersByLocation).map(([locId, chars]) => {
                    const location = config.locations.find(l => l.id === locId);
                    if (!location) return null;
                    
                    const numChars = chars.length;
                    const iconWidth = 40 * scale;
                    const padding = 4 * scale;
                    const totalWidthPerIcon = iconWidth + padding;

                    return chars.map((char, index) => {
                        const offsetX = (index - (numChars - 1) / 2) * totalWidthPerIcon;
                        const verticalOffset = 10 * scale;

                        return (
                            <div 
                                key={char.id} 
                                className="absolute transition-transform duration-300" 
                                style={{ 
                                    left: `${location.x}%`, 
                                    top: `${location.y}%`, 
                                    transform: `translate(calc(-50% + ${offsetX}px), calc(-100% - ${verticalOffset}px))`,
                                    zIndex: 10 + index
                                }}
                            >
                                <Tooltip text={char.name}>
                                     <img src={char.images.default || 'https://via.placeholder.com/48'} className="rounded-full border-2 border-white shadow-lg pointer-events-none" style={{ width: `${iconWidth}px`, height: `${iconWidth}px`}}/>
                                </Tooltip>
                            </div>
                        );
                    });
                })}
            </div>
            <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-black/70 text-white">
                <h3 className="font-bold text-yellow-400" style={{fontSize: `${1.125*scale}rem`}}>{activeMap.name}</h3>
                 {activeMap.type === 'sub' &&
                    <button onClick={backToMainMap} className="text-sm text-cyan-300 hover:underline" style={{fontSize: `${0.875*scale}rem`}}>{config.uiLabels.map.backToMainMap}</button>
                 }
            </div>
        </div>
    );
}

const LoreTabView: React.FC<{config: AppConfig, setEditorFocus: (f: EditorFocus) => void, scale: number}> = ({config, setEditorFocus, scale}) => {
    const { lore, uiLabels } = config;
    return (
        <div className="p-4 h-full overflow-y-auto custom-scrollbar">
            <div className="p-4 content-panel mb-4 cursor-pointer" onClick={() => setEditorFocus({target: {type: 'lore', id: 'core'}})}>
                <h4 className="font-semibold mb-2 text-yellow-400" style={{ fontSize: `${1.25 * scale}rem` }}>{lore.core.title}</h4>
                <p className="text-gray-200 whitespace-pre-wrap" style={{ fontSize: `${0.95 * scale}rem` }}>{lore.core.content}</p>
            </div>
            <h4 className="font-semibold mb-2 text-yellow-400" style={{ fontSize: `${1.25 * scale}rem` }}>{uiLabels.lore.additionalInfoTitle}</h4>
            {lore.entries.map(entry => {
                const isUnlocked = !entry.conditions || entry.conditions.length === 0; // Simplified preview logic
                if (isUnlocked) {
                    return (
                         <div key={entry.id} className="p-4 content-panel mb-2 cursor-pointer" onClick={() => setEditorFocus({target: {type: 'lore', id: 'entries', subId: entry.id}})}>
                            <h5 className="font-semibold text-white" style={{fontSize: `${1.05 * scale}rem`}}>{entry.title}</h5>
                             <p className="text-gray-300 mt-1" style={{fontSize: `${0.95 * scale}rem`}}>{entry.content}</p>
                        </div>
                    );
                } else {
                     const lockedTitle = entry.lockedTitle || (entry.hidden ? "비밀 정보" : entry.title);
                     const lockedContent = entry.lockedContent || '';
                     return (
                         <div key={entry.id} className="p-4 content-panel mb-2 text-gray-500 italic opacity-70 cursor-pointer" onClick={() => setEditorFocus({target: {type: 'lore', id: 'entries', subId: entry.id}})}>
                            <div className="flex items-center" style={{fontSize: `${1.05 * scale}rem`}}><LockIcon /><span>{lockedTitle}</span></div>
                            {lockedContent && <p className="pl-5" style={{fontSize: `${0.9 * scale}rem`}}>{lockedContent}</p>}
                         </div>
                     );
                }
            })}
        </div>
    );
};

const AchievementsTabView: React.FC<{config: AppConfig, setEditorFocus: (f: EditorFocus) => void, scale: number}> = ({config, setEditorFocus, scale}) => {
    const { achievements, characters, uiLabels } = config;
    const isUnlockedPreview = (ach: AppConfig['achievements'][0]['achievements'][0]) => {
        // Simplified preview logic: Assume hidden achievements are locked, others are unlocked
        return !ach.hidden;
    };

    return (
        <div className="p-4 h-full overflow-y-auto custom-scrollbar">
            {achievements.map(category => (
                <div key={category.id} className="mb-6 cursor-pointer" onClick={() => setEditorFocus({target: {type: 'achievement', id: category.id}})}>
                    <h3 className="font-bold text-yellow-400 border-b-2 border-yellow-400/50 pb-2 mb-3" style={{ fontSize: `${1.5 * scale}rem` }}>{category.name}</h3>
                    <div className="space-y-3">
                        {category.achievements.map(ach => {
                            const isUnlocked = isUnlockedPreview(ach);
                            const title = isUnlocked ? ach.title : (ach.lockedTitle || '???');
                            const description = isUnlocked ? ach.description : (ach.lockedDescription || '???');

                            return (
                                <div key={ach.id} className={`p-3 content-panel flex items-start ${isUnlocked ? '' : 'opacity-70'}`} onClick={(e) => { e.stopPropagation(); setEditorFocus({target: {type: 'achievement', id: category.id, subId: ach.id}})}}>
                                    <div className="mr-4 text-3xl text-gray-500 w-8 h-8 flex-shrink-0 flex items-center justify-center">
                                        {ach.iconUrl ? <img src={ach.iconUrl} alt={title} className="w-full h-full object-contain"/> : (isUnlocked ? '🏆' : (ach.hidden ? '❓' : <LockIcon/>))}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white" style={{ fontSize: `${1 * scale}rem` }}>{title}</h4>
                                        <p className="text-gray-300" style={{ fontSize: `${0.875 * scale}rem` }}>{description}</p>
                                        {ach.hidden && !isUnlocked && ach.hint && <p className="italic mt-1" style={{ fontSize: `${0.8 * scale}rem`, color: '#9ca3af' }}>{uiLabels.achievements.hintPrefix} {ach.hint}</p>}
                                    </div>
                                    {!isUnlocked && <div className="ml-auto text-gray-500 italic flex items-center flex-shrink-0" style={{ fontSize: `${0.875 * scale}rem` }}><LockIcon /><span>{uiLabels.achievements.lockedStatus}</span></div>}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

const MemoriesTabView: React.FC<{config: AppConfig, setEditorFocus: (f: EditorFocus) => void, scale: number}> = ({config, setEditorFocus, scale}) => {
    const { memories, uiLabels } = config;
    return (
         <div className="p-4 h-full overflow-y-auto custom-scrollbar" onClick={() => setEditorFocus({target: {type: 'global', field: 'memories'}})}>
            <h3 className="font-bold pb-2 mb-3 text-yellow-400" style={{ fontSize: `${1.5 * scale}rem` }}>{uiLabels.memories.title}</h3>
            <div className="space-y-4">
            {memories.map((mem, i) => (
                <div key={mem.id} className="p-4 content-panel">
                    <p className="whitespace-pre-wrap text-gray-200" style={{ fontSize: `${1 * scale}rem` }}>[{mem.variable}]</p>
                </div>
            ))}
            </div>
        </div>
    );
};


export const PreviewWindow: React.FC<PreviewWindowProps> = ({ config, setEditorFocus, onLocationUpdate: rawOnLocationUpdate }) => {
    const [activeMainTab, setActiveMainTab] = useState('character');
    const [activeCharId, setActiveCharId] = useState(config.characters[0]?.id || '');
    
    const onLocationUpdate = useCallback((locationId: string, newPosition: { x: number; y: number }, subLocationId?: string) => {
        const newConfig = { ...config };
        if (subLocationId) {
            const mainLoc = newConfig.locations.find(l => l.id === locationId);
            if (mainLoc && mainLoc.subLocations) {
                mainLoc.subLocations = mainLoc.subLocations.map(sl => sl.id === subLocationId ? {...sl, ...newPosition} : sl);
            }
        } else {
            newConfig.locations = newConfig.locations.map(loc => loc.id === locationId ? { ...loc, ...newPosition } : loc);
        }
    }, [config]);


    const activeCharacter = config.characters.find(c => c.id === activeCharId) || (config.characters.length > 0 ? config.characters[0] : null);
    
    const { featureFlags, uiLabels } = config;
    const scale = config.size.width / 1000;

    useEffect(() => {
        if (!activeCharId && config.characters.length > 0) {
            setActiveCharId(config.characters[0].id);
        }
        if (activeCharId && !config.characters.find(c => c.id === activeCharId)) {
            setActiveCharId(config.characters[0]?.id || '');
        }
    }, [config.characters, activeCharId]);
    
    const allTabs = [
        {id: 'character', name: uiLabels.mainTabs.character, flag: true},
        {id: 'map', name: uiLabels.mainTabs.map, flag: featureFlags.showMap},
        {id: 'memories', name: uiLabels.mainTabs.memories, flag: featureFlags.showMemories},
        {id: 'lore', name: uiLabels.mainTabs.lore, flag: featureFlags.showLore},
        {id: 'achievements', name: uiLabels.mainTabs.achievements, flag: featureFlags.showAchievements}
    ];

    const mainTabs = allTabs.filter(t => t.flag);

    useEffect(() => {
        if (!mainTabs.find(t => t.id === activeMainTab)) {
            setActiveMainTab('character');
        }
    }, [mainTabs, activeMainTab]);

    const renderContent = () => {
        switch(activeMainTab) {
            case 'character': return activeCharacter ? <CharacterTabView char={activeCharacter} statSystem={config.characterStatSystem} config={config} setEditorFocus={setEditorFocus}/> : <div className="p-4 flex items-center justify-center h-full">캐릭터를 추가해주세요.</div>;
            case 'map': return <MapTabView config={config} setEditorFocus={setEditorFocus} onLocationUpdate={rawOnLocationUpdate}/>;
            case 'lore': return <LoreTabView config={config} setEditorFocus={setEditorFocus} scale={scale} />;
            case 'achievements': return <AchievementsTabView config={config} setEditorFocus={setEditorFocus} scale={scale} />;
            case 'memories': return <MemoriesTabView config={config} setEditorFocus={setEditorFocus} scale={scale} />;
            default: return <div className="p-4 flex items-center justify-center h-full">준비 중...</div>;
        }
    }

    return (
        <div className="w-full h-full bg-gradient-to-br from-[#6d5b97] to-[#3b3a69] text-white rounded-2xl shadow-lg overflow-hidden flex flex-col" style={{ fontFamily: config.font.fontFamily, fontSize: `${config.font.fontSize * scale}px` }}>
            <style>{`@import url('${config.font.importUrl}'); .content-panel { background: rgba(0,0,0,0.2); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 12px; } .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #FFD700; border-radius: 10px; }`}</style>
            <div className="h-10 bg-black/30 flex items-center justify-center font-bold tracking-wider flex-shrink-0">{uiLabels.mainWindowTitle}</div>
            
            <div className="flex bg-black/20 p-1 flex-shrink-0">
                {mainTabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveMainTab(tab.id)} className={`flex-1 py-3 text-center font-semibold text-sm relative transition-colors ${activeMainTab === tab.id ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                        {tab.name} {activeMainTab === tab.id && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-[3px] bg-yellow-400 rounded-sm"></span>}
                    </button>
                ))}
            </div>

            <div className="flex-grow overflow-hidden flex flex-col">
                {activeMainTab === 'character' && (
                    <div className="flex-shrink-0 flex border-b border-white/20 overflow-x-auto">
                        {config.characters.map(char => (<button key={char.id} onClick={() => setActiveCharId(char.id)} className={`p-3 text-center font-semibold cursor-pointer border-b-2 flex-shrink-0 text-sm ${activeCharId === char.id ? 'text-white border-cyan-400' : 'border-transparent text-gray-400 hover:text-white'}`}>{char.name}</button>))}
                    </div>
                )}
                <div className="flex-grow overflow-hidden">{renderContent()}</div>
            </div>
        </div>
    );
};