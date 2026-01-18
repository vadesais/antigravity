import { Sparkles, Camera } from 'lucide-react';

interface ModeSelectorProps {
    onSelect: (mode: 'ai' | 'photo') => void;
}

export default function ModeSelector({ onSelect }: ModeSelectorProps) {
    return (
        <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Escolha o Modo
            </h2>
            <p className="text-sm text-slate-600 mb-6">
                Como você deseja criar o modelo?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Modo IA */}
                <button
                    onClick={() => onSelect('ai')}
                    className="group p-8 border-2 border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                    <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition">
                        <Sparkles className="w-7 h-7 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Criar com IA
                    </h3>
                    <p className="text-sm text-slate-600">
                        Gere um modelo artificial hiper-realista com inteligência artificial
                    </p>
                    <ul className="mt-4 space-y-2 text-xs text-slate-500">
                        <li>• Descreva o modelo desejado</li>
                        <li>• Escolha o ambiente</li>
                        <li>• Geração automática</li>
                    </ul>
                </button>

                {/* Modo Foto */}
                <button
                    onClick={() => onSelect('photo')}
                    className="group p-8 border-2 border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                >
                    <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition">
                        <Camera className="w-7 h-7 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        Usar Foto Própria
                    </h3>
                    <p className="text-sm text-slate-600">
                        Use sua própria selfie para visualizar os óculos
                    </p>
                    <ul className="mt-4 space-y-2 text-xs text-slate-500">
                        <li>• Envie sua foto</li>
                        <li>• Preserve sua identidade</li>
                        <li>• Resultado personalizado</li>
                    </ul>
                </button>
            </div>
        </div>
    );
}
