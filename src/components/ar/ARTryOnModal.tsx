import { useEffect, useRef, useCallback, useState } from 'react';
import { X, ShoppingCart, ArrowLeft, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

// MediaPipe FaceMesh types
declare global {
  interface Window {
    FaceMesh: any;
  }
}

interface SmoothedData {
  x: number | null;
  y: number | null;
  w: number | null;
  angle: number | null;
  yaw: number | null;
  jawLeft: { x: number; y: number } | null;
  jawRight: { x: number; y: number } | null;
}

interface PartConfig {
  img: HTMLImageElement | null;
  x: number;
  y: number;
  scale: number;
  anchorFrame: { x: number; y: number };
  anchorEar: { x: number; y: number };
}

export default function ARTryOnModal({ glass, isOpen, onClose, storePhone }: ARTryOnModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceMeshRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [showTemples, setShowTemples] = useState(false);

  const smoothedRef = useRef<SmoothedData>({
    x: null, y: null, w: null, angle: null, yaw: null,
    jawLeft: null, jawRight: null,
  });

  const modelRef = useRef<{
    front: PartConfig;
    left: PartConfig;
    right: PartConfig;
  }>({
    front: { img: null, x: 0, y: 0, scale: 1.0, anchorFrame: { x: 0, y: 0 }, anchorEar: { x: 0, y: 0 } },
    left: { img: null, x: 0, y: 0, scale: 1.0, anchorFrame: { x: -0.5, y: 0 }, anchorEar: { x: 0, y: 0 } },
    right: { img: null, x: 0, y: 0, scale: 1.0, anchorFrame: { x: 0.5, y: 0 }, anchorEar: { x: 0, y: 0 } },
  });

  const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

  // Load glasses images from config
  const loadGlassesConfig = useCallback(async (config: ARConfig) => {
    const loadImage = (url: string): Promise<HTMLImageElement | null> => {
      return new Promise((resolve) => {
        if (!url) return resolve(null);
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };

    const [imgFront, imgLeft, imgRight] = await Promise.all([
      loadImage(config.front || ''),
      loadImage(config.left || ''),
      loadImage(config.right || ''),
    ]);

    if (imgFront) {
      modelRef.current.front.img = imgFront;
      if (config.frontParams) {
        modelRef.current.front.x = config.frontParams.x;
        modelRef.current.front.y = config.frontParams.y;
        modelRef.current.front.scale = config.frontParams.scale;
      }
    }

    if (imgLeft) {
      modelRef.current.left.img = imgLeft;
      if (config.leftParams) {
        Object.assign(modelRef.current.left, config.leftParams);
      }
    }

    if (imgRight) {
      modelRef.current.right.img = imgRight;
      if (config.rightParams) {
        Object.assign(modelRef.current.right, config.rightParams);
      }
    }
  }, []);

  // Initialize MediaPipe FaceMesh
  const initFaceMesh = useCallback(async () => {
    if (!window.FaceMesh) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
      script.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load MediaPipe'));
        document.head.appendChild(script);
      });
    }

    const faceMesh = new window.FaceMesh({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);
    faceMeshRef.current = faceMesh;
  }, []);

  // Start video stream
  const startVideo = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          if (videoRef.current!.readyState >= 2) {
            resolve();
          } else {
            videoRef.current!.onloadeddata = () => resolve();
          }
        });
        await videoRef.current.play();

        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }

        setIsLoading(false);
        loop();
      }
    } catch (e) {
      console.error('Camera access error:', e);
      setIsLoading(false);
    }
  }, []);

  // Main render loop
  const loop = async () => {
    if (!videoRef.current || !faceMeshRef.current) return;
    await faceMeshRef.current.send({ image: videoRef.current });
    animationFrameRef.current = requestAnimationFrame(loop);
  };

  // Process face mesh results
  const onResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      renderGlasses(ctx, results.multiFaceLandmarks[0], canvas.width, canvas.height);
    }

    ctx.restore();
  }, []);

  // Render glasses on face
  const renderGlasses = useCallback((
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    w: number,
    h: number
  ) => {
    const getPoint = (idx: number) => ({
      x: landmarks[idx].x * w,
      y: landmarks[idx].y * h,
    });

    const noseTop = getPoint(168);
    const lEyeOut = getPoint(33);
    const rEyeOut = getPoint(263);
    const jawLeft = getPoint(234);
    const jawRight = getPoint(454);

    const dx = rEyeOut.x - lEyeOut.x;
    const dy = rEyeOut.y - lEyeOut.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const midX = (lEyeOut.x + rEyeOut.x) / 2;
    const yaw = (getPoint(1).x - midX) / dist;

    const target = {
      x: noseTop.x,
      y: noseTop.y + dist * 0.1,
      w: dist * 2.3,
      angle,
      yaw,
      jawLeft,
      jawRight,
    };

    const s = smoothedRef.current;
    const f = 0.2;

    if (s.x === null) {
      s.x = target.x;
      s.y = target.y;
      s.w = target.w;
      s.angle = target.angle;
      s.yaw = target.yaw;
      s.jawLeft = target.jawLeft;
      s.jawRight = target.jawRight;
    } else {
      s.x = lerp(s.x, target.x, f);
      s.y = lerp(s.y!, target.y, f);
      s.w = lerp(s.w!, target.w, f);
      s.angle = lerp(s.angle!, target.angle, f);
      s.yaw = lerp(s.yaw!, target.yaw, 0.1);
      s.jawLeft = {
        x: lerp(s.jawLeft!.x, target.jawLeft.x, f),
        y: lerp(s.jawLeft!.y, target.jawLeft.y, f),
      };
      s.jawRight = {
        x: lerp(s.jawRight!.x, target.jawRight.x, f),
        y: lerp(s.jawRight!.y, target.jawRight.y, f),
      };
    }

    const YAW_SENSITIVITY = 0.04;
    const isLookingSide = Math.abs(s.yaw!) > YAW_SENSITIVITY;
    setShowTemples(isLookingSide);

    const toPx = (relVal: number) => relVal * s.w!;
    const transformPoint = (baseX: number, baseY: number, relOffsetX: number, relOffsetY: number) => {
      const offsetX = toPx(relOffsetX);
      const offsetY = toPx(relOffsetY);
      const cos = Math.cos(s.angle!);
      const sin = Math.sin(s.angle!);
      const rotX = offsetX * cos - offsetY * sin;
      const rotY = offsetX * sin + offsetY * cos;
      return { x: baseX + rotX, y: baseY + rotY };
    };

    const model = modelRef.current;

    // Draw temples
    const drawTemple = (side: 'left' | 'right') => {
      const p = model[side];
      if (!p.img || !isLookingSide) return;

      const HIDE_THRESHOLD = 0.08;
      let opacity = 1.0;
      if (side === 'left' && s.yaw! < -HIDE_THRESHOLD) opacity = 0;
      if (side === 'right' && s.yaw! > HIDE_THRESHOLD) opacity = 0;
      if (opacity <= 0.01) return;

      const posFrame = transformPoint(s.x!, s.y!, p.anchorFrame.x, p.anchorFrame.y);
      const baseJaw = side === 'left' ? s.jawLeft! : s.jawRight!;
      const posEar = transformPoint(baseJaw.x, baseJaw.y, p.anchorEar.x, p.anchorEar.y);

      const dX = posEar.x - posFrame.x;
      const dY = posEar.y - posFrame.y;
      const len = Math.sqrt(dX * dX + dY * dY);
      const ang = Math.atan2(dY, dX);
      const thickness = (s.w! * 0.1) * p.scale;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;
      ctx.translate(posFrame.x, posFrame.y);
      ctx.rotate(ang);

      if (side === 'left' && Math.abs(ang) > Math.PI / 2) {
        ctx.scale(1, -1);
      }

      // Draw temple with top edge aligned to guide line (Y=0)
      ctx.drawImage(p.img, 0, 0, len, thickness);
      ctx.restore();
    };

    drawTemple('right');
    drawTemple('left');

    // Draw front frame
    const pFront = model.front;
    if (pFront.img) {
      const ratio = pFront.img.width / pFront.img.height;
      const baseW = s.w! * pFront.scale;
      const baseH = baseW / ratio;
      const pos = transformPoint(s.x!, s.y!, pFront.x, pFront.y);

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 15;
      ctx.translate(pos.x, pos.y);
      ctx.rotate(s.angle!);
      ctx.drawImage(pFront.img, -baseW / 2, -baseH / 2, baseW, baseH);
      ctx.restore();
    }
  }, []);

  // Stop camera and cleanup
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    // Reset smoothed data
    smoothedRef.current = {
      x: null, y: null, w: null, angle: null, yaw: null,
      jawLeft: null, jawRight: null,
    };
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  // Handle buy button
  const handleBuy = useCallback(() => {
    if (glass?.buy_link) {
      window.open(glass.buy_link, '_blank');
    } else if (storePhone && glass) {
      const message = encodeURIComponent(`Olá! Quero o modelo ${glass.name}`);
      window.open(`https://wa.me/${storePhone.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
  }, [glass, storePhone]);

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen && glass?.ar_config) {
      setIsLoading(true);

      const init = async () => {
        await loadGlassesConfig(glass.ar_config);
        await initFaceMesh();
        await startVideo();
      };

      init();
    }

    return () => {
      if (!isOpen) {
        cleanup();
      }
    };
  }, [isOpen, glass]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
  }, [isOpen, cleanup]);

  // Handle back button
  useEffect(() => {
    if (!isOpen) return;

    const handlePopState = () => {
      handleClose();
    };

    window.history.pushState({ view: 'tryon' }, 'Provador', '#provador');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, handleClose]);

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
      {/* Header - Clean Design */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-start justify-between">
        <button
          onClick={handleClose}
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

      {/* Camera View */}
      <div className="flex-1 relative flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-30">
            <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-4" />
            <p className="text-base font-semibold text-slate-300 animate-pulse">
              Inicializando câmera...
            </p>
          </div>
        )}

        <video
          ref={videoRef}
          className="absolute w-full h-full object-cover opacity-0"
          playsInline
          muted
          style={{ transform: 'scaleX(-1)' }}
        />

        <canvas
          ref={canvasRef}
          className="absolute w-full h-full object-cover"
        />
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
