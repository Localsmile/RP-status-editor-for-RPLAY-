import type { AppConfig } from './types';

export const initialConfig: AppConfig = {
    font: {
        importUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap',
        fontFamily: "'Noto Sans KR', sans-serif",
        fontSize: 16,
    },
    size: { width: 1000, height: 1000 },
    characterStatSystem: 'bar',
    characterStatSystemConfig: {
        radar: {
            color: '#00f5ff'
        }
    },
    map: {
        backgroundImageUrl: 'https://i.imgur.com/gSj0x6j.jpeg',
    },
    memories: [
        { id: 'mem1', variable: 'memory_1' },
        { id: 'mem2', variable: 'memory_2' },
        { id: 'mem3', variable: 'memory_3' },
    ],
    uiLabels: {
        mainWindowTitle: "RP 아카데미 상태창",
        mainTabs: {
            character: "인물 정보",
            map: "지도",
            memories: "기억",
            lore: "세계관",
            achievements: "업적"
        },
        character: {
            relationshipTitle: "관계 정보",
            statsTitle: "능력치",
            profileTitle: "핵심 프로필",
            innerThoughtTitle: "속마음",
            unlocksTitle: "인물 심층 정보",
            currentLocationPrefix: "현재 위치:",
        },
        memories: {
            title: "기억의 편린"
        },
        lore: {
            additionalInfoTitle: "추가 정보"
        },
        map: {
            mainMapName: "아카데미 지도",
            backToMainMap: "메인 지도로 돌아가기"
        },
        achievements: {
            hintPrefix: "힌트:",
            lockedStatus: "잠김"
        }
    },
    globalSettings: {
        useDefaultForBlank: false,
        blankVariableValue: '???',
    },
    featureFlags: {
        showMap: true,
        showMemories: true,
        showLore: true,
        showAchievements: true,
    },
    locations: [
        { 
            id: "library", 
            name: "중앙 도서관", 
            x: 25, 
            y: 30, 
            aliases: ["도서관"],
            useSubMap: true,
            subMapImageUrl: 'https://i.imgur.com/OIIsS5o.jpeg',
            subLocations: [
                { id: 'library_desk', name: '안내 데스크', x: 20, y: 50},
                { id: 'library_archive', name: '고서 보관실', x: 80, y: 75},
            ]
        },
        { id: "dormitory", name: "기숙사", x: 75, y: 20, aliases: [] },
        { id: "garden", name: "비밀의 화원", x: 50, y: 65, aliases: [] },
        { id: "lab", name: "연구실", x: 15, y: 80, aliases: [] },
        { id: "training_ground", name: "훈련장", x: 85, y: 75, aliases: ["연병장", "훈련하는 곳"] },
    ],
    characters: [
        {
            id: 'lumina', prefix: 'char_a', name: '루미나', origin: "아르카디아", profile: "장난기 많은 도발가. 상대를 놀리고 약 올리는 것을 즐기는 메스가키 타입.", 
            locationVariable: 'char_a_location',
            relationshipVariable: 'char_a_relationship',
            innerThoughtVariable: 'char_a_innerThought',
            images: {
                default: 'https://erie.uk/share/test/1.webp',
                conditional: [
                    { id: 'img1', conditionVariable: 'char_a_mood', conditionValue: 'angry', url: 'https://erie.uk/share/test/2.webp' }
                ]
            },
            profileUnlocks: [
                { id: 'pu1', conditions: [{id: 'c1', variable: 'char_a_affection', operator: '>=', value: '10'}], title: "숨겨진 속내", content: "사실은 외로움을 많이 타며 관심을 갈구하고 있다.", hidden: false },
                { id: 'pu2', conditions: [{id: 'c2', variable: 'char_a_affection', operator: '>=', value: '30'}], title: "과거의 상처", content: "성자로서의 책임감 때문에 많은 것을 포기해야만 했다.", hidden: true, lockedTitle: "???", lockedContent: "더 깊은 유대감이 필요하다." },
                { id: 'pu4', conditions: [], title: "취미", content: "오래된 마도서를 수집하는 것을 좋아한다.", hidden: false },
            ],
            stats: [
                { id: 's1', name: '힘', type: 'variable', variable: 'char_a_str', max: 100, color: '#f87171' },
                { id: 's2', name: '마력', type: 'variable', variable: 'char_a_mag', max: 100, color: '#60a5fa' },
                { id: 's3', name: '민첩', type: 'fixed', value: 80, max: 100, color: '#4ade80' },
            ],
            gauges: [
                { id: 'g1', name: '호감도', variable: 'char_a_affection', max: 100, color: '#f472b6' }
            ]
        },
        {
            id: 'kaela', prefix: 'char_b', name: '카엘라', origin: "엘드리아", profile: "전통과 명예에 집착하는 여기사. 고지식하며 충동적이다.", 
            locationVariable: 'char_b_location',
            relationshipVariable: 'char_b_relationship',
            innerThoughtVariable: 'char_b_innerThought',
            images: { default: 'https://erie.uk/share/test/2.webp', conditional: [] },
            profileUnlocks: [
                { id: 'pu3', conditions: [{id: 'c3', variable: 'char_b_affection', operator: '>=', value: '10'}], title: "칭찬에 약하다", content: "칭찬을 받으면 겉으로는 무뚝뚝하지만 속으로는 무척 기뻐한다.", hidden: false },
            ],
            stats: [
                { id: 's6', name: '검술', type: 'variable', variable: 'char_b_sword', max: 100, color: '#f87171' },
                { id: 's7', name: '방어', type: 'variable', variable: 'char_b_def', max: 100, color: '#60a5fa' },
            ],
            gauges: []
        },
    ],
    lore: {
        core: { id: 'core', title: '아카데미 규칙', content: "[이름: 아카데미]\n핵심: 여신이 창조한 고립 차원\n목적: 여러 세계의 문제적 인물들을 격리하고 교화" },
        entries: [
            { id: 'arcadia', conditions: [{id: 'c4', variable: 'lore_arcadia_unlocked', operator: '==', value: 'true'}], title: '아르카디아', content: "성자와 마왕의 대립이 격화된 신성력과 마력이 충돌하는 세계. 루미나의 고향이다." },
            { 
                id: 'eldria', 
                conditions: [{id: 'c5', variable: 'lore_eldria_unlocked', operator: '==', value: 'true'}], 
                title: '엘드리아', 
                content: "끝없는 전쟁으로 명예와 기사도가 중시되는 세계. 카엘라의 고향이다.",
                hidden: true,
                lockedTitle: "미지의 세계",
                lockedContent: "특정 조건을 만족하면 이 세계에 대한 정보가 해금됩니다."
            },
        ]
    },
    achievements: [
        {
            id: 'common_ach',
            name: '공통 업적',
            characterId: 'common',
            achievements: [
                { id: 'ac1', conditions: [{id: 'c6', variable: 'ach_common_first_meet', operator: '==', value: 'true'}], title: "첫 만남", description: "아카데미에서 누군가와 처음으로 마주쳤다.", hidden: false, hint: "", iconUrl: '' },
                { id: 'ac2', conditions: [{id: 'c7', variable: 'ach_common_hidden_1', operator: '==', value: 'true'}], title: "숨겨진 발견", description: "여신의 동상 뒤에서 비밀 통로를 찾아냈다.", hidden: true, hint: "여신의 물건에 손을 대는 것은 위험할 수 있다.", iconUrl: 'https://i.imgur.com/example.png', lockedTitle: "비밀스러운 장소", lockedDescription: "아카데미 어딘가에는 숨겨진 장소가 있는 것 같다." },
            ]
        },
        {
            id: 'lumina_ach',
            name: '루미나 전용',
            characterId: 'lumina',
            achievements: [
                 { id: 'ac3', conditions: [{id: 'c8', variable: 'ach_lumina_gift', operator: '==', value: 'true'}], title: "첫 선물", description: "루미나에게 첫 선물을 건븄다.", hidden: false, hint: "", iconUrl: '' }
            ]
        }
    ]
};