import { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { ModelCreationStep, ModelCreationConfig, ModelGeneration, ModelGenerationLimits } from '@/types/modelCreation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import GlassesUpload from '../components/modelCreation/GlassesUpload';
import ModeSelector from '../components/modelCreation/ModeSelector';
import AIConfig from '../components/modelCreation/AIConfig';
import PhotoConfig from '../components/modelCreation/PhotoConfig';
import GenerationProgress from '../components/modelCreation/GenerationProgress';
import ResultDisplay from '../components/modelCreation/ResultDisplay';
import UsageLimits from '../components/modelCreation/UsageLimits';

export default function ModelCreationPage() {
    const { profileId } = useAuth();
    const [step, setStep] = useState<ModelCreationStep>('upload');
    const [glassesImage, setGlassesImage] = useState<File | null>(null);
    const [glassesImageUrl, setGlassesImageUrl] = useState<string | null>(null);
    const [mode, setMode] = useState<'ai' | 'photo' | null>(null);
    const [config, setConfig] = useState<Partial<ModelCreationConfig>>({});
    const [generationId, setGenerationId] = useState<string | null>(null);
    const [result, setResult] = useState<ModelGeneration | null>(null);
    const [limits, setLimits] = useState<ModelGenerationLimits | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Carregar limites
    useEffect(() => {
        loadLimits();
    }, [profileId]);

    // Polling para checar status
    useEffect(() => {
        if (generationId && step === 'generate') {
            const interval = setInterval(checkStatus, 3000);
            return () => clearInterval(interval);
        }
    }, [generationId, step]);

    const loadLimits = async () => {
        // Mock temporário até regenerar tipos do Supabase
        setLimits({
            id: '1',
            profile_id: profileId || '',
            daily_limit: 10,
            monthly_limit: 100,
            daily_count: 0,
            monthly_count: 0,
            last_daily_reset: new Date().toISOString().split('T')[0],
            last_monthly_reset: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
    };

    const handleGlassesUpload = async (file: File) => {
        setGlassesImage(file);

        // Upload para Supabase Storage
        const fileName = `glasses/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
            .from('model-generations')
            .upload(fileName, file);

        if (error) {
            setError('Erro ao fazer upload da imagem');
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('model-generations')
            .getPublicUrl(fileName);

        setGlassesImageUrl(publicUrl);
        setStep('mode');
    };

    const handleModeSelect = (selectedMode: 'ai' | 'photo') => {
        setMode(selectedMode);
        setStep('config');
    };

    const handleConfigComplete = (configuration: Partial<ModelCreationConfig>) => {
        setConfig(configuration);
    };

    const handleGenerate = async () => {
        if (!glassesImageUrl || !mode) return;

        setLoading(true);
        setError(null);
        setStep('generate');

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-model`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        glassesImageUrl,
                        mode,
                        config: {
                            ...config,
                            profileId
                        }
                    })
                }
            );

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Erro ao gerar modelo');
            }

            setGenerationId(data.generationId);
            await loadLimits(); // Atualizar contador

        } catch (err: any) {
            setError(err.message);
            setStep('config');
        } finally {
            setLoading(false);
        }
    };

    const checkStatus = async () => {
        if (!generationId) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-generation-status`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session?.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ generationId })
                }
            );

            const data = await response.json();

            if (data.success && data.generation) {
                if (data.generation.status === 'completed') {
                    setResult(data.generation);
                    setStep('result');
                } else if (data.generation.status === 'failed') {
                    setError(data.generation.error_message || 'Erro ao gerar modelo');
                    setStep('config');
                }
            }
        } catch (err: any) {
            console.error('Error checking status:', err);
        }
    };

    const handleNewGeneration = () => {
        setStep('upload');
        setGlassesImage(null);
        setGlassesImageUrl(null);
        setMode(null);
        setConfig({});
        setGenerationId(null);
        setResult(null);
        setError(null);
    };

    const handleBack = () => {
        if (step === 'mode') setStep('upload');
        else if (step === 'config') setStep('mode');
        else if (step === 'result') setStep('upload');
    };

    const canGenerate = limits && limits.daily_count < limits.daily_limit;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="w-8 h-8 text-blue-600" />
                        <h1 className="text-3xl font-bold text-slate-900">
                            Criação de Modelos
                        </h1>
                    </div>
                    <p className="text-slate-600">
                        Gere modelos hiper-realistas usando inteligência artificial
                    </p>
                </div>

                {/* Usage Limits */}
                {limits && (
                    <div className="mb-6">
                        <UsageLimits limits={limits} />
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Main Content */}
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    {/* Back Button */}
                    {step !== 'upload' && step !== 'generate' && (
                        <button
                            onClick={handleBack}
                            className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm font-medium">Voltar</span>
                        </button>
                    )}

                    {/* Steps */}
                    {step === 'upload' && (
                        <GlassesUpload
                            onUpload={handleGlassesUpload}
                            disabled={!canGenerate}
                        />
                    )}

                    {step === 'mode' && (
                        <ModeSelector
                            onSelect={handleModeSelect}
                        />
                    )}

                    {step === 'config' && mode === 'ai' && (
                        <AIConfig
                            config={config}
                            onChange={setConfig}
                            onGenerate={handleGenerate}
                            disabled={loading || !canGenerate}
                        />
                    )}

                    {step === 'config' && mode === 'photo' && (
                        <PhotoConfig
                            config={config}
                            onChange={setConfig}
                            onGenerate={handleGenerate}
                            disabled={loading || !canGenerate}
                        />
                    )}

                    {step === 'generate' && (
                        <GenerationProgress />
                    )}

                    {step === 'result' && result && (
                        <ResultDisplay
                            result={result}
                            onNewGeneration={handleNewGeneration}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
