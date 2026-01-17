import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CategoryFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedCategories: string[];
    onCategoryChange: (categories: string[]) => void;
    storeId: string;
}

export default function CategoryFilterModal({
    isOpen,
    onClose,
    selectedCategories,
    onCategoryChange,
    storeId,
}: CategoryFilterModalProps) {
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && storeId) {
            fetchCategories();
        }
    }, [isOpen, storeId]);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('name')
                .eq('store_id', storeId)
                .order('name');

            if (error) throw error;
            setCategories(data?.map(c => c.name) || []);
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryToggle = (category: string) => {
        if (selectedCategories.includes(category)) {
            onCategoryChange(selectedCategories.filter(c => c !== category));
        } else {
            onCategoryChange([...selectedCategories, category]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <h2 className="text-2xl font-black text-slate-900">FILTRAR</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition"
                    >
                        <X className="w-6 h-6 text-slate-700" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Categorias Section */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-slate-900">Categorias</h3>
                            <span className="text-slate-400">−</span>
                        </div>

                        {loading ? (
                            <div className="text-center py-8 text-slate-400">
                                Carregando categorias...
                            </div>
                        ) : categories.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                Nenhuma categoria cadastrada
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {categories.map((category) => (
                                    <label
                                        key={category}
                                        className="flex items-center gap-3 cursor-pointer group"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedCategories.includes(category)}
                                            onChange={() => handleCategoryToggle(category)}
                                            className="w-5 h-5 rounded border-2 border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-900 focus:ring-offset-0 cursor-pointer"
                                        />
                                        <span className="text-sm text-slate-700 group-hover:text-slate-900 transition">
                                            {category}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
