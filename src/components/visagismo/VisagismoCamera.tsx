import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Sparkles } from 'lucide-react';
import { FaceAnalysis } from '@/types/visagismo';
import { analyzeFaceShape } from '@/utils/faceAnalyzer';

// MediaPipe FaceMesh types
declare global {
  interface Window {
    FaceMesh: any;
  }
}

interface VisagismoCameraProps {
  onCapture: (analysis: FaceAnalysis) => void;
  onBack: () => void;
}

export default function VisagismoCamera({ onCapture, onBack }: VisagismoCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [lastLandmarks, setLastLandmarks] = useState<any>(null);
  const [faceDetected, setFaceDetected] = useState(false);

  useEffect(() => {
    initializeCamera();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
    }
  };

  const initializeCamera = async () => {
    try {
      await initializeFaceMesh();
      await startVideo();
    } catch (err) {
      console.error('Erro ao inicializar câmera:', err);
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
      setIsLoading(false);
    }
  };

  const initializeFaceMesh = async () => {
    if (!window.FaceMesh) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load FaceMesh'));
        document.head.appendChild(script);
      });
    }

    const faceMesh = new window.FaceMesh({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      },
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);
    faceMeshRef.current = faceMesh;
  };

  const startVideo = async () => {
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

        setCameraReady(true);
        setIsLoading(false);
        loop();
      }
    } catch (e) {
      console.error('Erro ao acessar câmera:', e);
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
      setIsLoading(false);
    }
  };

  const loop = async () => {
    if (!videoRef.current || !faceMeshRef.current) return;
    await faceMeshRef.current.send({ image: videoRef.current });
    animationFrameRef.current = requestAnimationFrame(loop);
  };

  const onResults = (results: any) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    const hasFace = results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0;
    setFaceDetected(hasFace);

    if (hasFace) {
      const landmarks = results.multiFaceLandmarks[0];
      setLastLandmarks(landmarks);

      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      const faceContour = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
        397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
        172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
      ];

      const leftEye = [
        33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7
      ];

      const rightEye = [
        263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249
      ];

      const lips = [
        61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
        375, 321, 405, 314, 17, 84, 181, 91, 146
      ];

      ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      faceContour.forEach((idx, i) => {
        const point = landmarks[idx];
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      leftEye.forEach((idx, i) => {
        const point = landmarks[idx];
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      rightEye.forEach((idx, i) => {
        const point = landmarks[idx];
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      lips.forEach((idx, i) => {
        const point = landmarks[idx];
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.closePath();
      ctx.stroke();

      const keyPoints = [10, 152, 234, 454, 33, 263, 1];

      ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
      keyPoints.forEach(idx => {
        const point = landmarks[idx];
        const x = point.x * canvas.width;
        const y = point.y * canvas.height;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });

      ctx.restore();
    }
  };

  const handleCapture = async () => {
    if (!lastLandmarks || !canvasRef.current) {
      setError('Nenhum rosto detectado. Posicione seu rosto no centro.');
      return;
    }

    try {
      setIsAnalyzing(true);

      const canvas = canvasRef.current;
      const width = canvas.width;
      const height = canvas.height;

      const analysis = analyzeFaceShape(lastLandmarks, width, height);

      await new Promise(resolve => setTimeout(resolve, 1500));

      setIsAnalyzing(false);
      onCapture(analysis);
    } catch (err) {
      console.error('Erro ao analisar:', err);
      setError('Erro ao processar imagem. Tente novamente.');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Camera Preview - Fullscreen on mobile */}
      <div className="relative w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl" style={{ minHeight: '70vh', maxHeight: '80vh' }}>
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          autoPlay
          muted
          style={{ transform: 'scaleX(-1)' }}
        />

        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />

        {/* Face detection indicator - Larger and more visible */}
        {cameraReady && !isAnalyzing && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg">
            <div className={`w-2.5 h-2.5 rounded-full ${faceDetected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-white text-sm font-semibold">
              {faceDetected ? 'Rosto detectado' : 'Procurando rosto...'}
            </span>
          </div>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white">
            <Loader2 className="w-14 h-14 animate-spin mb-4" />
            <p className="text-base font-medium">Inicializando câmera...</p>
          </div>
        )}

        {/* Analyzing overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white">
            <Sparkles className="w-14 h-14 animate-pulse mb-4 text-blue-400" />
            <p className="text-xl font-bold mb-2">Analisando seu rosto...</p>
            <p className="text-sm text-slate-300">Identificando formato e proporções</p>
          </div>
        )}

        {/* Error overlay */}
        {error && !isAnalyzing && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white p-6 text-center">
            <p className="text-sm mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                onBack();
              }}
              className="px-6 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Instructions overlay - Bottom */}
        {cameraReady && !error && !isAnalyzing && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-6 pb-8">
            <p className="text-center text-white text-sm font-medium mb-4">
              {faceDetected
                ? '✓ Perfeito! Seu rosto está posicionado corretamente.'
                : 'Posicione seu rosto no centro da câmera'}
            </p>
          </div>
        )}
      </div>

      {/* Analyze Button - Fixed at bottom, always visible */}
      {cameraReady && !error && !isAnalyzing && (
        <div className="mt-4 w-full">
          <button
            onClick={handleCapture}
            disabled={!faceDetected || isAnalyzing}
            className="w-full px-6 py-4 bg-slate-900 text-white text-base font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg disabled:shadow-none"
          >
            <Sparkles className="w-5 h-5" />
            Analisar Rosto
          </button>
        </div>
      )}
    </div>
  );
}
