import { Download, Sparkles } from 'lucide-react';
import { ModelGeneration, ModelGenerationLimits } from '@/types/modelCreation';

interface ResultDisplayProps {
    result: ModelGeneration;
    onNewGeneration: () => void;
    limits: ModelGenerationLimits | null;
}

export default function ResultDisplay({ result, onNewGeneration, limits }: ResultDisplayProps) {
    const handleDownload = async () => {
        if (!result.result_image_url) return;

        try {
            const response = await fetch(result.result_image_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `modelo-${result.id}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download error:', error);
            alert('Erro ao baixar imagem');
        }
    };

    return (
        <div>
            <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-semibold">Modelo gerado com sucesso!</span>
                </div>
                {limits && (
                    <p className="text-sm text-slate-500 font-medium">
                        {limits.daily_count}/{limits.daily_limit} gerações hoje
                    </p>
                )}
            </div>

            {/* Imagem Resultado */}
            <div className="mb-6">
                <div className="aspect-[4/5] bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center max-w-sm mx-auto">
                    <img
                        src={result.result_image_url!}
                        alt="Modelo gerado"
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                    onClick={handleDownload}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
                >
                    <Download className="w-5 h-5" />
                    Baixar Imagem
                </button>
                <button
                    onClick={onNewGeneration}
                    className="px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                    Criar Novo Modelo
                </button>
            </div>

            {/* Informações */}
            <div className="mt-8 p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-600 text-center">
                    Gerado em {new Date(result.created_at).toLocaleString('pt-BR')}
                </p>
            </div>
        </div>
    );
}
