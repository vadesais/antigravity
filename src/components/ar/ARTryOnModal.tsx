import { useEffect, useCallback } from 'react';

import { ShoppingCart, LayoutGrid, ArrowLeft, Glasses, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ARViewer3D from './ARViewer3D';

interface ARConfig {
  front?: string;
  left?: string;
  right?: string;
  frontParams?: { x: number; y: number; scale: number };
  leftParams?: any;
  rightParams?: any;
  autoAnchors?: boolean;
}

interface Glass {
  id: string;
  name: string;
  image_url: string;
  price: string | null;
  buy_link: string | null;
  ar_config: ARConfig;
}

interface ARTryOnModalProps {
  glass: Glass | null;
  isOpen: boolean;
  onClose: () => void;
  storePhone?: string | null;
}

export default function ARTryOnModal({ glass, isOpen, onClose, storePhone }: ARTryOnModalProps) {

  // Handle buy button
  const handleBuy = useCallback(() => {
    if (glass?.buy_link) {
      window.open(glass.buy_link, '_blank');
    } else if (storePhone && glass) {
      const message = encodeURIComponent(`Olá! Quero o modelo ${glass.name}`);
      window.open(`https://wa.me/${storePhone.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
  }, [glass, storePhone]);

  // Handle back button
  useEffect(() => {
    if (!isOpen) return;

    const handlePopState = () => {
      onClose();
    };

    window.history.pushState({ view: 'tryon' }, 'Provador', '#provador');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !glass) return null;

  // Format price
  let priceText = 'Consultar preço';
  if (glass.price && parseFloat(glass.price.replace(',', '.')) > 0) {
    let displayPrice = glass.price;
    if (!displayPrice.includes(',')) {
      displayPrice = parseFloat(displayPrice || '0').toFixed(2).replace('.', ',');
    }
    priceText = `R$ ${displayPrice}`;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-start justify-between">
        {/* Top Left: Back Icon */}
        <button
          onClick={onClose}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 shadow-sm hover:bg-black/30 transition text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Top Right: Price Only */}
        <div className="flex flex-col items-end gap-1">
          <div className="bg-black/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-sm text-right">
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/90 font-medium">{priceText}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3D AR Viewer */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        <ARViewer3D glass={glass} />
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-6 right-6 z-10 pointer-events-none flex justify-center">
        <div className="flex gap-3 w-full max-w-sm pointer-events-auto">
          {/* Others Button */}
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 text-white font-medium text-xs uppercase bg-black/40 backdrop-blur-md rounded-lg hover:bg-black/50 transition shadow-lg border border-white/10 h-10 tracking-wide"
          >
            <Glasses className="w-4 h-4" />
            Outros
          </button>

          {/* Buy Button */}
          <Button
            onClick={handleBuy}
            className="flex-1 bg-green-600 hover:bg-green-700 shadow-green-900/20 text-white font-medium text-xs uppercase rounded-lg shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 h-10 p-0 tracking-wide"
          >
            {(glass.ar_config?.purchaseType === 'whatsapp' || glass.buy_link?.includes('whatsapp.com') || glass.buy_link?.includes('wa.me')) ? (
              <MessageCircle className="w-4 h-4" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
            Comprar
          </Button>
        </div>
      </div>
    </div>
  );
}
