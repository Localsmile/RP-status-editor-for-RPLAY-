export interface FontConfig {
    importUrl: string;
    fontFamily: string;
    fontSize: number;
}

export interface SubLocation {
    id: string;
    name: string;
    x: number;
    y: number;
}

export interface Location {
    id:string;
    name: string;
    x: number;
    y: number;
    aliases?: string[];
    useSubMap?: boolean;
    subMapImageUrl?: string;
    subLocations?: SubLocation[];
}

export interface CharacterImage {
    id: string;
    conditionVariable: string;
    conditionValue: string;
    url: string;
}

export interface UnlockCondition {
    id: string;
    variable: string;
    operator: '==' | '>=' | '<=' | '!=' | '>' | '<';
    value: string;
}

export interface ProfileUnlock {
    id: string;
    conditions: UnlockCondition[];
    title: string;
    content: string;
    hidden?: boolean;
    lockedTitle?: string;
    lockedContent?: string;
}

export interface Stat {
    id: string;
    name: string;
    type: 'variable' | 'fixed';
    variable?: string;
    value?: number;
    max: number;
    color: string;
}

export interface Gauge {
    id: string;
    name: string;
    variable: string;
    max: number;
    color: string;
}

export interface Character {
    id:string;
    prefix: string;
    name: string;
    origin: string;
    profile: string;
    images: {
        default: string;
        conditional: CharacterImage[];
    };
    profileUnlocks: ProfileUnlock[];
    stats: Stat[];
    gauges: Gauge[];
    // Dynamic text variables
    locationVariable: string;
    relationshipVariable: string;
    innerThoughtVariable: string;
}

export interface LoreEntry {
    id:string;
    conditions: UnlockCondition[];
    title: string;
    content: string;
    hidden?: boolean;
    lockedTitle?: string;
    lockedContent?: string;
}

export interface Lore {
    core: {
        id: string;
        title: string;
        content: string;
    };
    entries: LoreEntry[];
}

export interface Achievement {
    id: string;
    conditions: UnlockCondition[];
    title: string;
    description: string;
    hidden: boolean;
    hint: string;
    iconUrl?: string;
    lockedTitle?: string;
    lockedDescription?: string;
}

export interface AchievementCategory {
    id: string;
    name: string;
    characterId: 'common' | string; // 'common' or character id
    achievements: Achievement[];
}

export type CharacterStatSystem = 'bar' | 'radar' | 'doughnut';

export interface MapConfig {
    backgroundImageUrl: string;
}

export interface Memory {
    id: string;
    variable: string;
}

export interface UILabels {
    mainWindowTitle: string;
    mainTabs: {
        character: string;
        map: string;
        memories: string;
        lore: string;
        achievements: string;
    };
    character: {
        relationshipTitle: string;
        statsTitle: string;
        profileTitle: string;
        innerThoughtTitle: string;
        unlocksTitle: string;
        currentLocationPrefix: string;
    };
    memories: {
        title: string;
    };
    lore: {
        additionalInfoTitle: string;
    };
    map: {
        mainMapName: string;
        backToMainMap: string;
    };
    achievements: {
        hintPrefix: string;
        lockedStatus: string;
    };
}

export interface AppConfig {
    font: FontConfig;
    locations: Location[];
    characters: Character[];
    lore: Lore;
    achievements: AchievementCategory[];
    characterStatSystem: CharacterStatSystem;
    characterStatSystemConfig: {
        radar: {
            color: string;
        }
    };
    size: {
        width: number;
        height: number;
    };
    map: MapConfig;
    memories: Memory[];
    uiLabels: UILabels;
    globalSettings: {
        useDefaultForBlank: boolean;
        blankVariableValue: string;
    };
    featureFlags: {
        showMap: boolean;
        showMemories: boolean;
        showLore: boolean;
        showAchievements: boolean;
    };
}

// Editor focus type
export type EditorFocusTarget = 
    | { type: 'character', id: string, field?: 'name' | 'profile' | 'origin' | 'stats' | 'unlocks' | 'images' | 'gauges' }
    | { type: 'location', id: string, subId?: string }
    | { type: 'lore', id: string, subId?: string }
    | { type: 'achievement', id: string, subId?: string }
    | { type: 'global', field: 'map' | 'memories' | 'uiLabels' | 'settings' | 'features' };

export interface EditorFocus {
    target: EditorFocusTarget | null;
}