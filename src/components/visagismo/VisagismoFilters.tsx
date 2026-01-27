import { Glasses, Sun, User, Users } from 'lucide-react';
import { GlassType } from '@/types/visagismo';

interface VisagismoFiltersProps {
    gender: 'Masculino' | 'Feminino' | 'Unissex' | null;
    glassType: GlassType | null;
    onGenderChange: (gender: 'Masculino' | 'Feminino' | 'Unissex') => void;
    onGlassTypeChange: (type: GlassType) => void;
}

export default function VisagismoFilters({
    gender,
    glassType,
    onGenderChange,
    onGlassTypeChange,
}: VisagismoFiltersProps) {
    return (
        <div className="space-y-4">
            {/* Gender Filter */}
            <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block">
                    Para quem?
                </label>
                <div className="flex gap-2">
                    {(['Masculino', 'Feminino', 'Unissex'] as const).map((option) => (
                        <button
                            key={option}
                            onClick={() => onGenderChange(option)}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${gender === option
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-1.5">
                                {option === 'Unissex' && <Users className="w-3.5 h-3.5" />}
                                {option !== 'Unissex' && <User className="w-3.5 h-3.5" />}
                                <span>{option}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Glass Type Filter */}
            <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block">
                    Tipo de óculos
                </label>
                <div className="flex gap-2">
                    <button
                        onClick={() => onGlassTypeChange('grau')}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${glassType === 'grau'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-1.5">
                            <Glasses className="w-3.5 h-3.5" />
                            <span>Grau</span>
                        </div>
                    </button>
                    <button
                        onClick={() => onGlassTypeChange('sol')}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${glassType === 'sol'
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-1.5">
                            <Sun className="w-3.5 h-3.5" />
                            <span>Sol</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
