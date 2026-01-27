import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageCircle, AlertCircle } from 'lucide-react';
import ARTryOnModal from '@/components/ar/ARTryOnModal';

interface Glass {
    id: string;
    name: string;
    image_url: string;
    price: string | null;
    buy_link: string | null;
    ar_config: any;
    store_id: string;
}

interface Profile {
    id: string;
    store_name: string | null;
    phone: string | null;
    store_logo_url: string | null;
    store_color: string | null;
    slug: string | null;
    wa_enabled: boolean | null;
    wa_number: string | null;
}

export default function DirectTryOn() {
    const { glassId } = useParams<{ glassId: string }>();
    const [glass, setGlass] = useState<Glass | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // We use the modal component but control it to be always open
    // This reuses the AR logic without duplication
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Smart Preload: Start loading FaceMesh immediately
        import('@/services/faceMeshService').then(({ faceMeshService }) => {
            faceMeshService.preload();
        });

        async function fetchData() {
            if (!glassId) {
                setError('Link inválido');
                setLoading(false);
                return;
            }

            try {
                // 1. Fetch Glass Data
                const { data: glassData, error: glassError } = await supabase
                    .from('glasses')
                    .select('*')
                    .eq('id', glassId)
                    .single();

                if (glassError || !glassData) {
                    setError('Óculos não encontrado');
                    setLoading(false);
                    return;
                }

                setGlass(glassData);

                // 2. Fetch Store Data
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, store_name, phone, store_logo_url, store_color, slug, wa_enabled, wa_number')
                    .eq('id', glassData.store_id)
                    .single();

                if (profileError) {
                    console.error('Error fetching store:', profileError);
                    // Don't block if store not found, just minimal mode
                } else {
                    setProfile(profileData);
                }

            } catch (err) {
                console.error('Error:', err);
                setError('Erro ao carregar o provador');
            } finally {
                setLoading(false);
                setIsReady(true);
            }
        }

        fetchData();
    }, [glassId]);

    // ... (rest of code) ...

    // Determine correct phone number (Centralized WhatsApp logic)
    const activePhone = (profile?.wa_enabled && profile?.wa_number) ? profile.wa_number : profile?.phone;

    return (
        <>
            {/* Store Branding Header (Overlay) */}
            {profile && (
                <div className="fixed top-0 left-0 right-0 z-[10000] p-4 pointer-events-none">
                    <div className="flex items-center justify-center gap-2 bg-black/30 backdrop-blur-md py-2 px-4 rounded-full mx-auto w-fit">
                        {profile.store_logo_url ? (
                            <img
                                src={profile.store_logo_url}
                                alt={profile.store_name || 'Store'}
                                className="h-6 object-contain"
                            />
                        ) : (
                            <span className="text-white font-bold text-sm">
                                {profile.store_name?.toUpperCase() || 'PROVADOR'}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {isReady && glass && (
                <ARTryOnModal
                    glass={glass}
                    isOpen={true}
                    onClose={() => {
                        // If we have a slug, redirect to the store's vitrine
                        if (profile?.slug) {
                            window.location.href = `/p/${profile.slug}`;
                        } else {
                            // Fallback if no slug (shouldn't happen for active stores)
                            window.location.reload();
                        }
                    }}
                    storePhone={activePhone}
                />
            )}
        </>
    );
}
