import { useEffect, useRef, useCallback, useState } from 'react';
import { Loader2, Move, MousePointer2 } from 'lucide-react';
import type { ARModel, SmoothedFaceData, EditingPart } from '@/hooks/useARState';

// MediaPipe FaceMesh types
declare global {
  interface Window {
    FaceMesh: any;
  }
}

interface ARCameraProps {
  model: ARModel;
  editingPart: EditingPart;
  autoAnchors: boolean;
  isLoading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onVideoStarted: () => void;
  smoothedRef: React.MutableRefObject<SmoothedFaceData>;
  lastAnchorsRef: React.MutableRefObject<{ frame: { x: number; y: number }; ear: { x: number; y: number } } | null>;
  onUpdatePart: (partName: keyof ARModel['parts'], updates: Partial<ARModel['parts']['front']>) => void;
  onSnapAnchors: () => void;
  onPushHistory: () => void;
}

export default function ARCamera({
  model,
  editingPart,
  autoAnchors,
  isLoading,
  onLoadingChange,
  onVideoStarted,
  smoothedRef,
  lastAnchorsRef,
  onUpdatePart,
  onSnapAnchors,
  onPushHistory,
}: ARCameraProps) {
  // DEBUG: Verificar preço e telefone para o botão de WhatsApp
  // console.log('ARTryOnModal Debug:', { price: glass?.price, phone: storePhone });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const faceMeshRef = useRef<any>(null);
  const animationFrameRef = useRef<number>();


  const [showTemples, setShowTemples] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  const [cameraZoom, setCameraZoom] = useState(1.0); // 1.0 = 100% (original size)
  const [isRightClickDrag, setIsRightClickDrag] = useState(false); // Right-click temple drag mode
  const [debugError, setDebugError] = useState<string | null>(null); // DEBUG para iOS
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Lerp function for smooth interpolation
  const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

  // Initialize MediaPipe FaceMesh using Singleton Service
  const initFaceMesh = useCallback(async () => {
    try {
      setDebugError('Carregando MediaPipe...');
      const { faceMeshService } = await import('@/services/faceMeshService');

      setDebugError('Inicializando FaceMesh...');
      const faceMesh = await faceMeshService.getFaceMesh();

      faceMesh.onResults(onResults);
      faceMeshRef.current = faceMesh;

      setDebugError('Iniciando câmera...');
      await startVideo();
      setDebugError(null); // Sucesso!
    } catch (error: any) {
      console.error('Failed to init FaceMesh:', error);
      setDebugError(`Erro: ${error.message || 'Falha ao inicializar'}`);
      onLoadingChange(false);
    }
  }, []);

  // Start video stream
  const startVideo = async () => {
    try {
      // iOS Safari é mais restritivo com constraints
      // Tentar primeiro com constraints ideais
      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
        });
      } catch (firstError) {
        console.warn('Primeira tentativa falhou, tentando constraints simplificadas:', firstError);

        // Fallback para iOS: constraints mínimas
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
          });
        } catch (secondError) {
          console.warn('Segunda tentativa falhou, tentando sem facingMode:', secondError);

          // Último fallback: apenas vídeo sem constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
        }
      }

      if (!stream) {
        throw new Error('Não foi possível acessar a câmera');
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // iOS precisa de playsinline e autoplay
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        videoRef.current.muted = true;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout ao carregar vídeo'));
          }, 10000); // 10 segundos timeout

          if (videoRef.current!.readyState >= 2) {
            clearTimeout(timeout);
            resolve();
          } else {
            videoRef.current!.onloadeddata = () => {
              clearTimeout(timeout);
              resolve();
            };
            videoRef.current!.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('Erro ao carregar stream de vídeo'));
            };
          }
        });

        await videoRef.current.play();

        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
        }

        onLoadingChange(false);
        onVideoStarted();
        loop();
      }
    } catch (e: any) {
      console.error('Camera access error:', e);

      // Mensagem de erro mais específica para o usuário
      let errorMessage = 'Erro ao acessar câmera';
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        errorMessage = 'Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.';
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        errorMessage = 'Nenhuma câmera encontrada no dispositivo.';
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        errorMessage = 'Câmera está sendo usada por outro aplicativo.';
      }

      alert(errorMessage);
      onLoadingChange(false);
    }
  };

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
  }, [model, editingPart, autoAnchors]);

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

    // INTELLIGENT ROTATION: Allow minimal tilt only (±8 degrees max)
    let rawAngle = Math.atan2(dy, dx);
    const MAX_TILT_DEGREES = 8;
    const MAX_TILT_RADIANS = (MAX_TILT_DEGREES * Math.PI) / 180;
    const angle = Math.max(-MAX_TILT_RADIANS, Math.min(MAX_TILT_RADIANS, rawAngle));

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
    const f = 0.3; // Increased smoothing for better stability

    if (s.x === null) {
      Object.assign(s, target);
    } else {
      s.x = lerp(s.x, target.x, f);
      s.y = lerp(s.y!, target.y, f);
      s.w = lerp(s.w!, target.w, f);

      // Heavy smoothing for angle to prevent spinning
      s.angle = lerp(s.angle!, target.angle, 0.5); // Very high smoothing = very stable


      s.yaw = lerp(s.yaw!, target.yaw, 0.1);

      // Higher smoothing for jaw positions to keep temples stable
      const jawSmoothing = 0.4;
      s.jawLeft = {
        x: lerp(s.jawLeft!.x, target.jawLeft.x, jawSmoothing),
        y: lerp(s.jawLeft!.y, target.jawLeft.y, jawSmoothing),
      };
      s.jawRight = {
        x: lerp(s.jawRight!.x, target.jawRight.x, jawSmoothing),
        y: lerp(s.jawRight!.y, target.jawRight.y, jawSmoothing),
      };
    }

    const YAW_SENSITIVITY = 0.08;
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

    // Draw temples
    const drawTemple = (side: 'left' | 'right') => {
      const p = model.parts[side];
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

      // Store anchors for editing
      if (editingPart === side) {
        lastAnchorsRef.current = {
          frame: { x: w - posFrame.x, y: posFrame.y },
          ear: { x: w - posEar.x, y: posEar.y },
        };

        // Draw anchor points
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1.0;

        // Connecting line
        ctx.beginPath();
        ctx.moveTo(lastAnchorsRef.current.frame.x, lastAnchorsRef.current.frame.y);
        ctx.lineTo(lastAnchorsRef.current.ear.x, lastAnchorsRef.current.ear.y);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Frame anchor (blue)
        ctx.beginPath();
        ctx.arc(lastAnchorsRef.current.frame.x, lastAnchorsRef.current.frame.y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();

        // Ear anchor (green with ring)
        ctx.beginPath();
        ctx.arc(lastAnchorsRef.current.ear.x, lastAnchorsRef.current.ear.y, 7, 0, 2 * Math.PI);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(lastAnchorsRef.current.ear.x, lastAnchorsRef.current.ear.y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#22c55e';
        ctx.fill();

        ctx.restore();
      }
    };

    drawTemple('right');
    drawTemple('left');

    // Draw front frame
    const pFront = model.parts.front;
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
  }, [model, editingPart]);

  // Mouse/touch handlers for dragging
  const getMousePos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const checkHit = useCallback((x: number, y: number) => {
    if (!editingPart || !smoothedRef.current.x) return null;
    if (editingPart === 'front') return 'part';

    if ((editingPart === 'left' || editingPart === 'right') && lastAnchorsRef.current) {
      const anchors = lastAnchorsRef.current;
      const hitRadius = 12;

      const dx1 = x - anchors.frame.x;
      const dy1 = y - anchors.frame.y;
      if (Math.sqrt(dx1 * dx1 + dy1 * dy1) < hitRadius) return 'anchorFrame';

      const dx2 = x - anchors.ear.x;
      const dy2 = y - anchors.ear.y;
      if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < hitRadius) return 'anchorEar';
    }
    return null;
  }, [editingPart]);

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!editingPart) return;

    const pos = getMousePos(e);

    // Check if it's a right-click (button 2) on a temple
    const isRightClick = 'button' in e && e.button === 2;

    if (isRightClick && (editingPart === 'left' || editingPart === 'right')) {
      // Right-click on temple: enable free drag mode
      setIsDragging(true);
      setDragTarget('templeBody'); // Special target for whole temple drag
      setIsRightClickDrag(true);
      lastPosRef.current = pos;
      e.preventDefault();
      return;
    }

    // Normal left-click behavior for anchor points
    const target = checkHit(pos.x, pos.y);

    if (target) {
      setIsDragging(true);
      setDragTarget(target);
      setIsRightClickDrag(false);
      lastPosRef.current = pos;
      e.preventDefault();
    }
  }, [editingPart, getMousePos, checkHit]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const pos = getMousePos(e);

    if (!isDragging) {
      const hit = checkHit(pos.x, pos.y);
      setHoverTarget(hit);
      return;
    }

    if (!editingPart || !dragTarget) return;

    const dx = pos.x - lastPosRef.current.x;
    const dy = pos.y - lastPosRef.current.y;
    lastPosRef.current = pos;

    const faceWidth = smoothedRef.current.w || 100;
    const part = model.parts[editingPart];

    if (editingPart === 'front') {
      onUpdatePart('front', {
        x: part.x - dx / faceWidth,
        y: part.y + dy / faceWidth,
      });
      if (autoAnchors) onSnapAnchors();
    } else if (dragTarget === 'templeBody') {
      // Right-click drag: move entire temple (both anchors together)
      const ang = -(smoothedRef.current.angle || 0);
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      const mdx = -dx;
      const localDx = mdx * cos - dy * sin;
      const localDy = mdx * sin + dy * cos;
      const relDx = localDx / faceWidth;
      const relDy = localDy / faceWidth;

      // Move both anchors by the same amount
      onUpdatePart(editingPart, {
        anchorFrame: {
          x: part.anchorFrame.x + relDx,
          y: part.anchorFrame.y + relDy,
        },
        anchorEar: {
          x: part.anchorEar.x + relDx,
          y: part.anchorEar.y + relDy,
        },
      });
    } else if (dragTarget === 'anchorFrame' || dragTarget === 'anchorEar') {
      const ang = -(smoothedRef.current.angle || 0);
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      const mdx = -dx;
      const localDx = mdx * cos - dy * sin;
      const localDy = mdx * sin + dy * cos;
      const relDx = localDx / faceWidth;
      const relDy = localDy / faceWidth;

      if (dragTarget === 'anchorFrame') {
        onUpdatePart(editingPart, {
          anchorFrame: {
            x: part.anchorFrame.x + relDx,
            y: part.anchorFrame.y + relDy,
          },
        });
      } else {
        onUpdatePart(editingPart, {
          anchorEar: {
            x: part.anchorEar.x + relDx,
            y: part.anchorEar.y + relDy,
          },
        });
      }
    }
  }, [isDragging, dragTarget, editingPart, model, autoAnchors, getMousePos, checkHit, onUpdatePart, onSnapAnchors]);

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragTarget(null);
      setIsRightClickDrag(false);
      onPushHistory();
    }
  }, [isDragging, onPushHistory]);

  // Wheel zoom - camera only
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Always zoom the camera view (min 100%, max 300%)
    const delta = -Math.sign(e.deltaY) * 0.1;
    const newZoom = Math.min(Math.max(1.0, cameraZoom + delta), 3.0);
    setCameraZoom(newZoom);
  }, [cameraZoom]);

  // Initialize on mount
  useEffect(() => {
    initFaceMesh();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  // Update results handler when dependencies change
  useEffect(() => {
    if (faceMeshRef.current) {
      faceMeshRef.current.onResults(onResults);
    }
  }, [onResults]);

  // Prevent page scroll when mouse is over camera
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    wrapper.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      wrapper.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  const cursorStyle = hoverTarget === 'anchorFrame' || hoverTarget === 'anchorEar'
    ? 'crosshair'
    : isDragging
      ? 'grabbing'
      : 'default';

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div
        ref={wrapperRef}
        className="relative w-full max-w-[1024px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-200"
        style={{
          aspectRatio: '4/3',
          cursor: cursorStyle,
        }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-30">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-base font-semibold text-slate-600 animate-pulse">
              {debugError || 'Inicializando MediaPipe...'}
            </p>
          </div>
        )}

        {/* Debug Error Overlay - Sempre visível se houver erro */}
        {debugError && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 z-30 p-4">
            <div className="bg-white rounded-lg p-6 shadow-xl max-w-md">
              <h3 className="text-lg font-bold text-red-600 mb-2">Erro de Inicialização</h3>
              <p className="text-sm text-slate-700 mb-4">{debugError}</p>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        )}


        {/* Video (hidden, used as source) */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className="absolute top-0 left-0 w-full h-full object-contain opacity-0"
          style={{
            transform: `scaleX(-1) scale(${cameraZoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out'
          }}
        />

        {/* Output canvas */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full object-contain"
          style={{
            transform: `scale(${cameraZoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out'
          }}
        />

        {/* Editing overlay hints */}
        {editingPart && !isLoading && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 text-center shadow-sm flex gap-2 text-xs font-medium text-white/90">
              {editingPart === 'front' ? (
                <>
                  <Move className="w-4 h-4 text-blue-300" />
                  <span>Arraste para mover</span>
                </>
              ) : (
                <>
                  <MousePointer2 className="w-4 h-4 text-blue-300" />
                  <span>Ajuste as âncoras</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="flex items-center gap-4 text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm text-sm">
        <span>Use o <b>scroll</b> para zoom da câmera • <b>Arraste</b> para ajustar posição</span>
        {cameraZoom !== 1.0 && (
          <span className="text-blue-600 font-bold">
            Zoom: {Math.round(cameraZoom * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
