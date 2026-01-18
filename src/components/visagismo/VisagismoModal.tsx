import { useState } from 'react';
import { X, Sparkles, CheckCircle2, Glasses, Sun, ChevronRight } from 'lucide-react';
import { FaceAnalysis, VisagismoStep, GlassType } from '@/types/visagismo';
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
    const [glassType, setGlassType] = useState<GlassType | null>(null);
    const [faceAnalysis, setFaceAnalysis] = useState<FaceAnalysis | null>(null);

    if (!isOpen) return null;

    const handleGenderSelect = (selectedGender: 'Masculino' | 'Feminino' | 'Unissex') => {
        setGender(selectedGender);
        setStep('glassType');
    };

    const handleGlassTypeSelect = (type: GlassType) => {
        setGlassType(type);
        setStep('camera');
    };

    const handleCaptureComplete = (analysis: FaceAnalysis) => {
        setFaceAnalysis(analysis);
        setStep('results');
    };

    const handleBack = () => {
        if (step === 'results') {
            setStep('camera');
        } else if (step === 'camera') {
            setStep('glassType');
        } else if (step === 'glassType') {
            setStep('gender');
        }
    };

    const handleClose = () => {
        setStep('gender');
        setGender(null);
        setGlassType(null);
        setFaceAnalysis(null);
        onClose();
    };

    // Busca inteligente de óculos
    const getRecommendedGlasses = (): Glass[] => {
        if (!gender || !glassType || !faceAnalysis) return [];

        // 1. Filtrar por gênero e tipo
        let filtered = glasses.filter(glass => {
            if (!glass.category) return false;
            const category = glass.category.toLowerCase();

            // Filtro de gênero
            let matchesGender = false;
            if (gender === 'Unissex') {
                matchesGender = true;
            } else if (gender === 'Masculino') {
                matchesGender = category.includes('masculino') || category.includes('unissex');
            } else if (gender === 'Feminino') {
                matchesGender = category.includes('feminino') || category.includes('unissex');
            }

            // Filtro de tipo
            const matchesType = glassType === 'grau'
                ? category.includes('grau')
                : category.includes('sol');

            return matchesGender && matchesType;
        });

        // 2. Obter estilos recomendados para o formato de rosto
        const recommendedStyles = FACE_SHAPE_RECOMMENDATIONS[faceAnalysis.shape] || [];

        // 3. Pontuar óculos baseado na compatibilidade
        const scoredGlasses = filtered.map(glass => {
            let score = 0;
            const glassName = glass.name.toLowerCase();
            const glassCategory = (glass.category || '').toLowerCase();

            recommendedStyles.forEach(style => {
                if (glassName.includes(style) || glassCategory.includes(style)) {
                    score += 10;
                }
            });

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
            <div className={`relative bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden ${step === 'camera' || step === 'results' ? 'w-full max-w-4xl max-h-[90vh]' : 'w-full max-w-md'
                }`}>

                {/* Step 1: Gender Selection */}
                {step === 'gender' && (
                    <div className="p-8">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-5 h-5 text-slate-700" />
                                    <h2 className="text-xl font-bold text-slate-900">
                                        Visagismo Inteligente
                                    </h2>
                                </div>
                                <p className="text-sm text-slate-500">
                                    Descubra o óculos ideal para você
                                </p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition"
                            >
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>

                        {/* Content */}
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">
                                Qual sua preferência?
                            </h3>
                            <p className="text-sm text-slate-500 mb-6">
                                Selecione para quem são os óculos.
                            </p>

                            <div className="space-y-3">
                                {(['Masculino', 'Feminino'] as const).map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => handleGenderSelect(option)}
                                        className="w-full p-4 border-2 border-slate-200 rounded-2xl flex items-center justify-between hover:border-slate-900 hover:bg-slate-50 transition-all group"
                                    >
                                        <span className="text-base font-bold text-slate-900">
                                            Óculos {option}
                                        </span>
                                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Glass Type Selection */}
                {step === 'glassType' && (
                    <div className="p-8">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-5 h-5 text-slate-700" />
                                    <h2 className="text-xl font-bold text-slate-900">
                                        Visagismo Inteligente
                                    </h2>
                                </div>
                                <p className="text-sm text-slate-500">
                                    Descubra o óculos ideal para você
                                </p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition"
                            >
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>

                        {/* Content */}
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">
                                O que você procura?
                            </h3>
                            <p className="text-sm text-slate-500 mb-6">
                                Filtraremos as melhores opções.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleGlassTypeSelect('grau')}
                                    className="w-full p-4 border-2 border-slate-200 rounded-2xl flex items-center justify-between hover:border-slate-900 hover:bg-slate-50 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Glasses className="w-6 h-6 text-slate-700" />
                                        <span className="text-base font-bold text-slate-900">
                                            Óculos de Grau
                                        </span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition" />
                                </button>

                                <button
                                    onClick={() => handleGlassTypeSelect('sol')}
                                    className="w-full p-4 border-2 border-slate-200 rounded-2xl flex items-center justify-between hover:border-slate-900 hover:bg-slate-50 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Sun className="w-6 h-6 text-slate-700" />
                                        <span className="text-base font-bold text-slate-900">
                                            Óculos de Sol
                                        </span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition" />
                                </button>
                            </div>

                            <button
                                onClick={handleBack}
                                className="w-full mt-6 text-sm text-slate-500 hover:text-slate-700 transition"
                            >
                                Voltar
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Camera */}
                {step === 'camera' && (
                    <div className="p-8">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-5 h-5 text-slate-700" />
                                    <h2 className="text-xl font-bold text-slate-900">
                                        Visagismo Inteligente
                                    </h2>
                                </div>
                                <p className="text-sm text-slate-500">
                                    Descubra o óculos ideal para você
                                </p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition"
                            >
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl font-bold text-slate-900 mb-6 text-center">
                            Posicione seu rosto
                        </h3>

                        {/* Camera Component */}
                        <VisagismoCamera
                            onCapture={handleCaptureComplete}
                            onBack={handleClose}
                        />

                        <button
                            onClick={handleBack}
                            className="w-full mt-6 text-sm text-slate-500 hover:text-slate-700 transition"
                        >
                            Voltar
                        </button>
                    </div>
                )}

                {/* Step 4: Results */}
                {step === 'results' && faceAnalysis && (
                    <div className="p-8 overflow-y-auto max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-5 h-5 text-slate-700" />
                                    <h2 className="text-xl font-bold text-slate-900">
                                        Visagismo Inteligente
                                    </h2>
                                </div>
                                <p className="text-sm text-slate-500">
                                    Descubra o óculos ideal para você
                                </p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition"
                            >
                                <X className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>

                        {/* Face Analysis */}
                        <div className="bg-blue-50 rounded-2xl p-5 mb-6">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="w-10 h-10 text-blue-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                                        Formato: {faceAnalysis.shape}
                                    </h3>
                                    <p className="text-xs text-slate-600 mb-2">
                                        {faceAnalysis.description}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                        <strong className="text-blue-700">Recomendação:</strong> {faceAnalysis.recommendedStyle}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Recommended Glasses */}
                        <div>
                            <h4 className="text-base font-bold text-slate-900 mb-4">
                                Óculos Perfeitos para Você ({recommendedGlasses.length})
                            </h4>

                            {recommendedGlasses.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl">
                                    <p className="text-sm">Nenhum óculos encontrado com os filtros selecionados.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {recommendedGlasses.map((glass) => (
                                        <div
                                            key={glass.id}
                                            className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden hover:border-slate-900 hover:shadow-lg transition-all cursor-pointer group"
                                            onClick={() => {
                                                onSelectGlass(glass);
                                                handleClose();
                                            }}
                                        >
                                            <div className="aspect-square bg-slate-50 flex items-center justify-center p-4">
                                                <img
                                                    src={glass.cover_image_url || glass.image_url}
                                                    alt={glass.name}
                                                    className="max-w-full max-h-full object-contain"
                                                />
                                            </div>
                                            <div className="p-3">
                                                <p className="text-xs font-semibold text-slate-900 truncate mb-2">
                                                    {glass.name}
                                                </p>
                                                <button className="w-full px-3 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition">
                                                    Experimentar
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
                                className="text-sm text-slate-500 hover:text-slate-700 transition"
                            >
                                Analisar Novamente
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
