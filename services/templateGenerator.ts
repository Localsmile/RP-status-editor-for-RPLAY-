import type { AppConfig, Character } from '../types';

function convertConfigForTemplate(config: AppConfig) {
    return {
        ...config,
        locations: config.locations,
        achievements: config.achievements,
    };
}

export const generateHtmlCode = (config: AppConfig): string => {
    const templateConfig = convertConfigForTemplate(config);
    const configJsonString = JSON.stringify(templateConfig, null, 2);

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RP Status Window</title>
    <style>
        /* Base styles are embedded directly */
        body, html { margin: 0; padding: 0; background-color: transparent; overflow: hidden; }
        .status-window {
            --scale: ${config.size.width / 1000};
            width: ${config.size.width}px;
            height: ${config.size.height}px;
            font-size: calc(${config.font.fontSize}px * var(--scale));
            background-image: linear-gradient(to bottom right, #6d5b97, #3b3a69);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
            position: relative;
            color: white;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .custom-scrollbar::-webkit-scrollbar { width: calc(6px * var(--scale)); }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #FFD700; border-radius: 10px; }
    </style>
</head>
<body>
    <div id="app-container"></div>

    <script>
        (function() {
            const APP_CONFIG = ${configJsonString};
            const SCALE = APP_CONFIG.size.width / 1000;
            const container = document.getElementById('app-container');

            let allVars = {};
            let uiState = {
                activeTab: 'character',
                activeCharId: APP_CONFIG.characters[0]?.id || null,
                activeMap: { type: 'main', url: APP_CONFIG.map.backgroundImageUrl, name: APP_CONFIG.uiLabels.map.mainMapName, parentId: null }
            };

            // --- UTILITY FUNCTIONS ---
            const e = (str) => { // Basic HTML escaping
                return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
            };

            const getVar = (vars, varName) => {
                const value = vars[varName];
                if (value === '' || value === undefined || value === null) {
                    return APP_CONFIG.globalSettings.useDefaultForBlank ? APP_CONFIG.globalSettings.blankVariableValue : '';
                }
                return value;
            };

            const checkConditions = (conditions, vars) => {
                if (!conditions || conditions.length === 0) return true;
                return conditions.every(cond => {
                    const varValue = vars[cond.variable];
                    const condValue = isNaN(parseFloat(cond.value)) ? cond.value : parseFloat(cond.value);
                    const actualValue = isNaN(parseFloat(varValue)) ? varValue : parseFloat(varValue);
                    switch (cond.operator) {
                        case '==': return actualValue == condValue;
                        case '>=': return actualValue >= condValue;
                        case '<=': return actualValue <= condValue;
                        case '!=': return actualValue != condValue;
                        case '>': return actualValue > condValue;
                        case '<': return actualValue < condValue;
                        default: return false;
                    }
                });
            };
            
            const locationLookupMap = new Map();
            APP_CONFIG.locations.forEach(loc => {
                locationLookupMap.set(loc.id, loc);
                if(loc.aliases) {
                    loc.aliases.forEach(alias => locationLookupMap.set(alias, loc));
                }
            });

            // --- SVG CHART GENERATORS ---
            const generateRadarChartSVG = (stats, charName) => {
                const width = 256 * SCALE;
                const height = 200 * SCALE;
                const centerX = width / 2;
                const centerY = height / 2 + 10 * SCALE;
                const radius = Math.min(width, height) / 2 * 0.8;
                const numAxes = stats.length;
                let points = '';
                let lines = '';
                let labels = '';
                
                stats.forEach((stat, i) => {
                    const angle = (Math.PI * 2 * i / numAxes) - (Math.PI / 2);
                    const value = Math.max(0, Math.min(stat.fullMark, stat.value));
                    const x = centerX + radius * (value / stat.fullMark) * Math.cos(angle);
                    const y = centerY + radius * (value / stat.fullMark) * Math.sin(angle);
                    points += \`\${x},\${y} \`;

                    const edgeX = centerX + radius * Math.cos(angle);
                    const edgeY = centerY + radius * Math.sin(angle);
                    lines += \`<line x1="\${centerX}" y1="\${centerY}" x2="\${edgeX}" y2="\${edgeY}" stroke="rgba(255, 255, 255, 0.3)" stroke-width="1"/>\`;

                    const labelX = centerX + (radius + 15 * SCALE) * Math.cos(angle);
                    const labelY = centerY + (radius + 15 * SCALE) * Math.sin(angle);
                    labels += \`<text x="\${labelX}" y="\${labelY}" fill="#fff" font-size="\${12 * SCALE}" text-anchor="middle" dominant-baseline="middle">\${e(stat.name)}</text>\`;
                });
                
                return \`<svg width="\${width}" height="\${height}">
                    \${lines}
                    \${labels}
                    <polygon points="\${points.trim()}" fill="\${APP_CONFIG.characterStatSystemConfig.radar.color}" fill-opacity="0.6" stroke="\${APP_CONFIG.characterStatSystemConfig.radar.color}" stroke-width="2"/>
                </svg>\`;
            };

            const generateDoughnutChartSVG = (stats) => {
                const width = 256 * SCALE;
                const height = 200 * SCALE;
                const centerX = width / 2;
                const centerY = height / 2;
                const outerRadius = Math.min(width, height) / 2 * 0.8;
                const innerRadius = outerRadius * 0.6;
                let totalValue = stats.reduce((sum, stat) => sum + stat.value, 0);
                if (totalValue === 0) totalValue = 1;

                let startAngle = -90;
                let paths = '';

                stats.forEach(stat => {
                    const sweepAngle = (stat.value / totalValue) * 360;
                    const endAngle = startAngle + sweepAngle;
                    
                    const startOuterX = centerX + outerRadius * Math.cos(startAngle * Math.PI / 180);
                    const startOuterY = centerY + outerRadius * Math.sin(startAngle * Math.PI / 180);
                    const endOuterX = centerX + outerRadius * Math.cos(endAngle * Math.PI / 180);
                    const endOuterY = centerY + outerRadius * Math.sin(endAngle * Math.PI / 180);

                    const startInnerX = centerX + innerRadius * Math.cos(endAngle * Math.PI / 180);
                    const startInnerY = centerY + innerRadius * Math.sin(endAngle * Math.PI / 180);
                    const endInnerX = centerX + innerRadius * Math.cos(startAngle * Math.PI / 180);
                    const endInnerY = centerY + innerRadius * Math.sin(startAngle * Math.PI / 180);

                    const largeArcFlag = sweepAngle > 180 ? 1 : 0;
                    
                    paths += \`<path d="M \${startOuterX} \${startOuterY} A \${outerRadius} \${outerRadius} 0 \${largeArcFlag} 1 \${endOuterX} \${endOuterY} L \${startInnerX} \${startInnerY} A \${innerRadius} \${innerRadius} 0 \${largeArcFlag} 0 \${endInnerX} \${endInnerY} Z" fill="\${stat.color}" />\`;
                    
                    startAngle = endAngle;
                });
                
                return \`<svg width="\${width}" height="\${height}">\${paths}</svg>\`;
            };

            // --- RENDER FUNCTIONS ---
            const renderCharacterTab = () => {
                const char = APP_CONFIG.characters.find(c => c.id === uiState.activeCharId);
                if (!char) return '<div>캐릭터를 선택해주세요.</div>';
                
                const getCurrentImage = () => {
                    for (const img of char.images.conditional) {
                        if (allVars[img.conditionVariable] === img.conditionValue) return img.url;
                    }
                    return char.images.default;
                };

                const getStatValue = (stat) => (stat.type === 'fixed') ? (stat.value || 0) : (getVar(allVars, stat.variable) || 0);
                const getGaugeValue = (gauge) => getVar(allVars, gauge.variable) || 0;
                
                const statData = char.stats.map(stat => ({ name: stat.name, value: getStatValue(stat), color: stat.color, fullMark: stat.max }));
                const locationName = locationLookupMap.get(getVar(allVars, char.locationVariable))?.name || '???';
                
                let statsHtml = '';
                if (APP_CONFIG.characterStatSystem === 'radar' && char.stats.length > 2) {
                    statsHtml = generateRadarChartSVG(statData, char.name);
                } else if (APP_CONFIG.characterStatSystem === 'doughnut' && char.stats.length > 0) {
                    statsHtml = generateDoughnutChartSVG(statData);
                } else if (APP_CONFIG.characterStatSystem === 'bar' && char.stats.length > 0) {
                    statsHtml = char.stats.map(stat => \`
                        <div key="\${stat.id}">
                            <div style="display: flex; justify-content: space-between; font-size: \${0.875 * SCALE}rem;">
                                <span>\${e(stat.name)}</span>
                                <span>\${getStatValue(stat)}/\${stat.max}</span>
                            </div>
                            <div style="width: 100%; background-color: rgba(0,0,0,0.3); border-radius: 9999px; height: 0.5rem;">
                                <div style="height: 100%; border-radius: 9999px; width: \${getStatValue(stat) / stat.max * 100}%; background-color: \${stat.color};"></div>
                            </div>
                        </div>
                    \`).join('');
                }

                return \`
                    <div style="padding: \${1.5 * SCALE}rem; display: grid; grid-template-columns: 1fr 1fr; gap: \${1.5 * SCALE}rem; height: 100%; overflow-y: auto;" class="custom-scrollbar">
                        <div style="display: flex; flex-direction: column; align-items: center;">
                            <img src="\${getCurrentImage() || 'https://via.placeholder.com/256'}" alt="\${e(char.name)}" style="width: \${256 * SCALE}px; height: \${256 * SCALE}px; object-fit: cover; border-radius: 50%; border: 4px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3); margin-bottom: \${1 * SCALE}rem;">
                            <h3 style="font-weight: bold; font-size: \${2.25 * SCALE}rem;">\${e(char.name)}</h3>
                            <p style="color: #D1D5DB; margin-bottom: \${0.5 * SCALE}rem; font-size: \${1.125 * SCALE}rem;">[\${e(char.origin)}]</p>
                            <p style="color: #67E8F9; margin-bottom: \${1 * SCALE}rem; font-size: \${0.875 * SCALE}rem;">\${e(APP_CONFIG.uiLabels.character.currentLocationPrefix)} \${e(locationName)}</p>

                            <div style="width: 100%; padding: \${1*SCALE}rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; margin-bottom: \${1 * SCALE}rem;">
                                <h4 style="font-weight: 600; text-align: center; color: #FBBF24; font-size: \${1.25 * SCALE}rem; margin-bottom: \${0.75 * SCALE}rem;">\${e(APP_CONFIG.uiLabels.character.relationshipTitle)}</h4>
                                <div style="text-align: center; margin-bottom: \${0.5 * SCALE}rem;"><p style="font-weight: bold; font-size: \${1.5 * SCALE}rem;">\${e(getVar(allVars, char.relationshipVariable)) || '???'}</p></div>
                                <div style="display: flex; flex-direction: column; gap: \${0.5 * SCALE}rem;">
                                \${char.gauges.map(gauge => \`
                                    <div>
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; color: #D1D5DB; font-size: \${0.875*SCALE}rem;">
                                            <span>\${e(gauge.name)}</span>
                                            <span>\${getGaugeValue(gauge)}/\${gauge.max}</span>
                                        </div>
                                        <div style="width: 100%; background-color: rgba(0,0,0,0.3); border-radius: 9999px; height: \${10*SCALE}px;">
                                            <div style="height: 100%; border-radius: 9999px; width: \${(getGaugeValue(gauge)/gauge.max)*100}%; background-color: \${gauge.color};"></div>
                                        </div>
                                    </div>
                                \`).join('')}
                                </div>
                            </div>
                            
                            <div style="width: 100%; padding: \${1*SCALE}rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px;">
                                <h4 style="font-weight: 600; text-align: center; color: #FBBF24; font-size: \${1.25 * SCALE}rem; margin-bottom: \${0.75 * SCALE}rem;">\${e(APP_CONFIG.uiLabels.character.statsTitle)}</h4>
                                <div style="display: flex; flex-direction: column; gap: \${0.5 * SCALE}rem;">\${statsHtml}</div>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: \${1 * SCALE}rem;">
                            <div style="padding: \${1*SCALE}rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px;">
                                <h4 style="font-weight: 600; color: #FBBF24; font-size: \${1.25 * SCALE}rem; margin-bottom: \${0.5 * SCALE}rem;">\${e(APP_CONFIG.uiLabels.character.profileTitle)}</h4>
                                <p style="color: #D1D5DB; font-size: \${1 * SCALE}rem;">\${e(char.profile)}</p>
                            </div>
                            <div style="padding: \${1*SCALE}rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px;">
                                <h4 style="font-weight: 600; color: #FBBF24; font-size: \${1.25 * SCALE}rem; margin-bottom: \${0.5 * SCALE}rem;">\${e(APP_CONFIG.uiLabels.character.innerThoughtTitle)}</h4>
                                <p style="font-style: italic; color: #D1D5DB; font-size: \${1 * SCALE}rem;">"\${e(getVar(allVars, char.innerThoughtVariable)) || '...'}"</p>
                            </div>
                             <div style="padding: \${1*SCALE}rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; flex-grow: 1;">
                                <h4 style="font-weight: 600; color: #FBBF24; font-size: \${1.25 * SCALE}rem; margin-bottom: \${0.5 * SCALE}rem;">\${e(APP_CONFIG.uiLabels.character.unlocksTitle)}</h4>
                                <div style="display: flex; flex-direction: column; gap: \${0.75*SCALE}rem;">
                                    \${char.profileUnlocks.map(unlock => {
                                        const isUnlocked = checkConditions(unlock.conditions, allVars);
                                        const title = isUnlocked ? unlock.title : (unlock.lockedTitle || (unlock.hidden ? "비밀 정보" : unlock.title));
                                        const content = isUnlocked ? unlock.content : unlock.lockedContent || '';
                                        return \`
                                            <div style="\${!isUnlocked ? 'color: #6B7280; font-style: italic; opacity: 0.7;' : ''}">
                                                <h5 style="font-weight: 600; font-size: \${1.05 * SCALE}rem;">\${!isUnlocked ? '&#128274; ' : ''}\${e(title)}</h5>
                                                \${content ? \`<p style="font-size: \${0.95 * SCALE}rem; color: #D1D5DB; margin-top: 0.25em;">\${e(content)}</p>\` : ''}
                                            </div>
                                        \`;
                                    }).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
            };

            const renderMapTab = () => {
                const { type, url, name, parentId } = uiState.activeMap;
                
                const charactersByLocation = APP_CONFIG.characters.reduce((acc, char) => {
                    const locValue = getVar(allVars, char.locationVariable);
                    const location = locationLookupMap.get(locValue);
                    if (location) {
                        if (!acc[location.id]) acc[location.id] = [];
                        acc[location.id].push(char);
                    }
                    return acc;
                }, {});

                const currentLocations = (type === 'main') 
                    ? APP_CONFIG.locations 
                    : (APP_CONFIG.locations.find(l => l.id === parentId)?.subLocations || []);

                return \`
                    <div style="height: 100%; position: relative; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; overflow: hidden;">
                        <div style="position: absolute; inset: 0; background-image: url('\${url}'); background-size: cover; background-position: center;"></div>
                        <div style="position: absolute; inset: 0; background-color: rgba(0,0,0,0.5);"></div>
                        
                        \${currentLocations.map(loc => \`
                            <div style="position: absolute; left: \${loc.x}%; top: \${loc.y}%; transform: translate(-50%, -50%); cursor: \${loc.useSubMap ? 'pointer' : 'default'};" \${loc.useSubMap ? \`onclick="handlePinClick('\${loc.id}')"\` : ''}>
                                <div title="\${e(loc.name)}" style="width: \${16*SCALE}px; height: \${16*SCALE}px; border-radius: 50%; background-color: \${loc.useSubMap ? '#FBBF24' : '#34D399'}; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.5);"></div>
                                <div style="text-align: center; background: rgba(0,0,0,0.5); border-radius: 9999px; padding: \${0.1*SCALE}rem \${0.5*SCALE}rem; margin-top: 0.25rem; white-space: nowrap; font-size: \${12*SCALE}px;">\${e(loc.name)}</div>
                            </div>
                        \`).join('')}

                        \${type === 'main' ? Object.entries(charactersByLocation).map(([locId, chars]) => {
                            const location = APP_CONFIG.locations.find(l => l.id === locId);
                            if (!location) return '';
                            
                            const iconWidth = 40 * SCALE;
                            return chars.map((char, index) => {
                                const offsetX = (index - (chars.length - 1) / 2) * (iconWidth + 4 * SCALE);
                                return \`
                                    <div title="\${e(char.name)}" style="position: absolute; left: \${location.x}%; top: \${location.y}%; transform: translate(calc(-50% + \${offsetX}px), calc(-100% - \${10*SCALE}px)); transition: transform 0.3s;">
                                        <img src="\${char.images.default || 'https://via.placeholder.com/48'}" style="width: \${iconWidth}px; height: \${iconWidth}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.5);" />
                                    </div>
                                \`;
                            }).join('');
                        }).join('') : ''}
                        
                        <div style="position: absolute; bottom: 1rem; left: 1rem; padding: 0.75rem; border-radius: 0.5rem; background: rgba(0,0,0,0.7);">
                            <h3 style="font-weight: bold; color: #FBBF24; font-size: \${1.125*SCALE}rem;">\${e(name)}</h3>
                            \${type === 'sub' ? \`<button onclick="handleBackToMainMap()" style="font-size: \${0.875*SCALE}rem; color: #67E8F9; text-decoration: underline; background: none; border: none; cursor: pointer;">\${e(APP_CONFIG.uiLabels.map.backToMainMap)}</button>\` : ''}
                        </div>
                    </div>
                \`;
            };
            
            const renderLoreTab = () => {
                 const { lore, uiLabels } = APP_CONFIG;
                 return \`
                    <div style="padding: \${1*SCALE}rem; height: 100%; overflow-y: auto;" class="custom-scrollbar">
                        <div style="padding: \${1*SCALE}rem; margin-bottom: \${1*SCALE}rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px;">
                            <h4 style="font-weight: 600; color: #FBBF24; font-size: \${1.25 * SCALE}rem; margin-bottom: \${0.5 * SCALE}rem;">\${e(lore.core.title)}</h4>
                            <p style="color: #D1D5DB; white-space: pre-wrap; font-size: \${0.95 * SCALE}rem;">\${e(getVar(allVars, 'lore_core_content') || lore.core.content)}</p>
                        </div>
                        <h4 style="font-weight: 600; color: #FBBF24; font-size: \${1.25 * SCALE}rem; margin-bottom: \${0.5 * SCALE}rem;">\${e(uiLabels.lore.additionalInfoTitle)}</h4>
                        \${lore.entries.map(entry => {
                            const isUnlocked = checkConditions(entry.conditions, allVars);
                            const title = isUnlocked ? entry.title : (entry.lockedTitle || (entry.hidden ? "비밀 정보" : entry.title));
                            const content = isUnlocked ? entry.content : entry.lockedContent || '';
                            return \`
                                <div style="padding: \${1*SCALE}rem; margin-bottom: \${0.5*SCALE}rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; \${!isUnlocked ? 'color: #6B7280; font-style: italic; opacity: 0.7;' : ''}">
                                    <h5 style="font-weight: 600; font-size: \${1.05 * SCALE}rem;">\${!isUnlocked ? '&#128274; ' : ''}\${e(title)}</h5>
                                    \${content ? \`<p style="font-size: \${0.95 * SCALE}rem; color: #D1D5DB; margin-top: 0.25em;">\${e(content)}</p>\` : ''}
                                </div>
                            \`;
                        }).join('')}
                    </div>
                 \`;
            };
            
            const renderAchievementsTab = () => {
                 const { achievements, uiLabels } = APP_CONFIG;
                 return \`
                    <div style="padding: \${1*SCALE}rem; height: 100%; overflow-y: auto;" class="custom-scrollbar">
                        \${achievements.map(category => \`
                            <div style="margin-bottom: \${1.5 * SCALE}rem;">
                                <h3 style="font-weight: bold; color: #FBBF24; border-bottom: 2px solid rgba(251, 191, 36, 0.5); padding-bottom: \${0.5*SCALE}rem; margin-bottom: \${0.75*SCALE}rem; font-size: \${1.5*SCALE}rem;">\${e(category.name)}</h3>
                                <div style="display: flex; flex-direction: column; gap: \${0.75 * SCALE}rem;">
                                \${category.achievements.map(ach => {
                                    const isUnlocked = checkConditions(ach.conditions, allVars);
                                    const title = isUnlocked ? ach.title : (ach.lockedTitle || '???');
                                    const description = isUnlocked ? ach.description : (ach.lockedDescription || '???');
                                    const icon = ach.iconUrl ? \`<img src="\${ach.iconUrl}" alt="\${e(title)}" style="width: 100%; height: 100%; object-fit: contain;">\` : (isUnlocked ? '🏆' : (ach.hidden ? '❓' : '&#128274;'));

                                    return \`
                                        <div style="padding: \${0.75*SCALE}rem; display: flex; align-items: flex-start; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; \${!isUnlocked ? 'opacity: 0.6;' : ''}">
                                            <div style="font-size: \${2*SCALE}rem; width: \${2*SCALE}rem; height: \${2*SCALE}rem; flex-shrink: 0; margin-right: \${1*SCALE}rem; display: flex; align-items: center; justify-content: center;">\${icon}</div>
                                            <div style="flex-grow: 1;">
                                                <h4 style="font-weight: 600; font-size: \${1*SCALE}rem;">\${e(title)}</h4>
                                                <p style="font-size: \${0.875*SCALE}rem; color: #D1D5DB;">\${e(description)}</p>
                                                \${ach.hidden && !isUnlocked && ach.hint ? \`<p style="font-style: italic; font-size: \${0.8*SCALE}rem; color: #9CA3AF; margin-top: 0.25rem;">\${e(uiLabels.achievements.hintPrefix)} \${e(ach.hint)}</p>\` : ''}
                                            </div>
                                            \${!isUnlocked ? \`<div style="margin-left: auto; color: #6B7280; font-style: italic; display: flex; align-items: center; flex-shrink: 0; font-size: \${0.875*SCALE}rem;">&#128274; \${e(uiLabels.achievements.lockedStatus)}</div>\` : ''}
                                        </div>
                                    \`;
                                }).join('')}
                                </div>
                            </div>
                        \`).join('')}
                    </div>
                 \`;
            };

            const renderMemoriesTab = () => {
                const { memories, uiLabels } = APP_CONFIG;
                return \`
                    <div style="padding: \${1*SCALE}rem; height: 100%; overflow-y: auto;" class="custom-scrollbar">
                        <h3 style="font-weight: bold; color: #FBBF24; padding-bottom: \${0.5*SCALE}rem; margin-bottom: \${0.75*SCALE}rem; font-size: \${1.5*SCALE}rem;">\${e(uiLabels.memories.title)}</h3>
                        <div style="display: flex; flex-direction: column; gap: \${1*SCALE}rem;">
                            \${memories.map(mem => {
                                const content = getVar(allVars, mem.variable);
                                return content ? \`
                                    <div style="padding: \${1*SCALE}rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px;">
                                        <p style="color: #D1D5DB; white-space: pre-wrap; font-size: \${1*SCALE}rem;">\${e(content)}</p>
                                    </div>
                                \` : '';
                            }).join('')}
                        </div>
                    </div>
                \`;
            };

            const render = () => {
                let content = '';
                switch (uiState.activeTab) {
                    case 'character': content = renderCharacterTab(); break;
                    case 'map': content = renderMapTab(); break;
                    case 'lore': content = renderLoreTab(); break;
                    case 'achievements': content = renderAchievementsTab(); break;
                    case 'memories': content = renderMemoriesTab(); break;
                    default: content = '<div>...</div>';
                }

                const allTabs = [
                    {id: 'character', name: APP_CONFIG.uiLabels.mainTabs.character, flag: true},
                    {id: 'map', name: APP_CONFIG.uiLabels.mainTabs.map, flag: APP_CONFIG.featureFlags.showMap},
                    {id: 'memories', name: APP_CONFIG.uiLabels.mainTabs.memories, flag: APP_CONFIG.featureFlags.showMemories},
                    {id: 'lore', name: APP_CONFIG.uiLabels.mainTabs.lore, flag: APP_CONFIG.featureFlags.showLore},
                    {id: 'achievements', name: APP_CONFIG.uiLabels.mainTabs.achievements, flag: APP_CONFIG.featureFlags.showAchievements}
                ];
                const mainTabs = allTabs.filter(t => t.flag);

                container.innerHTML = \`
                    <div class="status-window" style="font-family: \${APP_CONFIG.font.fontFamily};">
                        <div style="height: \${40*SCALE}px; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-weight: bold; letter-spacing: 0.05em; flex-shrink: 0;">\${e(APP_CONFIG.uiLabels.mainWindowTitle)}</div>
                        <div style="display: flex; background: rgba(0,0,0,0.2); padding: \${4*SCALE}px; flex-shrink: 0;">
                            \${mainTabs.map(tab => \`
                                <button onclick="handleMainTabClick('\${tab.id}')" style="flex: 1; padding: \${12*SCALE}px 0; text-align: center; font-weight: 600; font-size: \${14*SCALE}px; position: relative; transition: color 0.2s; color: \${uiState.activeTab === tab.id ? 'white' : '#9CA3AF'}; background: none; border: none; cursor: pointer;">
                                    \${e(tab.name)}
                                    \${uiState.activeTab === tab.id ? \`<span style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 70%; height: \${3*SCALE}px; background-color: #FBBF24; border-radius: 2px;"></span>\` : ''}
                                </button>
                            \`).join('')}
                        </div>
                        <div style="flex-grow: 1; overflow: hidden; display: flex; flex-direction: column;">
                            \${uiState.activeTab === 'character' ? \`
                                <div style="flex-shrink: 0; display: flex; border-bottom: 1px solid rgba(255,255,255,0.2); overflow-x: auto;">
                                    \${APP_CONFIG.characters.map(char => \`
                                        <button onclick="handleCharTabClick('\${char.id}')" style="padding: \${12*SCALE}px; text-align: center; font-weight: 600; cursor: pointer; border-bottom: 2px solid; flex-shrink: 0; font-size: \${14*SCALE}px; background: none; border-top: none; border-left: none; border-right: none; color: \${uiState.activeCharId === char.id ? '#67E8F9' : '#9CA3AF'}; border-color: \${uiState.activeCharId === char.id ? '#67E8F9' : 'transparent'};">
                                            \${e(char.name)}
                                        </button>
                                    \`).join('')}
                                </div>
                            \` : ''}
                            <div style="flex-grow: 1; overflow: hidden;">\${content}</div>
                        </div>
                    </div>
                \`;
                 // Add font from Google Fonts
                const styleElement = document.createElement('style');
                styleElement.innerHTML = \`@import url('\${APP_CONFIG.font.importUrl}');\`;
                document.head.appendChild(styleElement);
            };

            // --- EVENT HANDLERS (exposed to global scope for inline onclick) ---
            window.handleMainTabClick = (tabId) => {
                uiState.activeTab = tabId;
                render();
            };
            window.handleCharTabClick = (charId) => {
                uiState.activeCharId = charId;
                render();
            };
            window.handlePinClick = (locationId) => {
                const location = APP_CONFIG.locations.find(l => l.id === locationId);
                if (location && location.useSubMap && location.subMapImageUrl) {
                    uiState.activeMap = { type: 'sub', url: location.subMapImageUrl, name: location.name, parentId: location.id };
                    render();
                }
            };
            window.handleBackToMainMap = () => {
                uiState.activeMap = { type: 'main', url: APP_CONFIG.map.backgroundImageUrl, name: APP_CONFIG.uiLabels.map.mainMapName, parentId: null };
                render();
            };

            // --- INITIALIZATION ---
            window.onUpdateData = (statusViewData) => {
                allVars = statusViewData.getObject();
                render();
            };

            // Initial render
            render();
        })();
    </script>
</body>
</html>
`;
};
