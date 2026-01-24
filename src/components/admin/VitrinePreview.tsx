import { useState, useMemo } from 'react';
import useMeasure from 'react-use-measure';
import { Smartphone, Monitor, ZoomIn, ZoomOut, Maximize, Minimize } from 'lucide-react';
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
    const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('manual');
    const [manualScale, setManualScale] = useState(0.55);
    const [ref, bounds] = useMeasure();

    // Fake profile
    const fakeProfile = {
        id: 'preview',
        store_name: config.storeName,
        store_logo_url: config.storeLogoUrl,
        store_logo_rect_url: (config as any).storeLogoRectUrl,
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

    // Target Dimensions
    const TARGET_WIDTH = device === 'mobile' ? 375 : 1366;
    const TARGET_HEIGHT = device === 'mobile' ? 667 : 800;

    // Calculate Fit Scale
    const fitScale = useMemo(() => {
        if (bounds.width === 0 || bounds.height === 0) return 1;
        const padding = 40;
        const availableWidth = bounds.width - padding;
        const availableHeight = bounds.height - padding;

        const scaleX = availableWidth / TARGET_WIDTH;
        const scaleY = availableHeight / TARGET_HEIGHT;

        // Prevent upscaling in fit mode if bounds are huge
        return Math.min(scaleX, scaleY, 1);
    }, [bounds.width, bounds.height, TARGET_WIDTH, TARGET_HEIGHT]);

    const currentScale = zoomMode === 'fit' ? fitScale : manualScale;

    // Zoom handlers
    const zoomIn = () => {
        setZoomMode('manual');
        setManualScale(prev => Math.min(prev + 0.1, 2));
    };

    const zoomOut = () => {
        setZoomMode('manual');
        setManualScale(prev => Math.max(prev - 0.1, 0.2));
    };

    const toggleFit = () => {
        if (zoomMode === 'fit') {
            setZoomMode('manual');
            setManualScale(1);
        } else {
            setZoomMode('fit');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 p-3 flex items-center justify-between flex-shrink-0 z-20 relative shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-lg mr-4">
                        <button
                            onClick={() => setDevice('desktop')}
                            className={`p-1.5 px-3 rounded-md transition flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${device === 'desktop' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Monitor className="w-4 h-4" /> PC
                        </button>
                        <button
                            onClick={() => setDevice('mobile')}
                            className={`p-1.5 px-3 rounded-md transition flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${device === 'mobile' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Smartphone className="w-4 h-4" /> Mobile
                        </button>
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-2"></div>

                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                        <button onClick={zoomOut} className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-slate-50 text-slate-600 shadow-sm" title="Diminuir Zoom">
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="w-16 text-center text-xs font-mono font-medium text-slate-600">
                            {(currentScale * 100).toFixed(0)}%
                        </span>
                        <button onClick={zoomIn} className="w-8 h-8 flex items-center justify-center rounded bg-white hover:bg-slate-50 text-slate-600 shadow-sm" title="Aumentar Zoom">
                            <ZoomIn className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <button
                    onClick={toggleFit}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition border flex items-center gap-2 ${zoomMode === 'fit'
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    {zoomMode === 'fit' ? <Maximize className="w-3 h-3" /> : <Minimize className="w-3 h-3" />}
                    {zoomMode === 'fit' ? 'Ajustado' : '100%'}
                </button>
            </div>

            {/* Viewport Container - Measures available space */}
            <div ref={ref} className="flex-1 overflow-auto bg-slate-200/50 relative flex items-start justify-center p-8 custom-scrollbar">

                {/* The 'Screen' Wrapper */}
                <div
                    style={{
                        width: TARGET_WIDTH,
                        height: device === 'mobile' ? TARGET_HEIGHT : '100%',
                        minHeight: device === 'desktop' ? '100%' : undefined,
                        transform: `scale(${currentScale})`,
                        transformOrigin: 'top center',
                        marginBottom: '40px'
                    }}
                    className={`bg-white shadow-2xl transition-all duration-200 flex-shrink-0 ${device === 'mobile' ? 'rounded-[40px] border-[12px] border-[#1a1a1a] overflow-hidden' : 'rounded-lg border border-slate-300'}`}
                >
                    {/* Inner Scroll Container */}
                    <div className="w-full h-full overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                        <VitrineLayout
                            profile={fakeProfile}
                            glasses={products}
                            primaryColor={config.storeColor}
                            onLogoClick={() => { }}
                            onWhatsAppClick={() => { }}
                            onTryOn={() => { }}
                            onFilterClick={() => { }}
                            onVisagismoClick={() => { }}
                            isPreview={true}
                            isMobilePreview={device === 'mobile'}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
