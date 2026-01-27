import { useState } from 'react';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';
import { FaceAnalysis, GlassType } from '@/types/visagismo';
import VisagismoCamera from './VisagismoCamera';
import VisagismoFilters from './VisagismoFilters';

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
    const [gender, setGender] = useState<'Masculino' | 'Feminino' | 'Unissex'>('Unissex');
    const [glassType, setGlassType] = useState<GlassType>('grau');
    const [faceAnalysis, setFaceAnalysis] = useState<FaceAnalysis | null>(null);
    const [showResults, setShowResults] = useState(false);

    if (!isOpen) return null;

    const handleCaptureComplete = (analysis: FaceAnalysis) => {
        setFaceAnalysis(analysis);
        setShowResults(true);
    };

    const handleBack = () => {
        setShowResults(false);
        setFaceAnalysis(null);
    };

    const handleClose = () => {
        setShowResults(false);
        setFaceAnalysis(null);
        onClose();
    };

    const getRecommendedGlasses = (): Glass[] => {
        if (!faceAnalysis) return [];

        let filtered = glasses.filter(glass => {
            if (!glass.category) return false;
            const category = glass.category.toLowerCase();

            let matchesGender = false;
            if (gender === 'Unissex') {
                matchesGender = category.includes('unissex');
            } else if (gender === 'Masculino') {
                matchesGender = category.includes('masculino') || category.includes('unissex');
            } else if (gender === 'Feminino') {
                matchesGender = category.includes('feminino') || category.includes('unissex');
            }

            const matchesType = glassType === 'grau'
                ? category.includes('grau')
                : category.includes('sol');

            return matchesGender && matchesType;
        });

        const recommendedStyles = FACE_SHAPE_RECOMMENDATIONS[faceAnalysis.shape] || [];

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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal - Fullscreen on mobile, max-width on desktop */}
            <div className={`relative bg-white flex flex-col overflow-hidden ${showResults
                    ? 'w-full h-full md:rounded-3xl md:max-w-6xl md:max-h-[90vh] md:shadow-2xl'
                    : 'w-full h-full md:rounded-3xl md:max-w-2xl md:max-h-[95vh] md:shadow-2xl'
                }`}>

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        <h2 className="text-lg font-bold text-slate-900">
                            Visagismo Inteligente
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition"
                    >
                        <X className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                {/* Content */}
                {!showResults ? (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6">
                        {/* Filters */}
                        <div className="mb-6">
                            <VisagismoFilters
                                gender={gender}
                                glassType={glassType}
                                onGenderChange={setGender}
                                onGlassTypeChange={setGlassType}
                            />
                        </div>

                        {/* Camera */}
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-4 text-center">
                                Posicione seu rosto
                            </h3>
                            <VisagismoCamera
                                onCapture={handleCaptureComplete}
                                onBack={handleClose}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 md:p-6">
                        {/* Face Analysis */}
                        {faceAnalysis && (
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-5 mb-6 border border-indigo-100">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-10 h-10 text-indigo-600 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-slate-900 mb-1">
                                            Formato: {faceAnalysis.shape}
                                        </h3>
                                        <p className="text-sm text-slate-600 mb-2">
                                            {faceAnalysis.description}
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            <strong className="text-indigo-700">Recomendação:</strong> {faceAnalysis.recommendedStyle}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Recommended Glasses */}
                        <div>
                            <h4 className="text-lg font-bold text-slate-900 mb-4">
                                Óculos Perfeitos para Você ({recommendedGlasses.length})
                            </h4>

                            {recommendedGlasses.length === 0 ? (
                                <div className="text-center py-16 text-slate-500 bg-slate-50 rounded-2xl">
                                    <p className="text-sm">Nenhum óculos encontrado com os filtros selecionados.</p>
                                    <button
                                        onClick={handleBack}
                                        className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                    >
                                        Tentar novamente
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {recommendedGlasses.map((glass) => (
                                        <div
                                            key={glass.id}
                                            className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer group"
                                            onClick={() => {
                                                onSelectGlass(glass);
                                                handleClose();
                                            }}
                                        >
                                            <div className="aspect-square bg-slate-50 flex items-center justify-center p-4">
                                                <img
                                                    src={glass.cover_image_url || glass.image_url}
                                                    alt={glass.name}
                                                    className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform"
                                                />
                                            </div>
                                            <div className="p-3">
                                                <p className="text-sm font-semibold text-slate-900 truncate mb-2">
                                                    {glass.name}
                                                </p>
                                                <button className="w-full px-3 py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition">
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
                                className="text-sm text-slate-500 hover:text-slate-700 transition font-medium"
                            >
                                ← Analisar Novamente
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
