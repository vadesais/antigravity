import { useState } from 'react';
import { Sparkles, Upload, X } from 'lucide-react';
import { ModelCreationConfig } from '@/types/modelCreation';
import { supabase } from '@/integrations/supabase/client';

interface PhotoConfigProps {
    config: Partial<ModelCreationConfig>;
    onChange: (config: Partial<ModelCreationConfig>) => void;
    onGenerate: () => void;
    disabled?: boolean;
}

export default function PhotoConfig({ config, onChange, onGenerate, disabled }: PhotoConfigProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione uma imagem válida');
            return;
        }

        setUploading(true);

        try {
            // Upload para Supabase Storage
            const fileName = `user-photos/${Date.now()}_${file.name}`;
            const { data, error } = await supabase.storage
                .from('model-generations')
                .upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('model-generations')
                .getPublicUrl(fileName);

            onChange({ ...config, userPhotoUrl: publicUrl });

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);

        } catch (error) {
            console.error('Upload error:', error);
            alert('Erro ao fazer upload da foto');
        } finally {
            setUploading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    };

    const handleClear = () => {
        setPreview(null);
        onChange({ ...config, userPhotoUrl: undefined });
    };

    const isValid = config.userPhotoUrl;

    return (
        <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Configuração da Foto
            </h2>
            <p className="text-sm text-slate-600 mb-6">
                Envie sua selfie para visualizar os óculos
            </p>

            <div className="space-y-6">
                {/* Upload de Foto */}
                <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-3">
                        Sua Selfie
                    </label>

                    {!preview ? (
                        <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-slate-400 transition cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleChange}
                                disabled={uploading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Upload className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                            <p className="text-sm font-medium text-slate-700 mb-1">
                                {uploading ? 'Enviando...' : 'Clique para selecionar sua foto'}
                            </p>
                            <p className="text-xs text-slate-500">
                                Formatos aceitos: JPG, PNG, WebP
                            </p>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center max-w-md mx-auto">
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                            <button
                                onClick={handleClear}
                                className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-100 transition"
                            >
                                <X className="w-5 h-5 text-slate-700" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Opções */}
                <div>
                    <label className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.keepBackground ?? true}
                            onChange={(e) => onChange({ ...config, keepBackground: e.target.checked })}
                            className="w-5 h-5 text-blue-600 rounded"
                        />
                        <div>
                            <p className="text-sm font-semibold text-slate-900">
                                Manter fundo original
                            </p>
                            <p className="text-xs text-slate-500">
                                Preserva o fundo da sua foto original
                            </p>
                        </div>
                    </label>
                </div>

                {/* Cenário (se não manter fundo) */}
                {!config.keepBackground && (
                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">
                            Novo Cenário
                        </label>
                        <textarea
                            value={config.scenarioDescription || ''}
                            onChange={(e) => onChange({ ...config, scenarioDescription: e.target.value })}
                            placeholder="Ex: Estúdio profissional com fundo branco e iluminação suave..."
                            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                            rows={3}
                        />
                    </div>
                )}

                {/* Botão Gerar */}
                <button
                    onClick={onGenerate}
                    disabled={disabled || !isValid}
                    className="w-full px-8 py-4 bg-slate-900 text-white text-base font-bold rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Sparkles className="w-5 h-5" />
                    Gerar Modelo
                </button>
            </div>
        </div>
    );
}
