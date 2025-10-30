import React, { useState, useCallback } from 'react';
import { EditorPanel } from './components/EditorPanel';
import { PreviewWindow } from './components/PreviewWindow';
import { CodeOutput } from './components/CodeOutput';
import { initialConfig } from './constants';
import type { AppConfig, EditorFocus } from './types';
import { generateHtmlCode } from './services/templateGenerator';

const App: React.FC = () => {
    const [config, setConfig] = useState<AppConfig>(initialConfig);
    const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
    const [editorFocus, setEditorFocus] = useState<EditorFocus>({ target: null });

    const handleLocationUpdate = useCallback((locationId: string, newPosition: { x: number; y: number }) => {
        setConfig(prevConfig => {
            const newLocations = prevConfig.locations.map(loc => 
                loc.id === locationId ? { ...loc, ...newPosition } : loc
            );
            return { ...prevConfig, locations: newLocations };
        });
    }, []);

    const htmlCode = generateHtmlCode(config);

    return (
        <div className="flex h-screen bg-gray-800 text-gray-200 font-sans antialiased">
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #1f2937; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }
            `}</style>
            <aside className="w-[450px] h-full overflow-y-auto bg-gray-900 shadow-2xl p-4 custom-scrollbar flex-shrink-0">
                <EditorPanel 
                    config={config} 
                    onConfigChange={setConfig}
                    editorFocus={editorFocus}
                />
            </aside>
            <main className="flex-1 h-full flex flex-col p-4">
                <div className="flex-shrink-0 mb-4">
                    <div className="flex border-b border-gray-700">
                        <button 
                            onClick={() => setActiveTab('preview')}
                            className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${activeTab === 'preview' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
                        >
                            실시간 프리뷰
                        </button>
                        <button 
                            onClick={() => setActiveTab('code')}
                            className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${activeTab === 'code' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
                        >
                            생성된 HTML
                        </button>
                    </div>
                </div>
                <div className="flex-grow bg-gray-900/50 rounded-lg overflow-hidden relative border border-gray-700">
                    {activeTab === 'preview' ? (
                        <div className="w-full h-full flex items-center justify-center p-4 bg-dots" id="preview-container">
                             <style>{`.bg-dots { background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 1.5rem 1.5rem; }`}</style>
                            <div style={{ 
                                width: `${config.size.width}px`, 
                                height: `${config.size.height}px`,
                            }}>
                                <PreviewWindow 
                                    config={config} 
                                    setEditorFocus={setEditorFocus} 
                                    onLocationUpdate={handleLocationUpdate}
                                />
                            </div>
                        </div>
                    ) : (
                        <CodeOutput code={htmlCode} />
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;