import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { Loader2, Glasses } from 'lucide-react';
import { faceMeshService } from '@/services/faceMeshService';

interface ARViewer3DProps {
    glass: any; // Using any for flexibility with the glass object structure
}

const ARViewer3D: React.FC<ARViewer3DProps> = ({ glass }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    useEffect(() => {
        if (!glass) return;

        setIsLoading(true);

        // === 3D ENGINE STATE (THREE.JS) ===
        const state3D: any = {
            scene: null,
            camera: null,
            renderer: null,
            glassesGroup: null,
            occluderMesh: null,
            textures: { front: null, temple: null },
            params: {
                scale: 1.95, x: 0.0, y: 0.00, z: -0.3,
                opening: 10, curvature: 0, tilt: 0,
                rotation: 0,
                templeX: 1.55, templeY: 0.21, templeZ: 0.0,
                templeScale: 1.0, templeLength: 1.0
            },
            currentPos: new THREE.Vector3(),
            currentQuat: new THREE.Quaternion(),
            isTracking: false,
        };

        let faceMesh: any;
        let animationId: number;
        let stream: MediaStream | null = null;

        // === 1. INICIALIZAÇÃO ===
        async function init() {
            // Merge saved config with defaults
            if (glass.ar_config) {
                const config = glass.ar_config;
                state3D.params = { ...state3D.params, ...config };
            }

            // Init 3D Scene immediately
            initThreeJS();

            // Parallel loading: FaceMesh (Singleton), Textures, Camera
            try {
                // SINGLETON: Get the pre-warmed instance!
                const faceMeshPromise = faceMeshService.getFaceMesh().then(fm => {
                    fm.onResults(onFaceResults); // Re-attach callback for this component
                    return fm;
                });

                const texturesPromise = loadTextures();

                const cameraPromise = navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    }
                });

                // Wait for all critical resources
                const [fmInstance, _, camStream] = await Promise.all([
                    faceMeshPromise,
                    texturesPromise,
                    cameraPromise
                ]);

                faceMesh = fmInstance;
                stream = camStream;

                // Setup resize observer
                const resizeObserver = new ResizeObserver(() => handleResize());
                if (containerRef.current) resizeObserver.observe(containerRef.current);
                handleResize();

                // Start Video & Loop
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await new Promise(resolve => {
                        if (videoRef.current!.readyState >= 2) {
                            resolve(true);
                        } else {
                            videoRef.current!.onloadeddata = () => resolve(true);
                        }
                    });

                    try {
                        await videoRef.current.play();
                    } catch (playError) {
                        console.error("Erro ao iniciar reprodução do vídeo:", playError);
                    }

                    // SAFETY TIMEOUT: Increased to 15s to allow for slow first-time downloads
                    setTimeout(() => {
                        if (isLoading) setIsLoading(false);
                    }, 15000);

                    const loop = async () => {
                        if (videoRef.current && videoRef.current.readyState >= 2) {
                            await faceMesh.send({ image: videoRef.current });
                        }
                        animationId = requestAnimationFrame(loop);
                    };
                    loop();
                }

            } catch (e) {
                console.error("Erro na inicialização AR:", e);
                setIsLoading(false); // Disable loading even on error to show something or error state
            }
        }

        async function loadTextures() {
            const promises = [];

            // Load Front Image
            if (glass.image_url) {
                promises.push(new Promise<void>(async (resolve) => {
                    try {
                        const img = new Image();
                        img.crossOrigin = 'Anonymous';
                        img.src = glass.image_url;
                        await new Promise((r) => { img.onload = r; img.onerror = r; });

                        // OPTIMIZE IMAGE (Crop transparency to match Editor)
                        const optimizedSrc = processAndOptimizeImage(img);
                        const optimizedImg = new Image();
                        optimizedImg.src = optimizedSrc;
                        await new Promise((r) => { optimizedImg.onload = r; optimizedImg.onerror = r; });

                        const texture = new THREE.Texture(optimizedImg);
                        texture.colorSpace = THREE.SRGBColorSpace;
                        texture.minFilter = THREE.LinearMipmapLinearFilter;
                        texture.magFilter = THREE.LinearFilter;
                        texture.generateMipmaps = true;
                        texture.needsUpdate = true;
                        state3D.textures.front = texture;
                    } catch (e) {
                        console.error("Error loading front image", e);
                    }
                    resolve();
                }));
            }

            // Load Temple Image
            if (glass.ar_config && glass.ar_config.temple_url) {
                promises.push(new Promise<void>(async (resolve) => {
                    try {
                        const img = new Image();
                        img.crossOrigin = 'Anonymous';
                        img.src = glass.ar_config.temple_url;
                        await new Promise((r) => { img.onload = r; img.onerror = r; });

                        const texture = new THREE.Texture(img);
                        texture.colorSpace = THREE.SRGBColorSpace;
                        texture.minFilter = THREE.LinearMipmapLinearFilter;
                        texture.magFilter = THREE.LinearFilter;
                        texture.generateMipmaps = true;
                        texture.needsUpdate = true;
                        state3D.textures.temple = texture;
                    } catch (e) {
                        console.error("Error loading temple image", e);
                    }
                    resolve();
                }));
            }

            await Promise.all(promises);
            createGlassesMeshes();
        }

        function handleResize() {
            if (!state3D.renderer || !state3D.camera || !containerRef.current) return;
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;

            state3D.camera.aspect = width / height;
            state3D.camera.updateProjectionMatrix();
            state3D.renderer.setSize(width, height);
        }

        function initThreeJS() {
            if (!containerRef.current || !canvasRef.current) return;
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;

            state3D.scene = new THREE.Scene();
            const fov = 45;
            state3D.camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
            state3D.camera.position.z = 20;

            state3D.renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true });
            state3D.renderer.setSize(width, height);
            state3D.renderer.setPixelRatio(window.devicePixelRatio);
            state3D.renderer.outputColorSpace = THREE.SRGBColorSpace;
            state3D.renderer.toneMapping = THREE.ACESFilmicToneMapping;

            const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
            state3D.scene.add(ambientLight);
            const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
            dirLight.position.set(0, 10, 10);
            state3D.scene.add(dirLight);

            // Occluder (Head mask)
            const headGeo = new THREE.CylinderGeometry(3.2, 3.2, 9, 32);
            headGeo.applyMatrix4(new THREE.Matrix4().makeScale(0.75, 1, 0.85));
            const occluderMat = new THREE.MeshBasicMaterial({ color: 0x000000, colorWrite: false });
            state3D.occluderMesh = new THREE.Mesh(headGeo, occluderMat);
            state3D.occluderMesh.renderOrder = 0;
            state3D.scene.add(state3D.occluderMesh);

            state3D.glassesGroup = new THREE.Group();
            state3D.glassesGroup.renderOrder = 1;
            state3D.scene.add(state3D.glassesGroup);
        }

        function createGlassesMeshes() {
            while (state3D.glassesGroup.children.length > 0) {
                state3D.glassesGroup.remove(state3D.glassesGroup.children[0]);
            }

            const hasFront = !!state3D.textures.front;
            const hasTemple = !!state3D.textures.temple;

            const matFront = new THREE.MeshBasicMaterial({
                map: state3D.textures.front || null,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: true,
                alphaTest: 0.1,
                opacity: hasFront ? 1 : 0,
                visible: hasFront
            });

            const matTemple = new THREE.MeshBasicMaterial({
                map: state3D.textures.temple || null,
                transparent: true,
                side: THREE.BackSide,
                alphaTest: 0.1,
                opacity: hasTemple ? 1 : 0,
                visible: hasTemple
            });

            // Front Geometry
            let frontRatio = 2;
            if (state3D.textures.front && state3D.textures.front.image) {
                const img = state3D.textures.front.image;
                if (img.height > 0) frontRatio = img.width / img.height;
            }
            const frontGeo = new THREE.PlaneGeometry(3.2, 3.2 / frontRatio, 32, 1);
            const frontMesh = new THREE.Mesh(frontGeo, matFront);
            frontMesh.name = "front";
            frontMesh.renderOrder = 1;
            state3D.glassesGroup.add(frontMesh);

            // Temple Geometry
            // IMPORTANT: Calculate ratio based on temple texture to match Editor
            let templeRatio = 5; // Default fallback
            if (state3D.textures.temple && state3D.textures.temple.image) {
                const img = state3D.textures.temple.image;
                if (img.height > 0) templeRatio = img.width / img.height;
            }

            const templeGeo = new THREE.PlaneGeometry(2, 2 / templeRatio);
            templeGeo.translate(1.0, 0, 0);

            const leftTemple = new THREE.Mesh(templeGeo, matTemple);
            leftTemple.name = "leftTemple";
            leftTemple.position.set(-state3D.params.templeX, state3D.params.templeY, state3D.params.templeZ);
            leftTemple.rotation.y = Math.PI / 2;
            leftTemple.scale.set(-1, 1, 1);
            leftTemple.renderOrder = 2;
            state3D.glassesGroup.add(leftTemple);

            const rightTemple = new THREE.Mesh(templeGeo, matTemple);
            rightTemple.name = "rightTemple";
            rightTemple.position.set(state3D.params.templeX, state3D.params.templeY, state3D.params.templeZ);
            rightTemple.rotation.y = -Math.PI / 2;
            rightTemple.renderOrder = 2;
            state3D.glassesGroup.add(rightTemple);
        }

        function onFaceResults(results: any) {
            if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0 || !containerRef.current || !videoRef.current) {
                state3D.renderer.render(state3D.scene, state3D.camera);
                return;
            }

            const landmarks = results.multiFaceLandmarks[0];
            const video = videoRef.current;
            const container = containerRef.current;
            const videoRatio = video.videoWidth / video.videoHeight;
            const containerRatio = container.clientWidth / container.clientHeight;

            let displayWidth, displayHeight;
            if (containerRatio > videoRatio) {
                displayWidth = container.clientWidth;
                displayHeight = container.clientWidth / videoRatio;
            } else {
                displayHeight = container.clientHeight;
                displayWidth = container.clientHeight * videoRatio;
            }

            const getVec = (idx: number) => {
                const dist = state3D.camera.position.z;
                const vFov = state3D.camera.fov * Math.PI / 180;
                const visibleHeight = 2 * Math.tan(vFov / 2) * dist;
                const pixelsPerUnit = container.clientHeight / visibleHeight;
                const pixelX = (landmarks[idx].x - 0.5) * displayWidth;
                const pixelY = -(landmarks[idx].y - 0.5) * displayHeight;
                const x = pixelX / pixelsPerUnit;
                const y = pixelY / pixelsPerUnit;
                const z = -landmarks[idx].z * (displayWidth / pixelsPerUnit);
                return new THREE.Vector3(x, y, z);
            };

            const nose = getVec(168);
            const leftEye = getVec(33);
            const rightEye = getVec(263);
            const chin = getVec(152);

            const vecX = new THREE.Vector3().subVectors(rightEye, leftEye).normalize();
            const vecY = new THREE.Vector3().subVectors(nose, chin).normalize();
            const vecZ = new THREE.Vector3().crossVectors(vecX, vecY).normalize();

            vecZ.negate();
            const vecX_ortho = new THREE.Vector3().crossVectors(vecY, vecZ).normalize();

            const matrix = new THREE.Matrix4();
            matrix.makeBasis(vecX_ortho, vecY, vecZ);
            const targetQuat = new THREE.Quaternion().setFromRotationMatrix(matrix);

            const smoothFactor = 0.3;

            if (!state3D.isTracking) {
                state3D.currentPos.copy(nose);
                state3D.currentQuat.copy(targetQuat);
                state3D.isTracking = true;
                state3D.trackingFrames = 0; // Reset counter on first lock
            } else {
                state3D.currentPos.lerp(nose, smoothFactor);
                state3D.currentQuat.slerp(targetQuat, smoothFactor);

                // STABILIZATION BUFFER: Count successful tracking frames
                state3D.trackingFrames = (state3D.trackingFrames || 0) + 1;
            }

            // SMART LOADING: ONLY dismiss loader after 10 frames of stable tracking (approx 200ms)
            // AND ensure we actually have meshes to show
            if (isLoading && state3D.trackingFrames > 10) {
                const hasMeshes = state3D.glassesGroup.children.length > 0;
                if (hasMeshes) {
                    setIsLoading(false);
                }
            }

            state3D.glassesGroup.position.copy(state3D.currentPos);
            state3D.glassesGroup.setRotationFromQuaternion(state3D.currentQuat);

            state3D.occluderMesh.position.copy(state3D.currentPos);
            state3D.occluderMesh.setRotationFromQuaternion(state3D.currentQuat);
            state3D.occluderMesh.translateZ(12);
            state3D.occluderMesh.translateY(-1);

            const eyeDist = leftEye.distanceTo(rightEye);
            const baseScale = eyeDist / 4.0;
            const finalScale = baseScale * state3D.params.scale;

            const currentScale = state3D.glassesGroup.scale.x;
            const smoothScale = currentScale + (finalScale - currentScale) * smoothFactor;

            state3D.glassesGroup.scale.set(smoothScale, smoothScale, smoothScale);
            state3D.occluderMesh.scale.set(baseScale, baseScale, baseScale);

            state3D.glassesGroup.translateX(state3D.params.x);
            state3D.glassesGroup.translateY(state3D.params.y);
            state3D.glassesGroup.translateZ(state3D.params.z);

            // Apply Mesh Deformations (Curvature, Temple positions in local space)
            const frontMesh = state3D.glassesGroup.getObjectByName('front');
            const leftT = state3D.glassesGroup.getObjectByName('leftTemple');
            const rightT = state3D.glassesGroup.getObjectByName('rightTemple');

            let zOffsetAtEdge = 0;

            if (frontMesh) {
                const positionAttribute = frontMesh.geometry.attributes.position;
                const width = frontMesh.geometry.parameters.width;
                const bendFactor = state3D.params.curvature * 0.01;
                const halfWidth = width / 2;
                zOffsetAtEdge = (halfWidth * halfWidth) * bendFactor;

                // Simple curvature
                for (let i = 0; i < positionAttribute.count; i++) {
                    const x = positionAttribute.getX(i);
                    const newZ = (x * x) * bendFactor;
                    positionAttribute.setZ(i, newZ);
                }
                positionAttribute.needsUpdate = true;

                const rotRad = state3D.params.rotation * (Math.PI / 180);
                frontMesh.rotation.z = rotRad;
            }

            if (leftT && rightT) {
                leftT.position.x = -state3D.params.templeX;
                rightT.position.x = state3D.params.templeX;
                leftT.position.y = state3D.params.templeY;
                rightT.position.y = state3D.params.templeY;

                const angleRad = state3D.params.opening * (Math.PI / 180);
                const baseZ = state3D.params.templeZ;
                const newZ = baseZ + zOffsetAtEdge;

                leftT.position.z = newZ;
                rightT.position.z = newZ;

                // AJUSTE MANUAL DE INCLINAÇÃO (Fechando as hastes para dentro)
                // Ajustar Hastes Esquerda
                const baseRotLeft = (Math.PI / 2) - angleRad + 0.05;
                // Ajustar Hastes Direita
                const baseRotRight = -(Math.PI / 2) + angleRad - 0.05;

                leftT.rotation.y = baseRotLeft;
                rightT.rotation.y = baseRotRight;

                const tiltRad = state3D.params.tilt * (Math.PI / 180);
                leftT.rotation.z = -tiltRad;
                rightT.rotation.z = tiltRad;

                const tScale = state3D.params.templeScale;
                const tLen = state3D.params.templeLength;
                leftT.scale.set(-tScale * tLen, tScale, tScale);
                rightT.scale.set(tScale * tLen, tScale, tScale);
            }

            state3D.renderer.render(state3D.scene, state3D.camera);
        }

        init();

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
            if (stream) stream.getTracks().forEach(t => t.stop());
            if (state3D.renderer) state3D.renderer.dispose();
            // Simple cleanup
        }

        function processAndOptimizeImage(img: HTMLImageElement): string {
            const rawCanvas = document.createElement('canvas');
            rawCanvas.width = img.width;
            rawCanvas.height = img.height;
            const rawCtx = rawCanvas.getContext('2d');
            if (!rawCtx) return img.src;

            rawCtx.drawImage(img, 0, 0);
            const rawData = rawCtx.getImageData(0, 0, rawCanvas.width, rawCanvas.height).data;

            let m00 = 0, m10 = 0, m01 = 0;
            for (let y = 0; y < rawCanvas.height; y += 4) {
                for (let x = 0; x < rawCanvas.width; x += 4) {
                    const idx = (y * rawCanvas.width + x) * 4 + 3;
                    if (rawData[idx] > 20) {
                        m00++;
                        m10 += x;
                        m01 += y;
                    }
                }
            }

            let angle = 0;
            if (m00 > 0) {
                const cx = m10 / m00;
                const cy = m01 / m00;
                let mu20 = 0, mu02 = 0, mu11 = 0;
                for (let y = 0; y < rawCanvas.height; y += 4) {
                    for (let x = 0; x < rawCanvas.width; x += 4) {
                        const idx = (y * rawCanvas.width + x) * 4 + 3;
                        if (rawData[idx] > 20) {
                            mu20 += (x - cx) * (x - cx);
                            mu02 += (y - cy) * (y - cy);
                            mu11 += (x - cx) * (y - cy);
                        }
                    }
                }
                angle = 0.5 * Math.atan2(2 * mu11, mu20 - mu02);
            }

            // Crop
            let minX = rawCanvas.width, minY = rawCanvas.height, maxX = 0, maxY = 0;
            for (let y = 0; y < rawCanvas.height; y++) {
                for (let x = 0; x < rawCanvas.width; x++) {
                    const idx = (y * rawCanvas.width + x) * 4 + 3;
                    if (rawData[idx] > 20) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (maxX < minX) return img.src; // Empty
            const w = maxX - minX + 1;
            const h = maxY - minY + 1;
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = w;
            cropCanvas.height = h;
            const cropCtx = cropCanvas.getContext('2d');
            if (cropCtx) {
                cropCtx.drawImage(rawCanvas, minX, minY, w, h, 0, 0, w, h);
                return cropCanvas.toDataURL();
            }
            return img.src;
        }

    }, [glass]);

    // === LOADING STATE & ANIMATION ===
    const [progress, setProgress] = React.useState(0);

    // Smart Progress Simulation
    useEffect(() => {
        if (!isLoading) {
            setProgress(100);
            return;
        }

        let currentProgress = 0;
        const interval = setInterval(() => {
            // Fast start, slow end curve
            if (currentProgress < 30) {
                currentProgress += Math.random() * 3 + 1; // Very fast
            } else if (currentProgress < 70) {
                currentProgress += Math.random() * 1 + 0.5; // Medium
            } else if (currentProgress < 95) {
                currentProgress += Math.random() * 0.2; // Slow crawl at end
            }

            // Clamp to 99% while still loading
            if (currentProgress > 99) currentProgress = 99;

            setProgress(Math.round(currentProgress));
        }, 100);

        return () => clearInterval(interval);
    }, [isLoading]);


    return (
        <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-black rounded-2xl" style={{ transform: 'scaleX(-1)' }}>
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: 'center' }}
                playsInline
                autoPlay
                muted
            />
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
            />

            {/* NEW PREMIUM LOADING OVERLAY */}
            {(isLoading || progress < 100) && (
                <div
                    className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md px-8 text-center transition-opacity duration-500 ${!isLoading && progress === 100 ? 'opacity-0' : 'opacity-100'}`}
                    style={{ transform: 'scaleX(-1)' }}
                >
                    <div className="relative mb-8 flex items-center justify-center pt-4">
                        {/* Wrapper for perfect centering */}
                        <div className="relative w-20 h-20 flex items-center justify-center">
                            {/* Rotating Spinner Ring - Background */}
                            <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>

                            {/* Rotating Spinner Ring - Active Segment */}
                            {/* border-t-white creates the spinning segment, transparent elsewhere */}
                            <div className="absolute inset-0 border-2 border-transparent border-t-white rounded-full animate-spin duration-1000"></div>

                            {/* Static Icon - Perfectly Centered & Proportional */}
                            <Glasses className="w-9 h-9 text-white/90 relative z-10" strokeWidth={1.5} />
                        </div>
                    </div>

                    <p className="text-white/90 text-sm font-medium tracking-wide font-['Inter'] animate-pulse">
                        Carregando provador — <span className="tabular-nums font-bold">{progress}%</span>
                    </p>
                </div>
            )}
        </div>
    );
};

export default ARViewer3D;
