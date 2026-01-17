import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageCircle, Glasses, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ARTryOnModal from '@/components/ar/ARTryOnModal';
import CategoryFilterModal from '@/components/CategoryFilterModal';
import VisagismoButton from '@/components/visagismo/VisagismoButton';
import VisagismoModal from '@/components/visagismo/VisagismoModal';

interface Profile {
  id: string;
  store_name: string | null;
  store_logo_url: string | null;
  banner_url: string | null;
  store_color: string | null;
  allow_camera: boolean | null;
  allow_image: boolean | null;
  allow_visagismo: boolean | null;
  is_blocked: boolean | null;
  phone: string | null;
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

export default function Vitrine() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [glasses, setGlasses] = useState<Glass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AR Try-on modal state
  const [selectedGlass, setSelectedGlass] = useState<Glass | null>(null);
  const [isTryOnOpen, setIsTryOnOpen] = useState(false);

  // Logo click counter for secret admin access
  const [logoClicks, setLogoClicks] = useState(0);
  const logoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedCategoriesFilter, setSelectedCategoriesFilter] = useState<string[]>([]);

  // Visagismo modal state
  const [isVisagismoOpen, setIsVisagismoOpen] = useState(false);

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
        .select('id, store_name, store_logo_url, banner_url, store_color, allow_camera, allow_image, allow_visagismo, is_blocked, phone')
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

  // Filter glasses by category
  const filteredGlasses = glasses.filter((glass) => {
    // If no categories selected in filter modal, show all
    if (selectedCategoriesFilter.length === 0) {
      return true;
    }
    // If categories selected in filter modal, filter by them
    return glass.category && selectedCategoriesFilter.includes(glass.category);
  });

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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          {/* Logo - Clickable for admin access */}
          <div
            onClick={handleLogoClick}
            className="cursor-pointer select-none flex items-center gap-2"
          >
            {profile.store_logo_url ? (
              <img
                src={profile.store_logo_url}
                alt={profile.store_name || 'Logo'}
                className="h-8 object-contain"
                draggable={false}
              />
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
        <section className="relative h-48 md:h-56 overflow-hidden">
          <img
            src={profile.banner_url}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        </section>
      ) : (
        <section
          className="relative h-32 md:h-40 flex items-center justify-center overflow-hidden bg-slate-50"
        >
          <div className="text-center z-10">
            <h1 className="text-2xl md:text-3xl font-medium text-slate-900 mb-1">
              {profile.store_name || 'Vitrine Virtual'}
            </h1>
            <p className="text-sm text-slate-500">Encontre o óculos perfeito para você</p>
          </div>
        </section>
      )}

      {/* Visagismo Digital Button */}
      {profile.allow_visagismo && (
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <VisagismoButton
            onClick={() => setIsVisagismoOpen(true)}
            primaryColor={primaryColor}
          />
        </div>
      )}

      {/* Glasses Collection */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Section Header with Filter Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h2 className="text-xl font-medium text-slate-900">Coleção de Óculos</h2>

          {/* Filtrar Produtos Button */}
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2 text-white text-sm font-medium rounded hover:opacity-90 transition flex items-center justify-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            <Filter className="w-4 h-4" />
            filtrar produtos
          </button>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
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
                  className="bg-white rounded overflow-hidden border border-slate-200 flex flex-col hover:shadow-sm transition-shadow group"
                >
                  {/* Image Container */}
                  <div className="aspect-square w-full bg-slate-50 flex items-center justify-center p-3 relative">
                    <img
                      src={glass.cover_image_url || glass.image_url}
                      alt={glass.name}
                      className="max-h-full max-w-full object-contain mix-blend-multiply"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-3 flex flex-col gap-2 flex-grow">
                    <div>
                      <h4 className="font-medium text-slate-900 text-sm leading-tight line-clamp-2">
                        {glass.name}
                      </h4>
                      <p className="text-slate-600 text-xs mt-0.5">
                        {priceDisplay}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-auto flex flex-col gap-1.5">
                      {/* Provador Button */}
                      {profile.allow_camera !== false && hasArConfig ? (
                        <button
                          className="w-full text-white text-xs font-medium py-1.5 px-3 rounded hover:opacity-90 transition flex items-center justify-center gap-1.5"
                          style={{ backgroundColor: primaryColor }}
                          onClick={() => handleTryOn(glass)}
                        >
                          <Glasses className="w-3.5 h-3.5" />
                          Provador Virtual
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full border border-slate-200 text-slate-400 text-xs font-medium py-1.5 px-3 rounded cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <Glasses className="w-3.5 h-3.5" />
                          Provador Virtual
                        </button>
                      )}

                      {/* Comprar Button */}
                      {glass.buy_link ? (
                        <a
                          href={glass.buy_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-emerald-600 text-white text-xs font-medium py-1.5 px-3 rounded hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 text-center no-underline"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Comprar
                        </a>
                      ) : profile.phone ? (
                        <button
                          onClick={() => {
                            const message = encodeURIComponent(`Olá! Quero o modelo ${glass.name}`);
                            window.open(`https://wa.me/${profile.phone?.replace(/\D/g, '')}?text=${message}`, '_blank');
                          }}
                          className="w-full bg-emerald-600 text-white text-xs font-medium py-1.5 px-3 rounded hover:bg-emerald-700 transition flex items-center justify-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Comprar
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
        }
      </main >

      {/* WhatsApp Floating Button */}
      {
        profile.phone && (
          <button
            onClick={handleWhatsAppClick}
            className="fixed bottom-4 right-4 w-12 h-12 rounded-full bg-emerald-600 text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center z-50"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        )
      }

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-100 mt-12">
        Powered by <span className="font-medium">Lopix</span>
      </footer>

      {/* AR Try-On Modal */}
      <ARTryOnModal
        glass={selectedGlass}
        isOpen={isTryOnOpen}
        onClose={handleCloseTryOn}
        storePhone={profile.phone}
      />

      {/* Category Filter Modal */}
      <CategoryFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        selectedCategories={selectedCategoriesFilter}
        onCategoryChange={setSelectedCategoriesFilter}
        storeId={profile.id}
      />

      {/* Visagismo Modal */}
      <VisagismoModal
        isOpen={isVisagismoOpen}
        onClose={() => setIsVisagismoOpen(false)}
        glasses={glasses}
        onSelectGlass={(glass) => {
          setSelectedGlass(glass);
          setIsTryOnOpen(true);
        }}
        storeId={profile.id}
      />
    </div >
  );
}
