import { useEffect, useCallback } from 'react';
import { ShoppingCart, LayoutGrid } from 'lucide-react';
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
      {/* Header - Clean Design */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-start justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white font-medium text-sm bg-black/20 backdrop-blur-md px-4 py-2 rounded-full hover:bg-black/30 transition shadow-sm border border-white/10"
        >
          <LayoutGrid className="w-4 h-4" />
          Outros
        </button>

        <div className="flex flex-col items-end gap-2">
          <div className="bg-black/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-sm text-right">
            <p className="text-sm font-bold text-white leading-tight">{glass.name}</p>
            <p className="text-xs text-white/90 font-medium">{priceText}</p>
          </div>
        </div>
      </div>

      {/* 3D AR Viewer */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        <ARViewer3D glass={glass} />
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 flex justify-center bg-gradient-to-t from-black/70 to-transparent">
        <Button
          onClick={handleBuy}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-green-600/30 flex items-center gap-2 text-base"
        >
          <ShoppingCart className="w-5 h-5" />
          Comprar
        </Button>
      </div>
    </div>
  );
}
