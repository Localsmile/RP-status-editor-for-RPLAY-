import React, { useState, useEffect, useCallback } from 'react';
import type { AppConfig, Character, Location, AchievementCategory, LoreEntry, CharacterStatSystem, EditorFocus, ProfileUnlock, Stat, CharacterImage, Achievement, UnlockCondition, Memory, SubLocation, Gauge } from '../types';
import { VariableList } from './VariableList';

// Helper to create a unique ID for new items
const newId = () => crypto.randomUUID();

interface EditorPanelProps {
    config: AppConfig;
    onConfigChange: (newConfig: AppConfig) => void;
    editorFocus: EditorFocus;
}

const Accordion: React.FC<{ title: string; children: React.ReactNode, initialOpen?: boolean, id?: string, onRemove?: () => void }> = ({ title, children, initialOpen = false, id, onRemove }) => {
    const [isOpen, setIsOpen] = useState(initialOpen);
    
    useEffect(() => { setIsOpen(initialOpen); }, [initialOpen]);

    return (
        <div className="border border-gray-700 rounded-lg mb-2 bg-gray-800/50" id={id}>
            <div className="w-full p-3 text-left font-semibold bg-gray-800 hover:bg-gray-700 transition-colors flex justify-between items-center">
                <button className="flex-grow text-left" onClick={() => setIsOpen(!isOpen)}>
                    {title}
                </button>
                <div className="flex items-center">
                    {onRemove && (
                        <button onClick={onRemove} className="text-red-400 hover:text-red-300 mr-2 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    )}
                    <button onClick={() => setIsOpen(!isOpen)}>
                        <svg className={`w-5 h-5 transition-transform transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </button>
                </div>
            </div>
            {isOpen && <div className="p-4 border-t border-gray-700">{children}</div>}
        </div>
    );
};

const InputField: React.FC<{ label: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; type?: string; as?: 'textarea' | 'input', className?: string }> = ({ label, value, onChange, type = 'text', as = 'input', className }) => (
    <div className={`mb-3 ${className}`}>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        {as === 'textarea' ? (
            <textarea value={value} onChange={onChange} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition" rows={3}/>
        ) : (
            <input type={type} value={value} onChange={onChange} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition" />
        )}
    </div>
);

const AddButton: React.FC<{ onClick: () => void, text: string }> = ({ onClick, text }) => (
    <button onClick={onClick} className="w-full mt-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded transition-colors">
        {text}
    </button>
);

const ConditionEditor: React.FC<{ conditions: UnlockCondition[], onChange: (newConditions: UnlockCondition[]) => void }> = ({ conditions, onChange }) => {
    const handleConditionChange = (index: number, newCondition: UnlockCondition) => {
        const newConditions = [...conditions];
        newConditions[index] = newCondition;
        onChange(newConditions);
    };

    const addCondition = () => {
        onChange([...conditions, { id: newId(), variable: '', operator: '>=', value: '' }]);
    };
    
    const removeCondition = (index: number) => {
        onChange(conditions.filter((_, i) => i !== index));
    }

    return (
        <div className="space-y-2">
            {conditions.length === 0 && <p className="text-xs text-center text-gray-500 my-2">조건 없음 (항상 표시)</p>}
            {conditions.map((cond, index) => (
                <div key={cond.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end p-2 border border-gray-600 rounded">
                    <InputField label="변수명" value={cond.variable} onChange={e => handleConditionChange(index, {...cond, variable: e.target.value})} />
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">조건</label>
                        <select value={cond.operator} onChange={e => handleConditionChange(index, {...cond, operator: e.target.value as UnlockCondition['operator']})} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white h-[42px]">
                            <option value=">=">{'>='}</option>
                            <option value="<=">{'<='}</option>
                            <option value="==">{'=='}</option>
                            <option value="!=">{'!='}</option>
                            <option value=">">{'>'}</option>
                            <option value="<">{'<'}</option>
                        </select>
                    </div>
                    <InputField label="값" value={cond.value} onChange={e => handleConditionChange(index, {...cond, value: e.target.value})} />
                    <button onClick={() => removeCondition(index)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded h-[42px] text-sm">삭제</button>
                </div>
            ))}
            <AddButton onClick={addCondition} text="조건 추가" />
        </div>
    );
};

export const EditorPanel: React.FC<EditorPanelProps> = ({ config, onConfigChange, editorFocus }) => {
    const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!editorFocus?.target) return;
        const target = editorFocus.target;
        const newOpenState: Record<string, boolean> = {};
        let scrollId: string | null = null;
    
        if (target.type === 'character') {
            newOpenState['characters'] = true;
            newOpenState[target.id] = true;
            scrollId = `editor-item-character-${target.id}`;
        } else if (target.type === 'location') {
            newOpenState['locations'] = true;
            newOpenState[target.id] = true;
            scrollId = target.subId ? `editor-item-sublocation-${target.subId}` : `editor-item-location-${target.id}`;
        } else if (target.type === 'lore') {
            newOpenState['lore'] = true;
            scrollId = target.subId ? `editor-item-lore-${target.subId}` : 'editor-item-lore-main';
        } else if (target.type === 'achievement') {
            newOpenState['achievements'] = true;
            newOpenState[target.id] = true;
            scrollId = target.subId ? `editor-item-achievement-${target.subId}` : `editor-item-ach-cat-${target.id}`;
        } else if (target.type === 'global') {
            newOpenState[target.field] = true;
            scrollId = `editor-item-global-${target.field}`;
        }
        
        setOpenAccordions(prev => ({...prev, ...newOpenState}));
        setTimeout(() => {
            document.getElementById(scrollId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }, [editorFocus]);

    const handleUpdate = useCallback(<K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
        onConfigChange({ ...config, [key]: value });
    }, [config, onConfigChange]);

    const handleListUpdate = useCallback(<T extends {id: string}>(listKey: keyof AppConfig, item: T) => {
        const list = config[listKey] as unknown as T[];
        const index = list.findIndex(i => i.id === item.id);
        if(index > -1) {
            const newList = [...list];
            newList[index] = item;
            handleUpdate(listKey, newList as any);
        }
    }, [config, handleUpdate]);
    
    const handleListAdd = useCallback(<T,>(listKey: keyof AppConfig, newItem: T) => {
         const newList = [...(config[listKey] as unknown as T[]), newItem];
         handleUpdate(listKey, newList as any);
    }, [config, handleUpdate]);

    const handleListRemove = useCallback((listKey: keyof AppConfig, id: string) => {
        const newList = (config[listKey] as {id:string}[]).filter(item => item.id !== id);
        handleUpdate(listKey, newList as any);
    }, [config, handleUpdate]);
    
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-cyan-400">RP 상태창 편집기</h1>
            <p className="text-sm text-gray-400">모든 항목을 자유롭게 추가, 수정, 삭제하고 실시간으로 프리뷰를 확인하세요.</p>
            
            <Accordion title="전역 설정" initialOpen={openAccordions['settings']} id="editor-item-global-settings">
                <InputField label="폰트 Import URL" value={config.font.importUrl} onChange={e => handleUpdate('font', {...config.font, importUrl: e.target.value})} />
                <InputField label="폰트 Family" value={config.font.fontFamily} onChange={e => handleUpdate('font', {...config.font, fontFamily: e.target.value})} />
                <InputField label="기본 폰트 크기 (1000px 기준)" type="number" value={config.font.fontSize} onChange={e => handleUpdate('font', {...config.font, fontSize: parseInt(e.target.value) || 16})} />
                <div className="flex space-x-2">
                    <InputField label="너비 (width)" type="number" value={config.size.width} onChange={e => handleUpdate('size', { ...config.size, width: parseInt(e.target.value) || 1000})} />
                    <InputField label="높이 (height)" type="number" value={config.size.height} onChange={e => handleUpdate('size', { ...config.size, height: parseInt(e.target.value) || 1000})} />
                </div>
                <div className="flex space-x-2 items-end">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-gray-400 mb-1">스탯 표시 방식</label>
                        <select value={config.characterStatSystem} onChange={e => handleUpdate('characterStatSystem', e.target.value as CharacterStatSystem)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white">
                            <option value="bar">바 차트</option>
                            <option value="radar">레이더 차트</option>
                            <option value="doughnut">도넛 차트</option>
                        </select>
                    </div>
                    {config.characterStatSystem === 'radar' && (
                         <InputField type="color" label="레이더 색상" value={config.characterStatSystemConfig.radar.color} onChange={e => handleUpdate('characterStatSystemConfig', {...config.characterStatSystemConfig, radar: { ...config.characterStatSystemConfig.radar, color: e.target.value}})} className="w-1/4"/>
                    )}
                </div>
                 <div className="p-2 border rounded mt-2 border-gray-600">
                    <div className="flex items-center my-2">
                        <input type="checkbox" checked={config.globalSettings.useDefaultForBlank} onChange={e => handleUpdate('globalSettings', {...config.globalSettings, useDefaultForBlank: e.target.checked})} className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"/>
                        <label className="ml-2 block text-sm text-gray-300">빈 변수일 때 기본값 사용</label>
                    </div>
                    {config.globalSettings.useDefaultForBlank && (
                        <InputField label="기본값" value={config.globalSettings.blankVariableValue} onChange={e => handleUpdate('globalSettings', {...config.globalSettings, blankVariableValue: e.target.value})} />
                    )}
                </div>
            </Accordion>
            
            <Accordion title="기능 ON/OFF" initialOpen={openAccordions['features']} id="editor-item-global-features">
                <div className="grid grid-cols-2 gap-2">
                    {Object.keys(config.featureFlags).map(key => {
                        const labels = { showMap: '지도', showMemories: '기억', showLore: '세계관', showAchievements: '업적'};
                        return (
                            <div key={key} className="flex items-center">
                                <input type="checkbox" checked={config.featureFlags[key as keyof typeof config.featureFlags]} onChange={e => handleUpdate('featureFlags', {...config.featureFlags, [key]: e.target.checked})} className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500" />
                                <label className="ml-2 block text-sm text-gray-300">{labels[key as keyof typeof labels]}</label>
                            </div>
                        )
                    })}
                </div>
            </Accordion>
            
            <Accordion title="UI 텍스트 편집" initialOpen={openAccordions['uiLabels']} id="editor-item-global-uiLabels">
                <h3 className="text-lg font-semibold my-2 border-b border-gray-600 pb-1">전역</h3>
                <InputField label="메인 창 제목" value={config.uiLabels.mainWindowTitle} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, mainWindowTitle: e.target.value})} />
                <h3 className="text-lg font-semibold my-2 border-b border-gray-600 pb-1">메인 탭</h3>
                <InputField label="인물 정보 탭" value={config.uiLabels.mainTabs.character} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, mainTabs: {...config.uiLabels.mainTabs, character: e.target.value}})} />
                <InputField label="지도 탭" value={config.uiLabels.mainTabs.map} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, mainTabs: {...config.uiLabels.mainTabs, map: e.target.value}})} />
                <InputField label="기억 탭" value={config.uiLabels.mainTabs.memories} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, mainTabs: {...config.uiLabels.mainTabs, memories: e.target.value}})} />
                <InputField label="세계관 탭" value={config.uiLabels.mainTabs.lore} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, mainTabs: {...config.uiLabels.mainTabs, lore: e.target.value}})} />
                <InputField label="업적 탭" value={config.uiLabels.mainTabs.achievements} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, mainTabs: {...config.uiLabels.mainTabs, achievements: e.target.value}})} />

                <h3 className="text-lg font-semibold my-2 border-b border-gray-600 pb-1">인물 정보</h3>
                 <InputField label="현재 위치 접두사" value={config.uiLabels.character.currentLocationPrefix} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, character: {...config.uiLabels.character, currentLocationPrefix: e.target.value}})} />
                 <InputField label="관계 정보 제목" value={config.uiLabels.character.relationshipTitle} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, character: {...config.uiLabels.character, relationshipTitle: e.target.value}})} />
                 <InputField label="능력치 제목" value={config.uiLabels.character.statsTitle} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, character: {...config.uiLabels.character, statsTitle: e.target.value}})} />
                 <InputField label="핵심 프로필 제목" value={config.uiLabels.character.profileTitle} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, character: {...config.uiLabels.character, profileTitle: e.target.value}})} />
                 <InputField label="속마음 제목" value={config.uiLabels.character.innerThoughtTitle} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, character: {...config.uiLabels.character, innerThoughtTitle: e.target.value}})} />
                 <InputField label="심층 정보 제목" value={config.uiLabels.character.unlocksTitle} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, character: {...config.uiLabels.character, unlocksTitle: e.target.value}})} />

                <h3 className="text-lg font-semibold my-2 border-b border-gray-600 pb-1">기억</h3>
                <InputField label="기억 탭 제목" value={config.uiLabels.memories.title} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, memories: { ...config.uiLabels.memories, title: e.target.value}})} />
                
                <h3 className="text-lg font-semibold my-2 border-b border-gray-600 pb-1">세계관</h3>
                <InputField label="추가 정보 부제" value={config.uiLabels.lore.additionalInfoTitle} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, lore: { ...config.uiLabels.lore, additionalInfoTitle: e.target.value}})} />
                
                <h3 className="text-lg font-semibold my-2 border-b border-gray-600 pb-1">지도</h3>
                <InputField label="메인 지도 이름" value={config.uiLabels.map.mainMapName} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, map: {...config.uiLabels.map, mainMapName: e.target.value}})} />
                <InputField label="메인 지도로 돌아가기" value={config.uiLabels.map.backToMainMap} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, map: {...config.uiLabels.map, backToMainMap: e.target.value}})} />

                <h3 className="text-lg font-semibold my-2 border-b border-gray-600 pb-1">업적</h3>
                <InputField label="힌트 접두사" value={config.uiLabels.achievements.hintPrefix} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, achievements: {...config.uiLabels.achievements, hintPrefix: e.target.value}})} />
                <InputField label="잠김 상태 텍스트" value={config.uiLabels.achievements.lockedStatus} onChange={e => handleUpdate('uiLabels', {...config.uiLabels, achievements: {...config.uiLabels.achievements, lockedStatus: e.target.value}})} />
            </Accordion>

            <Accordion title="캐릭터 관리" initialOpen={openAccordions['characters']} id="editor-item-characters-main">
                {config.characters.map((char) => (
                    <Accordion key={char.id} title={char.name} initialOpen={openAccordions[char.id]} id={`editor-item-character-${char.id}`} onRemove={() => handleListRemove('characters', char.id)}>
                        <InputField label="이름" value={char.name} onChange={e => handleListUpdate('characters', {...char, name: e.target.value})} />
                        <InputField label="고유 ID (수정주의)" value={char.id} onChange={e => handleListUpdate('characters', {...char, id: e.target.value})} />
                        <InputField label="변수 접두사" value={char.prefix} onChange={e => handleListUpdate('characters', {...char, prefix: e.target.value})} />
                        <InputField label="출신" value={char.origin} onChange={e => handleListUpdate('characters', {...char, origin: e.target.value})} />
                        <InputField label="프로필" as="textarea" value={char.profile} onChange={e => handleListUpdate('characters', {...char, profile: e.target.value})} />
                        
                        <Accordion title="변수 설정" initialOpen={false}>
                            <InputField label="위치 변수명" value={char.locationVariable} onChange={e => handleListUpdate('characters', {...char, locationVariable: e.target.value})} />
                            <InputField label="관계 변수명" value={char.relationshipVariable} onChange={e => handleListUpdate('characters', {...char, relationshipVariable: e.target.value})} />
                            <InputField label="속마음 변수명" value={char.innerThoughtVariable} onChange={e => handleListUpdate('characters', {...char, innerThoughtVariable: e.target.value})} />
                        </Accordion>
                        
                        <Accordion title="이미지 설정" initialOpen={false}>
                             <InputField label="기본 이미지 URL" value={char.images.default} onChange={e => handleListUpdate('characters', {...char, images: {...char.images, default: e.target.value}})} />
                             {char.images.conditional.map(img => (
                                <div key={img.id} className="p-2 border rounded mb-2 border-gray-600">
                                    <div className="grid grid-cols-2 gap-2">
                                        <InputField label="조건 변수명" value={img.conditionVariable} onChange={e => handleListUpdate('characters', {...char, images: {...char.images, conditional: char.images.conditional.map(i => i.id === img.id ? {...i, conditionVariable: e.target.value} : i)}})} />
                                        <InputField label="조건 값" value={img.conditionValue} onChange={e => handleListUpdate('characters', {...char, images: {...char.images, conditional: char.images.conditional.map(i => i.id === img.id ? {...i, conditionValue: e.target.value} : i)}})} />
                                    </div>
                                    <InputField label="이미지 URL" value={img.url} onChange={e => handleListUpdate('characters', {...char, images: {...char.images, conditional: char.images.conditional.map(i => i.id === img.id ? {...i, url: e.target.value} : i)}})} />
                                    <button onClick={() => handleListUpdate('characters', {...char, images: {...char.images, conditional: char.images.conditional.filter(i => i.id !== img.id)}})} className="text-red-400 text-xs">[-] 조건부 이미지 삭제</button>
                                </div>
                             ))}
                             <AddButton onClick={() => handleListUpdate('characters', {...char, images: {...char.images, conditional: [...char.images.conditional, {id: newId(), conditionVariable: '', conditionValue: '', url: ''}]}})} text="[+] 조건부 이미지 추가" />
                        </Accordion>
                        
                        <Accordion title="게이지" initialOpen={false}>
                            {char.gauges.map(gauge => (
                                <div key={gauge.id} className="p-2 border rounded mb-2 border-gray-600">
                                    <InputField label="이름" value={gauge.name} onChange={e => handleListUpdate('characters', {...char, gauges: char.gauges.map(g => g.id === gauge.id ? {...g, name: e.target.value} : g)})} />
                                    <div className="flex items-end space-x-2">
                                        <InputField label="변수명" value={gauge.variable} onChange={e => handleListUpdate('characters', {...char, gauges: char.gauges.map(g => g.id === gauge.id ? {...g, variable: e.target.value} : g)})} className="flex-grow"/>
                                        <InputField label="최대값" type="number" value={gauge.max} onChange={e => handleListUpdate('characters', {...char, gauges: char.gauges.map(g => g.id === gauge.id ? {...g, max: parseInt(e.target.value)} : g)})} className="w-1/4"/>
                                        <InputField label="색상" type="color" value={gauge.color} onChange={e => handleListUpdate('characters', {...char, gauges: char.gauges.map(g => g.id === gauge.id ? {...g, color: e.target.value} : g)})} className="w-1/4"/>
                                    </div>
                                    <button onClick={() => handleListUpdate('characters', {...char, gauges: char.gauges.filter(g => g.id !== gauge.id)})} className="text-red-400 text-xs mt-1">[-] 게이지 삭제</button>
                                </div>
                            ))}
                             <AddButton onClick={() => handleListUpdate('characters', {...char, gauges: [...char.gauges, {id: newId(), name: '새 게이지', variable: '', max: 100, color: '#f472b6'}]})} text="[+] 게이지 추가"/>
                         </Accordion>

                        <Accordion title="프로필 해금" initialOpen={false}>
                            {char.profileUnlocks.map(unlock => (
                                <div key={unlock.id} className="p-2 border rounded mb-2 border-gray-600">
                                    <InputField label="제목 (해금 후)" value={unlock.title} onChange={e => handleListUpdate('characters', {...char, profileUnlocks: char.profileUnlocks.map(p => p.id === unlock.id ? {...p, title: e.target.value} : p)})} />
                                    <InputField as="textarea" label="내용 (해금 후)" value={unlock.content} onChange={e => handleListUpdate('characters', {...char, profileUnlocks: char.profileUnlocks.map(p => p.id === unlock.id ? {...p, content: e.target.value} : p)})} />
                                    <div className="flex items-center my-2">
                                        <input type="checkbox" checked={unlock.hidden} onChange={e => handleListUpdate('characters', {...char, profileUnlocks: char.profileUnlocks.map(p => p.id === unlock.id ? {...p, hidden: e.target.checked} : p)})} className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500" />
                                        <label className="ml-2 block text-sm text-gray-300">비밀 정보</label>
                                    </div>
                                    {unlock.hidden && (
                                        <div className="p-2 border-t border-gray-700 mt-2">
                                            <InputField label="제목 (해금 전)" value={unlock.lockedTitle || ''} onChange={e => handleListUpdate('characters', {...char, profileUnlocks: char.profileUnlocks.map(p => p.id === unlock.id ? {...p, lockedTitle: e.target.value} : p)})} />
                                            <InputField as="textarea" label="내용 (해금 전)" value={unlock.lockedContent || ''} onChange={e => handleListUpdate('characters', {...char, profileUnlocks: char.profileUnlocks.map(p => p.id === unlock.id ? {...p, lockedContent: e.target.value} : p)})} />
                                        </div>
                                    )}
                                    <ConditionEditor conditions={unlock.conditions} onChange={newConditions => handleListUpdate('characters', {...char, profileUnlocks: char.profileUnlocks.map(p => p.id === unlock.id ? {...p, conditions: newConditions} : p)})} />
                                    <button onClick={() => handleListUpdate('characters', {...char, profileUnlocks: char.profileUnlocks.filter(p => p.id !== unlock.id)})} className="text-red-400 text-xs mt-2">[-] 프로필 해금 삭제</button>
                                </div>
                            ))}
                            <AddButton onClick={() => handleListUpdate('characters', {...char, profileUnlocks: [...char.profileUnlocks, {id: newId(), conditions: [], title: '', content: '', hidden: false}]})} text="[+] 프로필 해금 추가"/>
                         </Accordion>

                         <Accordion title="스탯" initialOpen={false}>
                            {char.stats.map(stat => (
                                <div key={stat.id} className="p-2 border rounded mb-2 border-gray-600">
                                    <InputField label="이름" value={stat.name} onChange={e => handleListUpdate('characters', {...char, stats: char.stats.map(s => s.id === stat.id ? {...s, name: e.target.value} : s)})} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-1">타입</label>
                                            <select value={stat.type} onChange={e => handleListUpdate('characters', {...char, stats: char.stats.map(s => s.id === stat.id ? {...s, type: e.target.value as 'variable' | 'fixed'} : s)})} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white h-[42px]">
                                                <option value="variable">변수</option>
                                                <option value="fixed">고정값</option>
                                            </select>
                                        </div>
                                        {stat.type === 'variable' ? (
                                            <InputField label="변수명" value={stat.variable || ''} onChange={e => handleListUpdate('characters', {...char, stats: char.stats.map(s => s.id === stat.id ? {...s, variable: e.target.value} : s)})} />
                                        ) : (
                                            <InputField label="고정값" type="number" value={stat.value || 0} onChange={e => handleListUpdate('characters', {...char, stats: char.stats.map(s => s.id === stat.id ? {...s, value: parseInt(e.target.value)} : s)})} />
                                        )}
                                    </div>
                                    <div className="flex items-end space-x-2">
                                        <InputField label="최대값" type="number" value={stat.max} onChange={e => handleListUpdate('characters', {...char, stats: char.stats.map(s => s.id === stat.id ? {...s, max: parseInt(e.target.value)} : s)})} className="flex-grow"/>
                                        <InputField label="색상" type="color" value={stat.color} onChange={e => handleListUpdate('characters', {...char, stats: char.stats.map(s => s.id === stat.id ? {...s, color: e.target.value} : s)})} className="w-1/4"/>
                                    </div>
                                    <button onClick={() => handleListUpdate('characters', {...char, stats: char.stats.filter(s => s.id !== stat.id)})} className="text-red-400 text-xs mt-1">[-] 스탯 삭제</button>
                                </div>
                            ))}
                             <AddButton onClick={() => handleListUpdate('characters', {...char, stats: [...char.stats, {id: newId(), name: '새 스탯', type: 'variable', variable: '', max: 100, color: '#06b6d4'}]})} text="[+] 스탯 추가"/>
                         </Accordion>
                    </Accordion>
                ))}
                <AddButton onClick={() => handleListAdd('characters', { id: newId(), prefix: '', name: '새 캐릭터', origin: "", profile: "", locationVariable: '', relationshipVariable: '', innerThoughtVariable: '', images: { default: '', conditional: [] }, profileUnlocks: [], stats: [], gauges: [] })} text="[+] 캐릭터 추가" />
            </Accordion>

            <Accordion title="지도 설정" initialOpen={openAccordions['map']} id="editor-item-global-map">
                <InputField label="기본 지도 배경 이미지 URL" value={config.map.backgroundImageUrl} onChange={e => handleUpdate('map', {...config.map, backgroundImageUrl: e.target.value})} />
                <h3 className="text-lg font-semibold my-2">위치 목록</h3>
                <div className="max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {config.locations.map((loc) => (
                    <Accordion key={loc.id} title={loc.name} initialOpen={openAccordions[loc.id]} id={`editor-item-location-${loc.id}`} onRemove={() => handleListRemove('locations', loc.id)}>
                         <InputField label="장소 이름" value={loc.name} onChange={e => handleListUpdate('locations', {...loc, name: e.target.value})} />
                         <InputField label="고유 ID (변수 값)" value={loc.id} onChange={e => handleListUpdate('locations', {...loc, id: e.target.value})} />
                         <div className="flex space-x-2">
                            <InputField label="X 좌표 (%)" type="number" value={loc.x} onChange={e => handleListUpdate('locations', {...loc, x: parseInt(e.target.value)})} />
                            <InputField label="Y 좌표 (%)" type="number" value={loc.y} onChange={e => handleListUpdate('locations', {...loc, y: parseInt(e.target.value)})} />
                         </div>
                         <div className="p-2 border rounded mt-2 border-gray-600">
                             <label className="block text-sm font-medium text-gray-400 mb-1">별칭 (Aliases)</label>
                             <p className="text-xs text-gray-500 mb-2">위치 변수값이 이 곳의 고유 ID와 다르더라도, 아래 목록에 있는 텍스트와 일치하면 이 장소로 매핑됩니다.</p>
                             {(loc.aliases || []).map((alias, index) => (
                                 <div key={index} className="flex items-center space-x-2 mb-1">
                                    <input type="text" value={alias} onChange={e => {
                                        const newAliases = [...(loc.aliases || [])];
                                        newAliases[index] = e.target.value;
                                        handleListUpdate('locations', {...loc, aliases: newAliases});
                                    }} className="flex-grow bg-gray-700 border border-gray-600 rounded-md px-3 py-1 text-white text-sm" />
                                    <button onClick={() => handleListUpdate('locations', {...loc, aliases: loc.aliases?.filter((_, i) => i !== index)})} className="text-red-400 text-xs">삭제</button>
                                 </div>
                             ))}
                             <button onClick={() => handleListUpdate('locations', {...loc, aliases: [...(loc.aliases || []), '']})} className="text-cyan-400 text-xs mt-1">[+] 별칭 추가</button>
                         </div>
                         <div className="flex items-center my-2">
                            <input type="checkbox" checked={loc.useSubMap} onChange={e => handleListUpdate('locations', {...loc, useSubMap: e.target.checked})} className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500" />
                            <label className="ml-2 block text-sm text-gray-300">서브맵 사용</label>
                        </div>
                        {loc.useSubMap && (
                            <div className="p-2 border-t border-gray-700 mt-2">
                                <InputField label="서브맵 이미지 URL" value={loc.subMapImageUrl || ''} onChange={e => handleListUpdate('locations', {...loc, subMapImageUrl: e.target.value})} />
                                <h4 className="text-md font-semibold my-2">서브맵 위치</h4>
                                {loc.subLocations?.map(subLoc => (
                                    <div key={subLoc.id} className="p-2 border rounded mb-2 border-gray-600">
                                        <InputField label="이름" value={subLoc.name} onChange={e => handleListUpdate('locations', {...loc, subLocations: loc.subLocations?.map(sl => sl.id === subLoc.id ? {...sl, name: e.target.value} : sl)})} />
                                        <div className="flex space-x-2">
                                            <InputField label="X (%)" type="number" value={subLoc.x} onChange={e => handleListUpdate('locations', {...loc, subLocations: loc.subLocations?.map(sl => sl.id === subLoc.id ? {...sl, x: parseInt(e.target.value)} : sl)})} />
                                            <InputField label="Y (%)" type="number" value={subLoc.y} onChange={e => handleListUpdate('locations', {...loc, subLocations: loc.subLocations?.map(sl => sl.id === subLoc.id ? {...sl, y: parseInt(e.target.value)} : sl)})} />
                                        </div>
                                        <button onClick={() => handleListUpdate('locations', {...loc, subLocations: loc.subLocations?.filter(sl => sl.id !== subLoc.id)})} className="text-red-400 text-xs mt-1">[-] 서브맵 위치 삭제</button>
                                    </div>
                                ))}
                                <AddButton onClick={() => handleListUpdate('locations', {...loc, subLocations: [...(loc.subLocations || []), {id: newId(), name: '새 서브 위치', x: 50, y: 50}]})} text="[+] 서브맵 위치 추가"/>
                            </div>
                        )}
                    </Accordion>
                ))}
                </div>
                <AddButton onClick={() => handleListAdd('locations', {id: newId(), name: '새 장소', x: 50, y: 50, subLocations: []})} text="[+] 위치 추가"/>
            </Accordion>
            
             <Accordion title="세계관 설정" initialOpen={openAccordions['lore']} id="editor-item-lore-main">
                <div id={`editor-item-lore-${config.lore.core.id}`}>
                    <h3 className="text-lg font-semibold my-2">핵심 세계관</h3>
                    <InputField label="제목" value={config.lore.core.title} onChange={e => handleUpdate('lore', {...config.lore, core: {...config.lore.core, title: e.target.value}})} />
                    <InputField as="textarea" label="내용" value={config.lore.core.content} onChange={e => handleUpdate('lore', {...config.lore, core: {...config.lore.core, content: e.target.value}})} />
                </div>
                <h3 className="text-lg font-semibold my-2">{config.uiLabels.lore.additionalInfoTitle}</h3>
                <div className="max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {config.lore.entries.map((entry) => (
                     <div key={entry.id} id={`editor-item-lore-${entry.id}`} className="p-2 border rounded mb-2 border-gray-600">
                        <InputField label="제목 (해금 후)" value={entry.title} onChange={e => handleUpdate('lore', {...config.lore, entries: config.lore.entries.map(l => l.id === entry.id ? {...l, title: e.target.value} : l)})} />
                        <InputField as="textarea" label="내용 (해금 후)" value={entry.content} onChange={e => handleUpdate('lore', {...config.lore, entries: config.lore.entries.map(l => l.id === entry.id ? {...l, content: e.target.value} : l)})} />
                         <div className="flex items-center my-2">
                            <input type="checkbox" checked={entry.hidden} onChange={e => handleUpdate('lore', {...config.lore, entries: config.lore.entries.map(l => l.id === entry.id ? {...l, hidden: e.target.checked} : l)})} className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500" />
                            <label className="ml-2 block text-sm text-gray-300">비밀 정보</label>
                        </div>
                        {entry.hidden && (
                            <div className="p-2 border-t border-gray-700 mt-2">
                                <InputField label="제목 (해금 전)" value={entry.lockedTitle || ''} onChange={e => handleUpdate('lore', {...config.lore, entries: config.lore.entries.map(l => l.id === entry.id ? {...l, lockedTitle: e.target.value} : l)})} />
                                <InputField as="textarea" label="내용 (해금 전)" value={entry.lockedContent || ''} onChange={e => handleUpdate('lore', {...config.lore, entries: config.lore.entries.map(l => l.id === entry.id ? {...l, lockedContent: e.target.value} : l)})} />
                            </div>
                        )}
                        <ConditionEditor conditions={entry.conditions} onChange={newConditions => handleUpdate('lore', {...config.lore, entries: config.lore.entries.map(l => l.id === entry.id ? {...l, conditions: newConditions} : l)})} />
                        <button onClick={() => handleUpdate('lore', {...config.lore, entries: config.lore.entries.filter(l => l.id !== entry.id)})} className="text-red-400 text-xs mt-2">[-] 세계관 항목 삭제</button>
                     </div>
                ))}
                </div>
                <AddButton onClick={() => handleUpdate('lore', {...config.lore, entries: [...config.lore.entries, {id: newId(), conditions: [], title: '새 정보', content: ''}]})} text="[+] 세계관 정보 추가" />
            </Accordion>
            
            <Accordion title="업적 설정" initialOpen={openAccordions['achievements']} id="editor-item-achievements-main">
                <div className="max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {config.achievements.map((cat) => (
                    <Accordion key={cat.id} title={cat.name} initialOpen={openAccordions[cat.id]} id={`editor-item-ach-cat-${cat.id}`} onRemove={() => handleListRemove('achievements', cat.id)}>
                        <InputField label="카테고리 이름" value={cat.name} onChange={e => handleListUpdate('achievements', {...cat, name: e.target.value})} />
                         <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">적용 대상</label>
                            <select value={cat.characterId} onChange={e => handleListUpdate('achievements', {...cat, characterId: e.target.value})} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white">
                                <option value="common">공통</option>
                                {config.characters.map(char => <option key={char.id} value={char.id}>{char.name}</option>)}
                            </select>
                        </div>
                        <h4 className="text-md font-semibold my-2">업적 목록</h4>
                        {cat.achievements.map(ach => (
                            <div key={ach.id} id={`editor-item-achievement-${ach.id}`} className="p-2 border rounded mb-2 border-gray-600">
                                <InputField label="제목 (해금 후)" value={ach.title} onChange={e => handleListUpdate('achievements', {...cat, achievements: cat.achievements.map(a => a.id === ach.id ? {...a, title: e.target.value} : a)})} />
                                <InputField as="textarea" label="설명 (해금 후)" value={ach.description} onChange={e => handleListUpdate('achievements', {...cat, achievements: cat.achievements.map(a => a.id === ach.id ? {...a, description: e.target.value} : a)})} />
                                <InputField label="아이콘 이미지 URL (선택사항)" value={ach.iconUrl || ''} onChange={e => handleListUpdate('achievements', {...cat, achievements: cat.achievements.map(a => a.id === ach.id ? {...a, iconUrl: e.target.value} : a)})} />
                                <div className="flex items-center my-2">
                                    <input type="checkbox" checked={ach.hidden} onChange={e => handleListUpdate('achievements', {...cat, achievements: cat.achievements.map(a => a.id === ach.id ? {...a, hidden: e.target.checked} : a)})} className="h-4 w-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500" />
                                    <label className="ml-2 block text-sm text-gray-300">비밀 업적</label>
                                </div>
                                {ach.hidden && (
                                    <div className="p-2 border-t border-gray-700 mt-2">
                                        <InputField label="제목 (해금 전)" value={ach.lockedTitle || ''} onChange={e => handleListUpdate('achievements', {...cat, achievements: cat.achievements.map(a => a.id === ach.id ? {...a, lockedTitle: e.target.value} : a)})} />
                                        <InputField as="textarea" label="설명 (해금 전)" value={ach.lockedDescription || ''} onChange={e => handleListUpdate('achievements', {...cat, achievements: cat.achievements.map(a => a.id === ach.id ? {...a, lockedDescription: e.target.value} : a)})} />
                                        <InputField label="힌트" value={ach.hint} onChange={e => handleListUpdate('achievements', {...cat, achievements: cat.achievements.map(a => a.id === ach.id ? {...a, hint: e.target.value} : a)})} />
                                    </div>
                                )}
                                <ConditionEditor conditions={ach.conditions} onChange={newConditions => handleListUpdate('achievements', {...cat, achievements: cat.achievements.map(a => a.id === ach.id ? {...a, conditions: newConditions} : a)})} />
                                <button onClick={() => handleListUpdate('achievements', {...cat, achievements: cat.achievements.filter(a => a.id !== ach.id)})} className="text-red-400 text-xs mt-2">[-] 업적 삭제</button>
                            </div>
                        ))}
                        <AddButton onClick={() => handleListUpdate('achievements', {...cat, achievements: [...cat.achievements, {id: newId(), conditions:[], title: '새 업적', description: '', hidden: false, hint: '', iconUrl: ''}]})} text="[+] 업적 추가"/>
                    </Accordion>
                ))}
                </div>
                <AddButton onClick={() => handleListAdd('achievements', {id: newId(), name: '새 카테고리', characterId: 'common', achievements: []})} text="[+] 업적 카테고리 추가"/>
            </Accordion>

            <Accordion title="기억 설정" initialOpen={openAccordions['memories']} id="editor-item-global-memories">
                 <div className="max-h-60 overflow-y-auto custom-scrollbar pr-2">
                 {config.memories.map((mem) => (
                    <div key={mem.id} className="p-2 border rounded mb-2 border-gray-600 flex items-end space-x-2">
                         <div className="flex-grow">
                            <InputField label="기억 변수명" value={mem.variable} onChange={e => handleListUpdate('memories', {...mem, variable: e.target.value})} />
                         </div>
                         <button onClick={() => handleListRemove('memories', mem.id)} className="text-red-400 text-xs mt-2">[-] 기억 삭제</button>
                    </div>
                ))}
                </div>
                <AddButton onClick={() => handleListAdd('memories', {id: newId(), variable: `memory_${config.memories.length + 1}`})} text="[+] 기억 추가"/>
            </Accordion>
            
            <Accordion title="사용된 변수 목록">
                <VariableList config={config} />
            </Accordion>
        </div>
    );
};