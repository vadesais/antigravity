import { Sparkles } from 'lucide-react';
import { ModelCreationConfig } from '@/types/modelCreation';

interface AIConfigProps {
    config: Partial<ModelCreationConfig>;
    onChange: (config: Partial<ModelCreationConfig>) => void;
    onGenerate: () => void;
    disabled?: boolean;
}

export default function AIConfig({ config, onChange, onGenerate, disabled }: AIConfigProps) {
    const handleChange = (field: string, value: string) => {
        onChange({ ...config, [field]: value });
    };

    const isValid = config.modelDescription && config.scenarioDescription;

    return (
        <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Configuração do Modelo IA
            </h2>


            <div className="space-y-6">
                {/* Descrição do Modelo */}
                <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Descrição do Modelo
                    </label>
                    <textarea
                        value={config.modelDescription || ''}
                        onChange={(e) => handleChange('modelDescription', e.target.value)}
                        placeholder="Ex: Mulher jovem, cabelo loiro longo, pele clara, olhos azuis, sorriso suave..."
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                        rows={4}
                    />

                </div>

                {/* Ambiente / Cenário */}
                <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Ambiente / Iluminação
                    </label>
                    <textarea
                        value={config.scenarioDescription || ''}
                        onChange={(e) => handleChange('scenarioDescription', e.target.value)}
                        placeholder="Ex: Estúdio profissional, luz natural suave, fundo neutro branco..."
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                        rows={3}
                    />

                </div>

                {/* Botão Gerar */}
                <button
                    onClick={onGenerate}
                    disabled={disabled || !isValid}
                    className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
                >
                    <Sparkles className="w-6 h-6" />
                    Gerar Modelo
                </button>
            </div>
        </div>
    );
}
