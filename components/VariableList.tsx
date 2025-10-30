import React, { useMemo, useState, useEffect } from 'react';
import type { AppConfig, UnlockCondition } from '../types';

interface VariableListProps {
    config: AppConfig;
}

export const VariableList: React.FC<VariableListProps> = ({ config }) => {
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    const variables = useMemo(() => {
        const varSet = new Set<string>();

        const addConditions = (conditions: UnlockCondition[]) => {
            conditions.forEach(cond => varSet.add(cond.variable));
        };

        // Characters
        config.characters.forEach(char => {
            varSet.add(char.locationVariable);
            varSet.add(char.relationshipVariable);
            varSet.add(char.innerThoughtVariable);
            char.stats.forEach(stat => {
                if(stat.type === 'variable' && stat.variable) {
                    varSet.add(stat.variable);
                }
            });
            char.gauges.forEach(gauge => {
                if (gauge.variable) varSet.add(gauge.variable);
            });
            char.images.conditional.forEach(img => varSet.add(img.conditionVariable));
            char.profileUnlocks.forEach(unlock => addConditions(unlock.conditions));
        });

        // Lore
        config.lore.entries.forEach(entry => addConditions(entry.conditions));

        // Achievements
        config.achievements.forEach(category => {
            category.achievements.forEach(ach => addConditions(ach.conditions));
        });

        // Memories
        config.memories.forEach(mem => {
            if (mem.variable) varSet.add(mem.variable);
        });

        return Array.from(varSet).filter(v => v).sort(); // filter out empty strings
    }, [config]);

    const handleCopy = () => {
        const textToCopy = variables.join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopyStatus('copied');
        });
    };

     useEffect(() => {
        if (copyStatus === 'copied') {
            const timer = setTimeout(() => setCopyStatus('idle'), 2000);
            return () => clearTimeout(timer);
        }
    }, [copyStatus]);

    return (
        <div>
             <button
                onClick={handleCopy}
                className="w-full mb-2 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors text-sm"
            >
                {copyStatus === 'idle' ? '모두 복사' : '복사됨!'}
            </button>
            <div className="p-2 bg-gray-900/50 border border-gray-700 rounded-lg max-h-60 overflow-y-auto custom-scrollbar">
                <ul className="space-y-1">
                    {variables.map(variable => (
                        <li key={variable} className="text-xs text-gray-300 bg-gray-700 p-2 rounded-md font-mono">
                            {variable}
                        </li>
                    ))}
                </ul>
                {variables.length === 0 && <p className="text-xs text-gray-500 text-center">정의된 변수가 없습니다.</p>}
            </div>
        </div>
    );
};