import { useState } from 'react';
import { Smartphone, Monitor, Minimize2, Maximize2 } from 'lucide-react';
import VitrineLayout from '@/components/VitrineLayout';

interface VitrinePreviewProps {
    config: {
        bannerUrl: string | null;
        storeColor: string;
        storeLogoUrl: string | null;
        storeName: string | null;
        allowVisagismo: boolean;
        phone: string | null;
        waEnabled: boolean | null;
        waNumber: string | null;
        waMessage: string | null;
        allowCamera: boolean;
    };
    products: any[];
}

export default function VitrinePreview({ config, products }: VitrinePreviewProps) {
    const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [scale, setScale] = useState(1);

    // Fake profile object matching VitrineLayout requirements
    const fakeProfile = {
        id: 'preview',
        store_name: config.storeName,
        store_logo_url: config.storeLogoUrl,
        banner_url: config.bannerUrl,
        store_color: config.storeColor,
        allow_camera: config.allowCamera,
        allow_image: false,
        allow_visagismo: config.allowVisagismo,
        is_blocked: false,
        phone: config.phone,
        wa_enabled: config.waEnabled,
        wa_number: config.waNumber,
        wa_message: config.waMessage,
    };

    return (
        <div className="flex flex-col h-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">
                        Visualização:
                    </span>
                    <button
                        onClick={() => setDevice('desktop')}
                        className={`p-2 rounded-lg transition flex items-center gap-2 text-sm font-medium ${device === 'desktop'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <Monitor className="w-4 h-4" />
                        Computador
                    </button>
                    <button
                        onClick={() => setDevice('mobile')}
                        className={`p-2 rounded-lg transition flex items-center gap-2 text-sm font-medium ${device === 'mobile'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        <Smartphone className="w-4 h-4" />
                        Celular
                    </button>
                </div>

                <div className="text-xs text-slate-400">
                    Preview em tempo real
                </div>
            </div>

            {/* Viewport Container */}
            <div className="flex-1 overflow-hidden relative flex items-start justify-center p-4 md:p-8 bg-slate-100/50">
                <div
                    className={`bg-white shadow-2xl transition-all duration-500 ease-in-out overflow-hidden border border-slate-200 ${device === 'mobile'
                        ? 'w-[375px] h-[667px] rounded-[30px] border-[8px] border-slate-800' // Mobile shell style
                        : 'w-full h-full rounded-lg max-w-full'
                        }`}
                    style={{
                        // Para mobile, podemos usar um scale se a tela for pequena, mas aqui vou deixar fixo por enquanto.
                        // Se o usuário estiver em uma tela pequena editando, o mobile pode não caber.
                        transform: device === 'mobile' ? 'scale(1)' : 'none',
                        transformOrigin: 'top center'
                    }}
                >
                    {/* Iframe-like container for independent scrolling */}
                    <div className="w-full h-full overflow-y-auto scrollbar-hide bg-white">
                        <VitrineLayout
                            profile={fakeProfile}
                            glasses={products}
                            primaryColor={config.storeColor}
                            onLogoClick={() => { }}
                            onWhatsAppClick={() => { }}
                            onTryOn={() => { }}
                            onFilterClick={() => { }}
                            onVisagismoClick={() => { }}
                            isPreview={true} // Disables interactions/links
                            isMobilePreview={device === 'mobile'}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
