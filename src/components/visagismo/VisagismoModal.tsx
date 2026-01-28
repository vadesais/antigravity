import { useState } from 'react';
import { X, Sparkles, CheckCircle2, User, UserCircle2, Glasses, Sun } from 'lucide-react';
import { FaceAnalysis, GlassType } from '@/types/visagismo';
import VisagismoCamera from './VisagismoCamera';
import VisagismoFilters from './VisagismoFilters';

interface Glass {
    id: string;
    name: string;
    image_url: string;
    cover_image_url: string | null;
    category: string | null;
    price: string | null;
    buy_link: string | null;
    active?: boolean | null;
    ar_config: any;
    glass_tags?: {
        tags: {
            name: string;
        } | null;
    }[];
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

const FACE_SHAPE_TAG_PREFERENCES: Record<string, string[]> = {
    'Oval': ['Clássico', 'Moderno', 'Redondo', 'Quadrado'], // Balanced
    'Redondo': ['Quadrado', 'Retangular', 'Geométrico', 'Angular'], // Create structure
    'Quadrado': ['Redondo', 'Oval', 'Aviador', 'Gatinho'], // Soften angles
    'Coração': ['Aviador', 'Gatinho', 'Oval', 'Metal'], // Balance forehead
    'Retangular': ['Grande', 'Aviador', 'Redondo', 'Oversized'], // Shorten face
    'Diamante': ['Gatinho', 'Oval', 'Sem Aro', 'Leve'], // Soften cheekbones
};

export default function VisagismoModal({
    isOpen,
    onClose,
    glasses,
    onSelectGlass,
}: VisagismoModalProps) {
    const [step, setStep] = useState<'gender' | 'type' | 'camera' | 'results'>('gender');
    const [gender, setGender] = useState<'Masculino' | 'Feminino' | 'Unissex'>('Unissex');
    const [glassType, setGlassType] = useState<GlassType>('grau');
    const [faceAnalysis, setFaceAnalysis] = useState<FaceAnalysis | null>(null);

    // Reset state when opening
    if (!isOpen) {
        if (step !== 'gender') setStep('gender');
        return null;
    }

    const handleCaptureComplete = (analysis: FaceAnalysis) => {
        setFaceAnalysis(analysis);
        setStep('results');
    };

    const handleBack = () => {
        if (step === 'results') setStep('camera');
        else if (step === 'camera') setStep('type');
        else if (step === 'type') setStep('gender');
        else onClose();
    };

    const handleClose = () => {
        setStep('gender');
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

            // Tag Bonus
            const glassTags = glass.glass_tags?.map(gt => gt.tags?.name).filter(Boolean) as string[] || [];
            const preferredTags = FACE_SHAPE_TAG_PREFERENCES[faceAnalysis.shape] || [];

            glassTags.forEach(tag => {
                // Exact match
                if (preferredTags.includes(tag)) {
                    score += 15; // High boost for explicit tag match
                }
                // Partial match or fuzzy logic can be added here
            });

            // Generic fallback: Boost if it has ANY matching style keyword in tags too
            glassTags.forEach(tag => {
                const lowerTag = tag.toLowerCase();
                recommendedStyles.forEach(style => {
                    if (lowerTag.includes(style)) {
                        score += 5;
                    }
                });
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

            {/* Modal */}
            <div className={`relative bg-white flex flex-col overflow-hidden transition-all duration-300 ${step === 'results'
                ? 'w-full h-full md:rounded-3xl md:max-w-6xl md:max-h-[90vh] md:shadow-2xl'
                : 'w-full h-full md:rounded-3xl md:max-w-md md:max-h-[600px] md:shadow-2xl'
                }`}>

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-2">
                        {step !== 'gender' && step !== 'results' && (
                            <button onClick={handleBack} className="mr-2 p-1 rounded-full hover:bg-slate-100">
                                <span className="text-lg">←</span>
                            </button>
                        )}
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
                <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col">

                    {/* STEP 1: GENDER */}
                    {step === 'gender' && (
                        <div className="flex flex-col gap-4 h-full">
                            <h3 className="text-xl font-bold text-slate-900 text-center mb-4">
                                Selecione seu gênero
                            </h3>
                            <div className="grid grid-cols-1 gap-3 flex-1">
                                <button onClick={() => { setGender('Feminino'); setStep('type'); }} className="p-6 rounded-2xl border border-slate-200 hover:border-pink-500 hover:shadow-md hover:bg-pink-50/50 transition-all flex flex-col items-center justify-center gap-2 group">
                                    <div className="w-14 h-14 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                        <UserCircle2 className="w-8 h-8" />
                                    </div>
                                    <span className="font-bold text-slate-700 group-hover:text-pink-600">Feminino</span>
                                </button>
                                <button onClick={() => { setGender('Masculino'); setStep('type'); }} className="p-6 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-md hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center gap-2 group">
                                    <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                        <User className="w-8 h-8" />
                                    </div>
                                    <span className="font-bold text-slate-700 group-hover:text-blue-600">Masculino</span>
                                </button>
                                <button onClick={() => { setGender('Unissex'); setStep('type'); }} className="p-6 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-md hover:bg-indigo-50/50 transition-all flex flex-col items-center justify-center gap-2 group">
                                    <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                        <UserCircle2 className="w-8 h-8" />
                                    </div>
                                    <span className="font-bold text-slate-700 group-hover:text-indigo-600">Unissex</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: TYPE */}
                    {step === 'type' && (
                        <div className="flex flex-col gap-4 h-full">
                            <h3 className="text-xl font-bold text-slate-900 text-center mb-4">
                                O que você procura?
                            </h3>
                            <div className="grid grid-cols-1 gap-4 flex-1">
                                <button onClick={() => { setGlassType('grau'); setStep('camera'); }} className="p-8 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:shadow-md hover:bg-indigo-50/50 transition-all flex flex-col items-center justify-center gap-3 group">
                                    <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                        <Glasses className="w-9 h-9" />
                                    </div>
                                    <span className="text-lg font-bold text-slate-700 group-hover:text-indigo-600">Óculos de Grau</span>
                                </button>
                                <button onClick={() => { setGlassType('sol'); setStep('camera'); }} className="p-8 rounded-2xl border border-slate-200 hover:border-amber-500 hover:shadow-md hover:bg-amber-50/50 transition-all flex flex-col items-center justify-center gap-3 group">
                                    <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                        <Sun className="w-9 h-9" />
                                    </div>
                                    <span className="text-lg font-bold text-slate-700 group-hover:text-amber-600">Óculos de Sol</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: CAMERA */}
                    {step === 'camera' && (
                        <div className="flex flex-col h-full">
                            <h3 className="text-xl font-bold text-slate-900 mb-6 text-center">
                                Posicione seu rosto
                            </h3>
                            <div className="flex-1 min-h-0 relative rounded-2xl overflow-hidden bg-black">
                                <VisagismoCamera
                                    onCapture={handleCaptureComplete}
                                    onBack={() => setStep('type')}
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 4: RESULTS */}
                    {step === 'results' && faceAnalysis && (
                        <div className="flex flex-col gap-6">
                            {/* Analysis Card */}
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-100 shadow-sm animate-fade-in">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-indigo-600 shrink-0">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-medium text-slate-500 mb-1 uppercase tracking-wider">
                                            Análise Concluída
                                        </h3>
                                        <p className="text-lg text-slate-800 font-medium leading-relaxed mb-3">
                                            {faceAnalysis.description}
                                        </p>
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100/50 text-indigo-700 rounded-lg text-sm font-semibold">
                                            <Sparkles className="w-4 h-4" />
                                            Recomendação: {faceAnalysis.recommendedStyle}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recommended Glasses */}
                            <div>
                                <h4 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    Óculos Perfeitos para Você
                                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{recommendedGlasses.length}</span>
                                </h4>

                                {recommendedGlasses.length === 0 ? (
                                    <div className="text-center py-16 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <p className="text-sm">Nenhum óculos encontrado com os filtros selecionados.</p>
                                        <button
                                            onClick={() => setStep('gender')}
                                            className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium underline"
                                        >
                                            Refazer Análise
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {recommendedGlasses.map((glass) => (
                                            <div
                                                key={glass.id}
                                                className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer group"
                                                onClick={() => {
                                                    onSelectGlass(glass);
                                                    handleClose();
                                                }}
                                            >
                                                <div className="aspect-square bg-slate-50 flex items-center justify-center p-6 relative">
                                                    <img
                                                        src={glass.cover_image_url || glass.image_url}
                                                        alt={glass.name}
                                                        className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300 mix-blend-multiply"
                                                    />
                                                    {glass.ar_config && (
                                                        <div className="absolute top-2 right-2 bg-black/5 text-black/40 p-1 rounded-full">
                                                            <Sparkles className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-4">
                                                    <p className="text-sm font-bold text-slate-900 truncate mb-3">
                                                        {glass.name}
                                                    </p>
                                                    <button className="w-full px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                                                        PROVAR AGORA
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Back button */}
                            <div className="mt-8 text-center pb-8">
                                <button
                                    onClick={() => setStep('gender')}
                                    className="text-sm text-slate-400 hover:text-slate-600 transition flex items-center gap-2 mx-auto"
                                >
                                    <span>↺</span> Refazer Análise Completa
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
