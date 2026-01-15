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
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Lerp function for smooth interpolation
  const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

  // Initialize MediaPipe FaceMesh
  const initFaceMesh = useCallback(async () => {
    // Load MediaPipe script dynamically
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

    await startVideo();
  }, []);

  // Start video stream
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });

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

        onLoadingChange(false);
        onVideoStarted();
        loop();
      }
    } catch (e) {
      console.error('Camera access error:', e);
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
      Object.assign(s, target);
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

    // Draw temples
    const drawTemple = (side: 'left' | 'right') => {
      const p = model.parts[side];
      if (!p.img || !isLookingSide) return;

      const HIDE_THRESHOLD = 0.03;
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
    const target = checkHit(pos.x, pos.y);

    if (target) {
      setIsDragging(true);
      setDragTarget(target);
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
      onPushHistory();
    }
  }, [isDragging, onPushHistory]);

  // Wheel zoom - camera only
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Always zoom the camera view (min 100%, max 170%)
    const delta = -Math.sign(e.deltaY) * 0.1;
    const newZoom = Math.min(Math.max(1.0, cameraZoom + delta), 1.7);
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
        className="relative w-full max-w-[720px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-200"
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
              Inicializando MediaPipe...
            </p>
          </div>
        )}

        {/* Video (hidden, used as source) */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className="absolute top-0 left-0 w-full h-full object-cover opacity-0"
          style={{
            transform: `scaleX(-1) scale(${cameraZoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out'
          }}
        />

        {/* Output canvas */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full object-cover"
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
