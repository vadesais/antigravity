import { ScanFace } from 'lucide-react';

interface VisagismoButtonProps {
    onClick: () => void;
    primaryColor: string;
}

export default function VisagismoButton({ onClick, primaryColor }: VisagismoButtonProps) {
    return (
        <button
            onClick={onClick}
            className="w-full sm:w-auto px-6 py-3 text-white text-sm font-medium rounded hover:opacity-90 transition flex items-center justify-center gap-2 shadow-md"
            style={{ backgroundColor: primaryColor }}
        >
            <ScanFace className="w-5 h-5" />
            Visagismo Digital
        </button>
    );
}
