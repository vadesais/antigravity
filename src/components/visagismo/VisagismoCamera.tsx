import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
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

  const lastLandmarksRef = useRef<any>(null);

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
      lastLandmarksRef.current = landmarks; // Update ref for stable capturing

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

  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-capture logic
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (cameraReady && faceDetected && !isAnalyzing && !isSuccess && !error) {
      // Wait 1.2s of stability before triggering
      timeout = setTimeout(() => {
        handleCapture();
      }, 1200);
    }

    return () => clearTimeout(timeout);
  }, [cameraReady, faceDetected, isAnalyzing, isSuccess, error]);

  const handleCapture = async () => {
    if (!lastLandmarksRef.current || !canvasRef.current || isAnalyzing || isSuccess) {
      return;
    }

    try {
      setIsAnalyzing(true);
      const samples: any[] = [];
      const startTime = Date.now();
      const ANALYSIS_DURATION = 1500; // 1.5 seconds analysis

      // Sampling loop
      while (Date.now() - startTime < ANALYSIS_DURATION) {
        if (lastLandmarksRef.current) {
          samples.push(JSON.parse(JSON.stringify(lastLandmarksRef.current)));
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (samples.length === 0) throw new Error("Could not collect face data");

      // Compute Average Landmarks
      const numPoints = 468;
      const averagedLandmarks = new Array(numPoints).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));

      for (const sample of samples) {
        for (let i = 0; i < numPoints; i++) {
          averagedLandmarks[i].x += sample[i].x;
          averagedLandmarks[i].y += sample[i].y;
          averagedLandmarks[i].z += sample[i].z;
        }
      }

      for (let i = 0; i < numPoints; i++) {
        averagedLandmarks[i].x /= samples.length;
        averagedLandmarks[i].y /= samples.length;
        averagedLandmarks[i].z /= samples.length;
      }

      const canvas = canvasRef.current;
      const width = canvas.width;
      const height = canvas.height;

      const analysis = analyzeFaceShape(averagedLandmarks, width, height);

      setIsAnalyzing(false);
      setIsSuccess(true); // Show success state

      // Wait 1s before redirect
      setTimeout(() => {
        onCapture(analysis);
      }, 1000);

    } catch (err) {
      console.error('Erro ao analisar:', err);
      setError('Erro ao processar imagem. Tente novamente.');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Camera Preview - Fullscreen on mobile */}
      <div className="relative w-full flex-1 bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
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

        {/* Face Positioning Mold Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* SVG Face Guide */}
          <div className={`relative transition-all duration-700 ${faceDetected ? 'scale-105 opacity-40' : 'scale-100 opacity-100'}`}>
            <svg width="240" height="300" viewBox="0 0 240 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Natural Face Outline (Narrower chin, wider forehead) */}
              <path
                d="M120 20 C 180 20, 220 70, 220 140 C 220 230, 180 280, 120 280 C 60 280, 20 230, 20 140 C 20 70, 60 20, 120 20 Z"
                stroke="white"
                strokeWidth="2.5"
                strokeDasharray="10 6"
                className="opacity-90 shadow-sm"
              />

              {/* Stronger Corners/Guides */}
              {/* Top Markers (Forehead) */}
              <path d="M70 20 H 120 H 170" stroke="white" strokeWidth="4" strokeLinecap="round" className="opacity-100 drop-shadow-md" />

              {/* Chin Marker */}
              <path d="M90 280 H 120 H 150" stroke="white" strokeWidth="4" strokeLinecap="round" className="opacity-100 drop-shadow-md" />

              {/* Side Cheek Markers */}
              <path d="M20 120 V 160" stroke="white" strokeWidth="4" strokeLinecap="round" className="opacity-100 drop-shadow-md" />
              <path d="M220 120 V 160" stroke="white" strokeWidth="4" strokeLinecap="round" className="opacity-100 drop-shadow-md" />

              {/* Scanning Line Animation */}
              <circle cx="120" cy="150" r="100" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            </svg>

            {/* Central Scanning Effect */}
            {!faceDetected && (
              <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500/90 shadow-[0_0_20px_rgba(99,102,241,1)] animate-[scan_2s_ease-in-out_infinite]" />
            )}
          </div>
        </div>

        {/* Status Pills */}
        <div className="absolute top-6 left-0 right-0 flex justify-center">
          {cameraReady && !isAnalyzing && !isSuccess && (
            <div className={`
                    flex items-center gap-2 px-5 py-2.5 rounded-full backdrop-blur-xl border transition-all duration-500
                    ${faceDetected
                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100'
                : 'bg-white/10 border-white/20 text-white'}
                `}>
              <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-white/50'}`} />
              <span className="text-sm font-medium tracking-wide">
                {faceDetected ? 'Mantenha o rosto parado...' : 'Aguardando Rosto...'}
              </span>
            </div>
          )}
        </div>

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

        {/* Success overlay */}
        {isSuccess && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(34,197,94,0.6)]">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <p className="text-2xl font-bold mb-2">Análise Concluída!</p>
            <p className="text-sm text-slate-300">Redirecionando...</p>
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
        {cameraReady && !error && !isAnalyzing && !isSuccess && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-6 pb-8">
            <p className="text-center text-white text-sm font-medium mb-4 opacity-80">
              {faceDetected
                ? 'Permaneça imóvel para iniciar...'
                : 'Posicione seu rosto dentro do molde'}
            </p>
          </div>
        )}
      </div>

      {/* Removed Manual Button since it's auto-capture now */}
    </div>
  );
}
