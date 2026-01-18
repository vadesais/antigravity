import { Loader2, Sparkles } from 'lucide-react';

export default function GenerationProgress() {
    return (
        <div className="text-center py-16">
            <div className="relative inline-block mb-6">
                <Loader2 className="w-20 h-20 animate-spin text-blue-600" />
                <Sparkles className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 animate-pulse" />
            </div>

            <h3 className="text-2xl font-bold text-slate-900 mb-3">
                Gerando seu modelo...
            </h3>
            <p className="text-slate-600 mb-6">
                Isso pode levar alguns minutos. Por favor, aguarde.
            </p>

            <div className="max-w-md mx-auto bg-blue-50 rounded-xl p-6">
                <div className="space-y-3 text-left">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                        <p className="text-sm text-slate-700">Processando imagem...</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-100" />
                        <p className="text-sm text-slate-700">Gerando modelo com IA...</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-200" />
                        <p className="text-sm text-slate-700">Aplicando óculos...</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
