import { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';

interface GlassesUploadProps {
    onUpload: (file: File) => void;
    disabled?: boolean;
}

export default function GlassesUpload({ onUpload, disabled }: GlassesUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione uma imagem válida');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        onUpload(file);
    };

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleClear = () => {
        setPreview(null);
    };

    return (
        <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Upload dos Óculos
            </h2>
            <p className="text-sm text-slate-600 mb-6">
                Envie uma imagem dos óculos que deseja visualizar
            </p>

            {!preview ? (
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all ${dragActive
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-300 hover:border-slate-400'
                        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleChange}
                        disabled={disabled}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        Arraste uma imagem ou clique para selecionar
                    </h3>
                    <p className="text-sm text-slate-500">
                        Formatos aceitos: JPG, PNG, WebP
                    </p>
                </div>
            ) : (
                <div className="relative">
                    <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center">
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
                    <p className="text-sm text-slate-600 mt-4 text-center">
                        Imagem carregada com sucesso! Prossiga para escolher o modo.
                    </p>
                </div>
            )}
        </div>
    );
}
