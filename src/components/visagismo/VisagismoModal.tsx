import { useState } from 'react';
import { X, Users, Sparkles, CheckCircle2 } from 'lucide-react';
import { FaceAnalysis, VisagismoStep } from '@/types/visagismo';
import VisagismoCamera from './VisagismoCamera';

interface Glass {
    id: string;
    name: string;
    image_url: string;
    cover_image_url: string | null;
    category: string | null;
    ar_config: any;
}

interface VisagismoModalProps {
    isOpen: boolean;
    onClose: () => void;
    glasses: Glass[];
    onSelectGlass: (glass: Glass) => void;
    storeId: string;
}

// Mapeamento de estilos de armação por formato de rosto
const FACE_SHAPE_RECOMMENDATIONS: Record<string, string[]> = {
    'Oval': ['aviador', 'quadrado', 'redondo', 'gatinho', 'retangular', 'geométrico'],
    'Redondo': ['quadrado', 'retangular', 'angular', 'geométrico', 'aviador'],
    'Quadrado': ['redondo', 'oval', 'aviador', 'gatinho'],
    'Coração': ['oval', 'redondo', 'aviador', 'gatinho'],
    'Retangular': ['quadrado', 'grande', 'aviador', 'geométrico'],
    'Diamante': ['gatinho', 'oval', 'sem aro', 'aviador'],
};

export default function VisagismoModal({
    isOpen,
    onClose,
    glasses,
    onSelectGlass,
}: VisagismoModalProps) {
    const [step, setStep] = useState<VisagismoStep>('gender');
    const [gender, setGender] = useState<'Masculino' | 'Feminino' | 'Unissex' | null>(null);
    const [faceAnalysis, setFaceAnalysis] = useState<FaceAnalysis | null>(null);

    if (!isOpen) return null;

    const handleGenderSelect = (selectedGender: 'Masculino' | 'Feminino' | 'Unissex') => {
        setGender(selectedGender);
        setStep('camera');
    };

    const handleCaptureComplete = (analysis: FaceAnalysis) => {
        setFaceAnalysis(analysis);
        setStep('results');
    };

    const handleBack = () => {
        if (step === 'camera') {
            setStep('gender');
        } else if (step === 'results') {
            setStep('camera');
        }
    };

    const handleClose = () => {
        setStep('gender');
        setGender(null);
        setFaceAnalysis(null);
        onClose();
    };

    // Busca inteligente de óculos baseada em gênero e formato de rosto
    const getRecommendedGlasses = (): Glass[] => {
        if (!gender || !faceAnalysis) return [];

        // 1. Filtrar por gênero
        let filtered = glasses.filter(glass => {
            if (!glass.category) return false;
            const category = glass.category.toLowerCase();

            if (gender === 'Unissex') return true;
            if (gender === 'Masculino') return category.includes('masculino') || category.includes('unissex');
            if (gender === 'Feminino') return category.includes('feminino') || category.includes('unissex');

            return false;
        });

        // 2. Obter estilos recomendados para o formato de rosto
        const recommendedStyles = FACE_SHAPE_RECOMMENDATIONS[faceAnalysis.shape] || [];

        // 3. Pontuar óculos baseado na compatibilidade
        const scoredGlasses = filtered.map(glass => {
            let score = 0;
            const glassName = glass.name.toLowerCase();
            const glassCategory = (glass.category || '').toLowerCase();

            // Verificar se o nome ou categoria contém algum estilo recomendado
            recommendedStyles.forEach(style => {
                if (glassName.includes(style) || glassCategory.includes(style)) {
                    score += 10;
                }
            });

            // Bonus para óculos com AR config (mais completos)
            if (glass.ar_config) {
                score += 5;
            }

            return { glass, score };
        });

        // 4. Ordenar por score e pegar os top 6
        const topGlasses = scoredGlasses
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map(item => item.glass);

        // 5. Se não houver óculos com score alto, retornar os primeiros 6 filtrados por gênero
        if (topGlasses.length === 0) {
            return filtered.slice(0, 6);
        }

        return topGlasses;
    };

    const recommendedGlasses = getRecommendedGlasses();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-blue-600" />
                            Visagismo Inteligente
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Descubra o óculos ideal para você
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition"
                    >
                        <X className="w-6 h-6 text-slate-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Gender Selection */}
                    {step === 'gender' && (
                        <div className="max-w-2xl mx-auto text-center">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">
                                Para quem são os óculos?
                            </h3>
                            <p className="text-slate-600 mb-8">
                                Selecione para personalizar as recomendações
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {(['Masculino', 'Feminino', 'Unissex'] as const).map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => handleGenderSelect(option)}
                                        className="p-6 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition group"
                                    >
                                        <Users className="w-12 h-12 mx-auto mb-3 text-slate-400 group-hover:text-blue-600 transition" />
                                        <span className="text-lg font-semibold text-slate-700 group-hover:text-blue-600 transition">
                                            {option}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Camera */}
                    {step === 'camera' && (
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4 text-center">
                                Análise Facial
                            </h3>
                            <VisagismoCamera
                                onCapture={handleCaptureComplete}
                                onBack={handleBack}
                            />
                        </div>
                    )}

                    {/* Step 3: Results */}
                    {step === 'results' && faceAnalysis && (
                        <div className="max-w-4xl mx-auto">
                            {/* Face Analysis Result */}
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8 border border-blue-100">
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                        <CheckCircle2 className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="text-xl font-bold text-slate-900">
                                                Formato: {faceAnalysis.shape}
                                            </h4>
                                            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                                                Detectado
                                            </span>
                                        </div>
                                        <p className="text-slate-700 mb-3">{faceAnalysis.description}</p>
                                        <div className="bg-white/50 rounded-lg p-3 border border-blue-200">
                                            <p className="text-sm text-slate-700">
                                                <strong className="text-blue-700">💡 Recomendação:</strong> {faceAnalysis.recommendedStyle}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recommended Glasses */}
                            <div>
                                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-blue-600" />
                                    Óculos Perfeitos para Você ({recommendedGlasses.length})
                                </h4>

                                {recommendedGlasses.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg">
                                        <p className="mb-2">Nenhum óculos encontrado para {gender}.</p>
                                        <p className="text-sm">Tente selecionar "Unissex" para ver mais opções.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {recommendedGlasses.map((glass) => (
                                            <div
                                                key={glass.id}
                                                className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden hover:border-blue-500 hover:shadow-lg transition cursor-pointer group"
                                                onClick={() => {
                                                    onSelectGlass(glass);
                                                    handleClose();
                                                }}
                                            >
                                                <div className="aspect-square bg-slate-50 flex items-center justify-center p-4 relative">
                                                    <img
                                                        src={glass.cover_image_url || glass.image_url}
                                                        alt={glass.name}
                                                        className="max-w-full max-h-full object-contain"
                                                    />
                                                    <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition">
                                                        Ideal
                                                    </div>
                                                </div>
                                                <div className="p-3">
                                                    <p className="text-sm font-medium text-slate-900 truncate mb-2">
                                                        {glass.name}
                                                    </p>
                                                    <button className="w-full px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition">
                                                        Experimentar Agora
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Back button */}
                            <div className="mt-6 text-center">
                                <button
                                    onClick={handleBack}
                                    className="px-6 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition"
                                >
                                    Analisar Novamente
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
