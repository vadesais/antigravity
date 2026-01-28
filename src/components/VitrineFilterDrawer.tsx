import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Filter, Plus, Minus, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface VitrineFilterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    categories: string[];
    tagsByCategory: Record<string, string[]>;
    selectedCategories: string[];
    selectedTags: string[];
    onToggleCategory: (category: string) => void;
    onToggleTag: (tag: string) => void;
    onClearFilters: () => void;
    primaryColor: string;
}

export default function VitrineFilterDrawer({
    isOpen,
    onClose,
    categories,
    tagsByCategory,
    selectedCategories,
    selectedTags,
    onToggleCategory,
    onToggleTag,
    onClearFilters,
    primaryColor
}: VitrineFilterDrawerProps) {
    const handleCategoryClick = (category: string) => {
        // Just for UX, we might want to auto-select the category if a tag is selected,
        // but for now let's just keep the selection logic simple as passed via props.
        onToggleCategory(category);
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col bg-white border-l border-slate-100">
                <SheetHeader className="px-6 py-4 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                    <SheetTitle className="text-xl font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        FILTRAR
                    </SheetTitle>
                    {/* Close button is handled by Sheet default close, but we can customize or hide it if needed. 
                        Shadcn Sheet usually adds a generic X. We'll rely on that or the standard one. */}
                </SheetHeader>

                <ScrollArea className="flex-1 px-6 py-4">
                    <Accordion type="multiple" className="w-full space-y-4">
                        {/* Static Options or "All" could go here if needed */}

                        {categories.map((category) => {
                            const categoryTags = tagsByCategory[category] || [];
                            const isCategorySelected = selectedCategories.includes(category);

                            return (
                                <AccordionItem key={category} value={category} className="border-b border-slate-100 last:border-0">
                                    <div className="flex items-center justify-between py-1">
                                        {/* Wrapper for checkbox + accordion trigger visual */}
                                        <div className="flex items-center gap-3 flex-1">
                                            <Checkbox
                                                id={`cat-${category}`}
                                                checked={isCategorySelected}
                                                onCheckedChange={() => onToggleCategory(category)}
                                                className="data-[state=checked]:bg-black data-[state=checked]:text-white border-slate-300 w-5 h-5 rounded-md"
                                                style={{
                                                    borderColor: isCategorySelected ? primaryColor : undefined,
                                                    backgroundColor: isCategorySelected ? primaryColor : undefined
                                                }}
                                            />
                                            <AccordionTrigger className="hover:no-underline py-2 text-base font-medium text-slate-800 flex-1 text-left">
                                                {category}
                                                {isCategorySelected && (
                                                    <span className="ml-2 text-xs font-normal text-slate-400">
                                                        ({categoryTags.length})
                                                    </span>
                                                )}
                                            </AccordionTrigger>
                                        </div>
                                    </div>

                                    <AccordionContent className="pl-8 pb-4">
                                        {categoryTags.length > 0 ? (
                                            <div className="flex flex-col gap-3 pt-1">
                                                {categoryTags.map(tag => {
                                                    const isTagSelected = selectedTags.includes(tag);
                                                    return (
                                                        <div key={tag} className="flex items-center gap-2">
                                                            <Checkbox
                                                                id={`tag-${tag}`}
                                                                checked={isTagSelected}
                                                                onCheckedChange={() => onToggleTag(tag)}
                                                                className="border-slate-200 w-4 h-4 rounded"
                                                                style={{
                                                                    borderColor: isTagSelected ? primaryColor : undefined,
                                                                    backgroundColor: isTagSelected ? primaryColor : undefined
                                                                }}
                                                            />
                                                            <label
                                                                htmlFor={`tag-${tag}`}
                                                                className="text-sm text-slate-600 font-medium cursor-pointer select-none"
                                                            >
                                                                {tag}
                                                            </label>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">Sem filtros adicionais</p>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                </ScrollArea>

                <div className="p-6 border-t border-slate-100 bg-slate-50 mt-auto">
                    <Button
                        onClick={onClearFilters}
                        variant="outline"
                        className="w-full mb-3 border-slate-200 hover:bg-slate-100 text-slate-600"
                    >
                        Limpar Filtros
                    </Button>
                    <Button
                        onClick={onClose}
                        className="w-full text-white font-bold tracking-wide"
                        style={{ backgroundColor: primaryColor }}
                    >
                        VER RESULTADOS
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
