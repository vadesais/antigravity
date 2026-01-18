import { Sparkles } from 'lucide-react';

interface VisagismoButtonProps {
    onClick: () => void;
    primaryColor: string;
}

export default function VisagismoButton({ onClick, primaryColor }: VisagismoButtonProps) {
    return (
        <button
            onClick={onClick}
            className="w-full bg-white border-2 border-slate-200 rounded-xl px-6 py-4 flex items-center justify-center gap-3 hover:border-slate-300 hover:shadow-md transition-all group"
        >
            <Sparkles className="w-5 h-5 text-slate-700 group-hover:text-slate-900 transition" />
            <span className="text-base font-bold text-slate-900">
                Visagismo Digital
            </span>
        </button>
    );
}
