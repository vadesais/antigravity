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
                            // We treat Category as a section header. Filtering is done by Tags.

                            return (
                                <AccordionItem key={category} value={category} className="border-b border-slate-100 last:border-0">
                                    <AccordionTrigger className="hover:no-underline py-4 px-2 group [&>svg]:hidden">
                                        {/* Custom Trigger Layout */}
                                        <div className="flex items-center justify-between w-full">
                                            <span className="text-base font-bold text-slate-800 uppercase tracking-wide text-left">{category}</span>
                                            <div className="relative flex items-center justify-center w-4 h-4 mr-2">
                                                <Plus className="w-4 h-4 text-slate-400 absolute transition-transform duration-200 scale-100 group-data-[state=open]:scale-0 group-data-[state=open]:rotate-90" />
                                                <Minus className="w-4 h-4 text-slate-800 absolute transition-transform duration-200 scale-0 group-data-[state=open]:scale-100" />
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-4 px-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            {categoryTags.length > 0 ? (
                                                categoryTags.map(tagName => {
                                                    const isSelected = selectedTags.includes(tagName);
                                                    return (
                                                        <div
                                                            key={tagName}
                                                            onClick={() => onToggleTag(tagName)}
                                                            className={`
                                                                cursor-pointer flex items-center gap-2 p-2 rounded-md border transition-all duration-200
                                                                ${isSelected
                                                                    ? 'bg-primary/5 border-primary shadow-sm'
                                                                    : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                                                }
                                                            `}
                                                            style={isSelected ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                                                        >
                                                            <div
                                                                className={`
                                                                    w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors
                                                                `}
                                                                style={{
                                                                    borderColor: isSelected ? primaryColor : undefined,
                                                                    backgroundColor: isSelected ? primaryColor : 'white'
                                                                }}
                                                            >
                                                                {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                                            </div>
                                                            <span
                                                                className={`text-xs font-medium leading-tight`}
                                                                style={{ color: isSelected ? primaryColor : '#475569' }}
                                                            >
                                                                {tagName}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p className="col-span-2 text-xs text-slate-400 italic">Sem tags disponíveis</p>
                                            )}
                                        </div>
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
