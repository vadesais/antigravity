import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageCircle, Glasses } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ARTryOnModal from '@/components/ar/ARTryOnModal';

interface Profile {
  id: string;
  store_name: string | null;
  store_logo_url: string | null;
  banner_url: string | null;
  store_color: string | null;
  allow_camera: boolean | null;
  allow_image: boolean | null;
  is_blocked: boolean | null;
  phone: string | null;
}

interface Glass {
  id: string;
  name: string;
  image_url: string;
  price: string | null;
  category: string | null;
  buy_link: string | null;
  ar_config: any;
  active: boolean | null;
}

export default function Vitrine() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [glasses, setGlasses] = useState<Glass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // AR Try-on modal state
  const [selectedGlass, setSelectedGlass] = useState<Glass | null>(null);
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);

  // Logo click counter for secret admin access
  const [logoClicks, setLogoClicks] = useState(0);
  const logoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const categories = ['Todos', 'Masculino', 'Feminino', 'Infantil', 'Unissex'];

  const fetchStoreData = useCallback(async () => {
    if (!slug) {
      setError('Vitrine não encontrada');
      setLoading(false);
      return;
    }

    try {
      // Fetch profile by slug
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, store_name, store_logo_url, banner_url, store_color, allow_camera, allow_image, is_blocked, phone')
        .eq('slug', slug)
        .single();

      if (profileError || !profileData) {
        setError('Vitrine não encontrada');
        setLoading(false);
        return;
      }

      if (profileData.is_blocked) {
        setError('Esta vitrine está temporariamente indisponível');
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Fetch active glasses for this store
      const { data: glassesData, error: glassesError } = await supabase
        .from('glasses')
        .select('*')
        .eq('store_id', profileData.id)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (glassesError) throw glassesError;
      setGlasses(glassesData || []);
    } catch (err) {
      console.error('Error fetching store data:', err);
      setError('Erro ao carregar a vitrine');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchStoreData();
  }, [fetchStoreData]);

  // Set up real-time subscription for glasses updates
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('vitrine-glasses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'glasses',
          filter: `store_id=eq.${profile.id}`
        },
        () => {
          // Refetch glasses when any change happens
          fetchStoreData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, fetchStoreData]);

  const handleLogoClick = () => {
    // Clear existing timer
    if (logoTimerRef.current) {
      clearTimeout(logoTimerRef.current);
    }

    const newCount = logoClicks + 1;
    setLogoClicks(newCount);

    // Reset counter after 2 seconds of inactivity
    logoTimerRef.current = setTimeout(() => {
      setLogoClicks(0);
    }, 2000);

    // Open admin panel after 5 clicks
    if (newCount >= 5) {
      setLogoClicks(0);
      navigate('/auth', { state: { fromVitrine: true } });
    }
  };

  const handleWhatsAppClick = () => {
    if (profile?.phone) {
      const message = encodeURIComponent(`Olá! Vi sua vitrine virtual e gostei de alguns óculos.`);
      window.open(`https://wa.me/${profile.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
  };

  const handleTryOn = (glass: Glass) => {
    setSelectedGlass(glass);
    setIsTryOnOpen(true);
  };

  const handleCloseTryOn = () => {
    setIsTryOnOpen(false);
    setSelectedGlass(null);
  };

  const filteredGlasses = selectedCategory === 'Todos'
    ? glasses
    : glasses.filter(g => g.category === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {error || 'Vitrine não encontrada'}
          </h1>
          <p className="text-slate-500">
            Verifique o link e tente novamente.
          </p>
        </div>
      </div>
    );
  }

  const primaryColor = profile.store_color || '#2563eb';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo - Clickable for admin access */}
          <div
            onClick={handleLogoClick}
            className="cursor-pointer select-none flex items-center gap-2"
          >
            {profile.store_logo_url ? (
              <img
                src={profile.store_logo_url}
                alt={profile.store_name || 'Logo'}
                className="h-10 object-contain"
                draggable={false}
              />
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  {(profile.store_name || 'L')[0].toUpperCase()}
                </div>
                <span className="text-xl font-bold text-slate-800">
                  {profile.store_name || 'Vitrine'}
                </span>
              </div>
            )}
          </div>

          <span className="text-sm text-slate-400">Vitrine Oficial</span>
        </div>
      </header>

      {/* Hero Banner */}
      {profile.banner_url ? (
        <section className="relative h-64 md:h-80 overflow-hidden">
          <img
            src={profile.banner_url}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        </section>
      ) : (
        <section
          className="relative h-64 md:h-80 flex items-center justify-center overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}10 100%)`
          }}
        >
          <div className="text-center z-10">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">
              {profile.store_name || 'Vitrine Virtual'}
            </h1>
            <p className="text-slate-600">Encontre o óculos perfeito para você</p>
          </div>
        </section>
      )}

      {/* Glasses Collection */}
      <main className="max-w-6xl mx-auto p-6">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-6">
          <div
            className="w-1 h-8 rounded-full"
            style={{ backgroundColor: primaryColor }}
          />
          <h2 className="text-2xl font-bold text-slate-800">Coleção de Óculos</h2>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === category
                  ? 'text-white shadow-lg'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
              style={selectedCategory === category ? { backgroundColor: primaryColor } : {}}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Glasses Grid */}
        {filteredGlasses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-500">
              {glasses.length === 0
                ? 'Nenhum óculos disponível no momento.'
                : 'Nenhum óculos nesta categoria.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredGlasses.map((glass) => {
              // Format price
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
                  className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200 flex flex-col hover:shadow-lg transition-all group"
                >
                  {/* Image Container */}
                  <div className="aspect-square w-full bg-slate-100 flex items-center justify-center p-4 relative">
                    <img
                      src={glass.image_url}
                      alt={glass.name}
                      className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform group-hover:scale-105"
                    />
                    {/* Category Badge */}
                    {glass.category && (
                      <span className="absolute top-2 left-2 bg-slate-200 text-slate-700 text-[10px] px-2 py-1 rounded font-medium uppercase tracking-wide">
                        {glass.category}
                      </span>
                    )}
                    {/* AR Badge */}
                    {hasArConfig && (
                      <span className="absolute top-2 right-2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-bold">
                        AR
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col gap-3 flex-grow">
                    <div>
                      <h4 className="font-bold text-slate-800 text-base leading-tight truncate">
                        {glass.name}
                      </h4>
                      <p className="text-slate-500 text-sm font-medium mt-1">
                        {priceDisplay}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-auto flex flex-col gap-2">
                      {/* Provador Button */}
                      {profile.allow_camera !== false && hasArConfig ? (
                        <button
                          className="w-full bg-slate-900 text-white text-sm font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition shadow-sm"
                          onClick={() => handleTryOn(glass)}
                        >
                          <Glasses className="w-4 h-4" />
                          Provador
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full bg-slate-300 text-slate-500 text-sm font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed shadow-sm"
                        >
                          <Glasses className="w-4 h-4" />
                          Provador
                        </button>
                      )}

                      {/* Comprar Button */}
                      {glass.buy_link ? (
                        <a
                          href={glass.buy_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-green-50 text-green-700 border border-green-200 text-sm font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-green-100 transition text-center no-underline shadow-sm"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Comprar
                        </a>
                      ) : profile.phone ? (
                        <button
                          onClick={() => {
                            const message = encodeURIComponent(`Olá! Quero o modelo ${glass.name}`);
                            window.open(`https://wa.me/${profile.phone?.replace(/\D/g, '')}?text=${message}`, '_blank');
                          }}
                          className="w-full bg-green-50 text-green-700 border border-green-200 text-sm font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-green-100 transition shadow-sm"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Comprar
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* WhatsApp Floating Button */}
      {profile.phone && (
        <button
          onClick={handleWhatsAppClick}
          className="fixed bottom-6 right-6 flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold shadow-xl hover:shadow-2xl transition-all hover:scale-105 z-50"
          style={{ backgroundColor: '#25D366' }}
        >
          <MessageCircle className="w-5 h-5" />
          Fale Conosco
        </button>
      )}

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-slate-400 border-t border-slate-200 mt-12">
        Powered by <span className="font-semibold">Lopix</span>
      </footer>

      {/* AR Try-On Modal */}
      <ARTryOnModal
        glass={selectedGlass}
        isOpen={isTryOnOpen}
        onClose={handleCloseTryOn}
        storePhone={profile.phone}
      />
    </div>
  );
}
