import { Upload, Image, ArrowLeft, ArrowRight, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { ARModel, ARPartConfig, EditingPart } from '@/hooks/useARState';

interface ARComponentsPanelProps {
  model: ARModel;
  editingPart: EditingPart;
  onSelectPart: (part: EditingPart) => void;
  onUploadPart: (partName: keyof ARModel['parts'], img: HTMLImageElement, remoteUrl: string) => void;
  onSaveDefault: () => void;
  onClearAll: () => void;
  profileId: string;
}

export default function ARComponentsPanel({
  model,
  editingPart,
  onSelectPart,
  onUploadPart,
  onSaveDefault,
  onClearAll,
  profileId,
}: ARComponentsPanelProps) {
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, partName: keyof ARModel['parts']) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create local image preview
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const img = new window.Image();
      img.onload = async () => {
        // Upload to Supabase Storage
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${profileId}/ar-parts/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('glasses-images')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('glasses-images')
            .getPublicUrl(filePath);

          onUploadPart(partName, img, publicUrl);

          // Auto-copy left to right
          if (partName === 'left') {
            onUploadPart('right', img, publicUrl);
          }

          // Auto-select the uploaded part (after auto-copy to ensure correct selection)
          onSelectPart(partName);

          toast({ title: 'Imagem enviada!' });
        } catch (error: any) {
          toast({
            title: 'Erro no upload',
            description: error.message,
            variant: 'destructive',
          });
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const parts: { key: keyof ARModel['parts']; label: string; sublabel: string; icon: React.ReactNode }[] = [
    { key: 'front', label: 'Frente', sublabel: 'Armação frontal', icon: <Image className="w-5 h-5 text-slate-400" /> },
    { key: 'left', label: 'Haste Esq.', sublabel: 'Lateral esquerda', icon: <ArrowLeft className="w-5 h-5 text-slate-400" /> },
    { key: 'right', label: 'Haste Dir.', sublabel: 'Lateral direita', icon: <ArrowRight className="w-5 h-5 text-slate-400" /> },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" /> Componentes
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onSaveDefault}
            className="text-xs font-medium text-blue-500 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors border border-transparent hover:border-blue-100"
            title="Salvar ajustes atuais como padrão"
          >
            Salvar Padrão
          </button>
          <button
            onClick={onClearAll}
            className="text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
          >
            Limpar Tudo
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {parts.map((part) => {
          const isActive = editingPart === part.key;
          const hasImage = !!model.parts[part.key].img;

          return (
            <div
              key={part.key}
              onClick={() => onSelectPart(part.key)}
              className={`p-3 rounded-xl cursor-pointer flex items-center gap-4 group border transition-all ${isActive
                ? 'border-blue-600 bg-blue-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                }`}
            >
              {/* Checkbox indicator */}
              <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                <div
                  className={`w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center transition-all ${isActive ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                    }`}
                >
                  {isActive && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </div>

              {/* Thumbnail */}
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden shadow-inner">
                {hasImage ? (
                  <img
                    src={model.parts[part.key].img?.src}
                    alt={part.label}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  part.icon
                )}
              </div>

              {/* Labels */}
              <div className="flex-1">
                <span
                  className={`text-sm font-bold block transition-colors ${isActive ? 'text-blue-600' : 'text-slate-700 group-hover:text-blue-600'
                    }`}
                >
                  {part.label}
                </span>
                <span className="text-[11px] text-slate-400">{part.sublabel}</span>
              </div>

              {/* Upload button */}
              <label
                className={`w-[42px] h-[42px] flex items-center justify-center rounded-xl cursor-pointer transition-all border ${hasImage
                  ? 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-blue-600 hover:border-blue-600 hover:text-white'
                  }`}
                onClick={(e) => e.stopPropagation()}
              >
                <Upload className="w-5 h-5" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => handleFileUpload(e, part.key)}
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
