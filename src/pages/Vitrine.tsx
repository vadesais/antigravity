import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageCircle, Glasses, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ARTryOnModal from '@/components/ar/ARTryOnModal';
import CategoryFilterModal from '@/components/CategoryFilterModal';
import VisagismoButton from '@/components/visagismo/VisagismoButton';
import VisagismoModal from '@/components/visagismo/VisagismoModal';
import VitrineLayout from '@/components/VitrineLayout';

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
        .select('id, store_name, store_logo_url, store_logo_rect_url, banner_url, store_color, allow_camera, allow_image, allow_visagismo, is_blocked, phone, wa_enabled, wa_number, wa_message')
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

      // Block vitrine if store is set to "Provador por Imagem" (allow_image)
      if (profileData.allow_image) {
        setError('Esta vitrine não está disponível para este tipo de loja');
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
    // Smart Preload: Start loading FaceMesh as soon as Vitrine opens
    import('@/services/faceMeshService').then(({ faceMeshService }) => {
      faceMeshService.preload();
    });
  }, [fetchStoreData]);

  // Force Light Mode on Vitrine
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

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

  // Se houver erro ou não carregar o perfil
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
    <>
      <VitrineLayout
        profile={profile}
        glasses={filteredGlasses}
        primaryColor={primaryColor}
        onLogoClick={handleLogoClick}
        onWhatsAppClick={handleWhatsAppClick}
        onTryOn={handleTryOn}
        onFilterClick={() => setIsFilterModalOpen(true)}
        onVisagismoClick={() => setIsVisagismoOpen(true)}
        loading={loading}
        error={error}
      />

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
    </>
  );
}
