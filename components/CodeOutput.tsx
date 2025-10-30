
import React, { useState, useEffect } from 'react';

interface CodeOutputProps {
    code: string;
}

export const CodeOutput: React.FC<CodeOutputProps> = ({ code }) => {
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
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
        <div className="h-full flex flex-col bg-gray-900 text-white relative">
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors text-sm z-10"
            >
                {copyStatus === 'idle' ? 'HTML 복사' : '복사됨!'}
            </button>
            <pre className="h-full w-full overflow-auto p-4 text-sm whitespace-pre-wrap custom-scrollbar">
                <code className="language-html">{code}</code>
            </pre>
        </div>
    );
};
