import React from 'react';
import { Glasses, ScanFace } from 'lucide-react';

const VirtualTryOnLoader: React.FC = () => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 dark:bg-[#0f1117]/95 backdrop-blur-sm transition-all duration-500">
            {/* Main Container */}
            <div className="relative flex flex-col items-center">

                {/* Orbiting Scanner Effect */}
                <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
                    {/* Ring 1 - Spinner */}
                    <div className="absolute inset-0 rounded-full border-t-2 border-indigo-600 dark:border-indigo-400 animate-spin"></div>

                    {/* Ring 2 - Pulse */}
                    <div className="absolute inset-2 rounded-full border-2 border-indigo-100 dark:border-indigo-900/40 animate-ping opacity-20"></div>

                    {/* Icon Container with Glow */}
                    <div className="relative z-10 bg-white dark:bg-[#1e1e1e] p-4 rounded-full shadow-xl border border-slate-100 dark:border-slate-800">
                        <Glasses className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-pulse" strokeWidth={1.5} />
                    </div>

                    {/* Scanning Line (Horizontal) */}
                    <div className="absolute inset-x-0 h-0.5 bg-indigo-500/50 blur-[2px] animate-[scan_2s_ease-in-out_infinite] top-0"></div>
                </div>

                {/* Text Content */}
                <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                        Carregando provador virtual...
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Aguarde alguns segundos
                    </p>
                </div>
            </div>

            {/* Inline Styles for Custom Keyframes not in Tailwind by default */}
            <style>{`
                @keyframes scan {
                    0%, 100% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    50% { top: 100%; }
                }
            `}</style>
        </div>
    );
};

export default VirtualTryOnLoader;
