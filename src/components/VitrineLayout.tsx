import { MessageCircle, Filter, Glasses, UploadCloud, ShoppingCart } from 'lucide-react';
import VisagismoButton from '@/components/visagismo/VisagismoButton';
import { Button } from '@/components/ui/button';

interface Profile {
    id: string;
    store_name: string | null;
    store_logo_url: string | null;
    store_logo_rect_url: string | null;
    banner_url: string | null;
    store_color: string | null;
    allow_camera: boolean | null;
    allow_image: boolean | null;
    allow_visagismo: boolean | null;
    is_blocked: boolean | null;
    phone: string | null;
    wa_enabled: boolean | null;
    wa_number: string | null;
    wa_message: string | null;
}

interface Glass {
    id: string;
    name: string;
    image_url: string;
    cover_image_url: string | null;
    price: string | null;
    category: string | null;
    buy_link: string | null;
    ar_config: any;
    active: boolean | null;
}

interface VitrineLayoutProps {
    profile: Profile;
    glasses: Glass[];
    primaryColor: string;
    onLogoClick?: () => void;
    onWhatsAppClick: () => void;
    onTryOn: (glass: Glass) => void;
    onFilterClick: () => void;
    onVisagismoClick: () => void;
    loading?: boolean;
    error?: string | null;
    isPreview?: boolean;
    isMobilePreview?: boolean;
}

// Helper to maximize performance with Supabase Image Transformation
const getOptimizedImageUrl = (url: string, width: number) => {
    if (!url) return '';
    // Check if it's a Supabase Storage URL
    if (url.includes('supabase.co/storage/v1/object/public')) {
        // Supabase Image Transformation (if enabled/supported on project)
        // Note: Standard Supabase Storage doesn't always support ?width= on public buckets without pro plan or image resizer, 
        // but adding the param is harmless if unsupported (ignored) and vital if supported.
        return `${url}?width=${width}&resize=contain`;
    }
    return url;
};

export default function VitrineLayout({
    profile,
    glasses,
    primaryColor,
    onLogoClick,
    onWhatsAppClick,
    onTryOn,
    onFilterClick,
    onVisagismoClick,
    loading = false,
    error = null,
    isPreview = false,
    isMobilePreview = false
}: VitrineLayoutProps) {

    if (loading) {
        return (
            <div className="min-h-full flex items-center justify-center bg-slate-100 p-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-full flex items-center justify-center bg-slate-100 p-10">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">{error}</h1>
                    <p className="text-slate-500">Verifique o link e tente novamente.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen bg-white ${isPreview ? 'pointer-events-none select-none' : ''}`}>
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
                <div className="w-full px-6 py-4 flex items-center justify-between">
                    {/* Logo */}
                    <div
                        onClick={onLogoClick}
                        className={`cursor-pointer select-none flex items-center gap-2 ${isPreview ? 'pointer-events-auto' : ''}`}
                    >
                        {(profile.store_logo_url || profile.store_logo_rect_url) ? (
                            <div className="flex items-center gap-3">
                                {profile.store_logo_url && (
                                    <img
                                        src={profile.store_logo_url}
                                        alt={profile.store_name || 'Logo'}
                                        className="h-10 object-contain"
                                        draggable={false}
                                    />
                                )}
                                {profile.store_logo_rect_url && (
                                    <img
                                        src={profile.store_logo_rect_url}
                                        alt={profile.store_name || 'Logo'}
                                        className="h-10 object-contain"
                                        draggable={false}
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-8 h-8 rounded flex items-center justify-center text-white font-medium text-base"
                                    style={{ backgroundColor: '#1a1a1a' }}
                                >
                                    {(profile.store_name || 'L')[0].toUpperCase()}
                                </div>
                                <span className="text-lg font-medium text-slate-900">
                                    {profile.store_name || 'Vitrine'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Banner */}
            {profile.banner_url ? (
                <section className={`relative overflow-hidden ${isMobilePreview ? 'h-auto' : 'h-[300px] md:h-[500px]'}`}>
                    <img
                        src={profile.banner_url}
                        alt="Banner"
                        className="w-full h-full object-cover"
                    />
                </section>
            ) : (
                <section className={`relative flex items-center justify-center overflow-hidden bg-slate-50 ${isMobilePreview ? 'h-[200px]' : 'h-[200px] md:h-[300px]'}`}>
                    <div className="text-center z-10">
                        <h1 className="text-2xl md:text-3xl font-medium text-slate-900 mb-1">
                            {profile.store_name || 'Vitrine Virtual'}
                        </h1>
                        <p className="text-sm text-slate-500">Envie o banner da sua ótica!</p>
                    </div>
                </section>
            )}



            {/* Glasses Collection */}
            <main className={`w-full py-8 md:px-12 ${isMobilePreview ? 'px-4' : 'px-6'}`}>
                <div className="flex items-center justify-between gap-3 mb-6">
                    <h2 className="text-xl font-medium text-slate-900">Coleção de Óculos</h2>

                    <button
                        onClick={isPreview ? undefined : onFilterClick}
                        className={`px-3 py-2 text-white text-sm font-medium rounded hover:opacity-90 transition flex items-center justify-center gap-2 whitespace-nowrap ${isMobilePreview ? 'w-auto' : 'w-auto'}`}
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Filter className="w-4 h-4" />
                        filtrar produtos
                    </button>
                </div>

                {/* Visagismo Digital Button */}
                {profile.allow_visagismo && (
                    <div className="mb-6">
                        <div onClick={isPreview ? undefined : onVisagismoClick}>
                            <VisagismoButton onClick={() => { }} primaryColor={primaryColor} />
                        </div>
                    </div>
                )}

                {glasses.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-slate-500">Nenhum óculos disponível no momento.</p>
                    </div>
                ) : (
                    <div className={`grid gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-16 ${isMobilePreview ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-4'}`}>
                        {glasses.map((glass) => {
                            let priceDisplay = 'Consultar preço';
                            if (glass.price && parseFloat(glass.price.replace(',', '.')) > 0) {
                                let displayPrice = glass.price;
                                if (!displayPrice.includes(',')) {
                                    displayPrice = parseFloat(displayPrice || '0').toFixed(2).replace('.', ',');
                                }
                                priceDisplay = `R$ ${displayPrice}`;
                            }

                            const hasArConfig = glass.ar_config && Object.keys(glass.ar_config).length > 0;

                            return (
                                <div
                                    key={glass.id}
                                    className="group flex flex-col gap-4"
                                >
                                    {/* Image Container - Clean, no border */}
                                    <div className="aspect-square w-full bg-white flex items-center justify-center relative overflow-hidden">
                                        <img
                                            src={getOptimizedImageUrl(glass.cover_image_url || glass.image_url, 500)}
                                            alt={glass.name}
                                            loading="lazy"
                                            width="500"
                                            height="500"
                                            className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                                        />
                                    </div>

                                    {/* Info - Price Top, Name Serif Bottom */}
                                    <div className="flex flex-col gap-1 px-1">
                                        <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                                            {priceDisplay !== 'Consultar preço' ? priceDisplay : 'CONSULTAR PREÇO'}
                                        </p>
                                        <h4
                                            className="text-xl text-slate-900 leading-tight"
                                            style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700 }}
                                        >
                                            {glass.name}
                                        </h4>
                                    </div>

                                    {/* Action Buttons - Mobile: Col, Desktop: Row */}
                                    <div className={`mt-auto flex gap-3 ${isMobilePreview ? 'flex-col' : 'flex-col xl:flex-row'}`}>
                                        {/* Provador Button */}
                                        {profile.allow_camera !== false && hasArConfig ? (
                                            <button
                                                className={`flex-1 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-sm font-medium transition flex items-center justify-center gap-2 whitespace-nowrap ${!isMobilePreview ? 'py-2.5 px-4 xl:py-3' : 'py-2 px-1 text-xs'}`}
                                                onClick={isPreview ? undefined : () => onTryOn(glass)}
                                            >
                                                <Glasses className={`${isMobilePreview ? 'w-3 h-3' : 'w-4 h-4'} flex-shrink-0`} />
                                                Experimentar
                                            </button>
                                        ) : (
                                            <button
                                                disabled
                                                className={`flex-1 border border-slate-200 text-slate-300 bg-slate-50 text-sm font-medium cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap ${!isMobilePreview ? 'py-2.5 px-4 xl:py-3' : 'py-2 px-1 text-xs'}`}
                                            >
                                                <Glasses className={`${isMobilePreview ? 'w-3 h-3' : 'w-4 h-4'} flex-shrink-0`} />
                                                Experimentar
                                            </button>
                                        )}

                                        {/* Comprar Button */}
                                        <button
                                            onClick={isPreview ? undefined : () => {
                                                if (glass.buy_link) {
                                                    window.open(glass.buy_link, '_blank');
                                                } else {
                                                    onWhatsAppClick();
                                                }
                                            }}
                                            className={`flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-medium transition flex items-center justify-center gap-2 whitespace-nowrap ${!isMobilePreview ? 'py-2.5 px-4 xl:py-3' : 'py-2 px-1 text-xs'}`}
                                        >
                                            {(glass.ar_config?.purchaseType === 'whatsapp' || glass.buy_link?.includes('whatsapp.com') || glass.buy_link?.includes('wa.me')) ? (
                                                <MessageCircle className={`${isMobilePreview ? 'w-3 h-3' : 'w-4 h-4'} flex-shrink-0`} />
                                            ) : (
                                                <ShoppingCart className={`${isMobilePreview ? 'w-3 h-3' : 'w-4 h-4'} flex-shrink-0`} />
                                            )}
                                            Comprar
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {profile.phone && (
                <button
                    onClick={isPreview ? undefined : onWhatsAppClick}
                    className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-emerald-600 text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center z-50"
                >
                    <MessageCircle className="w-5 h-5" />
                </button>
            )}

            <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-100 mt-12">
                Powered by <span className="font-medium">Oprovadorvirtual.com.br</span>
            </footer>
        </div>
    );
}
