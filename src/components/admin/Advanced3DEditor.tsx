import React, { useEffect } from 'react';
import * as THREE from 'three';
// import { FaceMesh } from '@mediapipe/face_mesh';
import { createIcons, icons } from 'lucide';
import './Advanced3DEditor.css';

// The original HTML content, preserved exactly as requested.
// We use dangerouslySetInnerHTML to maintain the original structure and classes.
const ORIGINAL_HTML_CONTENT = `
    <!-- Header -->
    <!-- Header Removed for Clean Layout -->
    
    <main class="w-full h-full mx-auto p-2 flex flex-col lg:flex-row gap-2 items-stretch justify-center overflow-hidden">

        <!-- ESQUERDA: CÂMERA (3D Scene) -->
        <div class="w-full lg:flex-[1.5] flex flex-col items-center gap-2 relative h-full">
            <div id="canvas-wrapper" class="relative group w-full bg-black rounded-xl overflow-hidden shadow-lg border border-slate-800 h-full max-h-full">
                
                <!-- Loading Overlay -->
                <div id="loading-overlay" class="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-30">
                    <div class="loader mb-4 border-t-white"></div>
                    <p class="text-xs font-semibold text-slate-300 animate-pulse">Calibrando...</p>
                </div>

                <!-- Container 3D -->
                <div id="ar-scene-container" class="w-full h-full">
                    <video id="video" playsinline autoplay muted></video>
                    <canvas id="output-canvas"></canvas>
                </div>

                <!-- UI Sobreposta (Editor) -->
                <div id="editor-ui" class="absolute inset-0 z-20 flex flex-col justify-between p-4 pointer-events-none">
                    <!-- Text removed as requested -->
                </div>
            </div>
            
            <div class="flex items-center gap-2 text-slate-500 dark:text-slate-400 bg-white dark:bg-[#1e1e1e] px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm text-xs">
                <i data-lucide="zoom-in" class="w-3 h-3 text-indigo-500"></i>
                <span><b>Scroll</b>: Zoom • <b>Fundo</b>: Move posição</span>
            </div>
        </div>

        <!-- DIREITA: PAINEL DE CONTROLES (Compact Mode) -->
        <div id="editor-panel" class="w-full lg:w-80 flex flex-col gap-3 animate-fade-in h-full overflow-y-auto pr-1">

            <!-- CABEÇALHO DO PAINEL -->
            <div class="flex items-center justify-between shrink-0">
                <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <i data-lucide="settings-2" class="w-5 h-5 text-indigo-600"></i> Personalização
                </h2>
                <div class="flex items-center gap-2">
                    <!-- Novo Botão Salvar (Topo) - OCULTO -->
                    <button onclick="window.saveTestConfig()" class="hidden text-xs font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 px-2 py-1 rounded border border-slate-900 dark:border-slate-600 transition-colors">
                        Salvar
                    </button>
                    <!-- Botão Resetar - OCULTO -->
                    <button onclick="window.resetEditor()" class="hidden text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded border border-red-100 transition-colors">
                        Resetar
                    </button>
                </div>
            </div>

            <!-- CATEGORIA: FRENTE -->
            <div class="bg-white dark:bg-[#1e1e1e] p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2 shrink-0 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors" onclick="window.handleClickSection('front')">
                <div class="group">
                    <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 uppercase tracking-wide group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        <span class="flex items-center gap-2"><i data-lucide="image" class="w-4 h-4 text-indigo-500"></i> Frente</span>
                        <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-transform" id="icon-chevron-front"></i>
                    </h3>
                </div>

                <!-- Upload Card Frente (DIV not LABEL) -->
                <div class="part-card p-2 rounded-lg flex items-center gap-3 border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 relative">
                    <!-- Left: Preview Box -->
                    <div class="w-10 h-10 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 overflow-hidden relative shadow-sm shrink-0 flex items-center justify-center">
                        <img id="thumb-front" class="w-full h-full object-contain hidden">
                        <i data-lucide="image-plus" class="text-slate-300 dark:text-slate-600 w-5 h-5" id="icon-front-placeholder"></i>
                    </div>
                    
                    <!-- Middle: Text -->
                    <div class="flex-1 min-w-0">
                        <span class="text-sm font-bold text-slate-700 dark:text-slate-200 block truncate">Imagem Frontal</span>
                        <span class="text-xs text-slate-400 block">Clique no ícone para alterar</span>
                    </div>

                    <!-- Right: Upload Icon (Acts as TRIGGER) -->
                    <div class="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 shrink-0 cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-all" onclick="event.stopPropagation(); document.getElementById('input-front').click()">
                        <i data-lucide="upload" class="w-4 h-4"></i>
                    </div>

                    <input type="file" id="input-front" class="hidden" accept="image/png, image/jpeg" onchange="window.uploadTexture(this, 'front')">
                </div>

                <!-- Sliders Frente (Oculto por padrão) -->
                <div id="front-controls" class="space-y-2 hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <!-- Escala Geral -->
                    <div>
                        <div class="flex justify-between text-sm font-bold text-slate-500 mb-1">
                            <span>Tamanho (Escala)</span>
                            <span id="val-scale" class="bg-slate-100 px-1.5 rounded text-slate-700 font-mono">1.95</span>
                        </div>
                        <input type="range" min="1.0" max="4.9" step="0.01" value="1.95" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" oninput="window.update3DParam('scale', this.value)">
                    </div>

                    <!-- Rotacionar (NOVO) -->
                    <div>
                        <div class="flex justify-between text-sm font-bold text-slate-500 mb-1">
                            <span>Rotacionar</span>
                            <span id="val-rotation" class="bg-slate-100 px-1.5 rounded text-slate-700 font-mono">0°</span>
                        </div>
                        <input type="range" min="-20" max="20" step="0.5" value="0" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" oninput="window.update3DParam('rotation', this.value)">
                    </div>

                    <!-- Curvatura Frontal -->
                    <div>
                        <div class="flex justify-between text-sm font-bold text-slate-500 mb-1">
                            <span>Curvatura</span>
                            <span id="val-curvature" class="bg-indigo-50 text-indigo-700 px-1.5 rounded font-mono">0</span>
                        </div>
                        <input type="range" min="0" max="40" step="1" value="0" class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" oninput="window.update3DParam('curvature', this.value)">
                    </div>
                </div>
            </div>

            <!-- CATEGORIA: HASTES -->
            <div class="bg-white dark:bg-[#1e1e1e] p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2 shrink-0 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors" onclick="window.handleClickSection('temple')">
                <div class="group">
                    <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 uppercase tracking-wide group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        <span class="flex items-center gap-2"><i data-lucide="arrow-right-left" class="w-4 h-4 text-indigo-500"></i> Hastes</span>
                        <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-transform" id="icon-chevron-temple"></i>
                    </h3>
                </div>

                <!-- Upload Card Hastes (DIV not LABEL) -->
                <div class="part-card p-2 rounded-lg flex items-center gap-3 border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 relative mb-3">
                    <!-- Left: Preview Box -->
                    <div class="w-10 h-10 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 overflow-hidden relative shadow-sm shrink-0 flex items-center justify-center">
                        <img id="thumb-temple" class="w-full h-full object-contain hidden">
                        <i data-lucide="image-plus" class="text-slate-300 dark:text-slate-600 w-5 h-5" id="icon-temple-placeholder"></i>
                    </div>

                    <!-- Middle: Text -->
                    <div class="flex-1 min-w-0">
                        <span class="text-sm font-bold text-slate-700 dark:text-slate-200 block truncate">Imagem das Hastes</span>
                        <span class="text-xs text-slate-400 block">Clique no ícone para alterar</span>
                    </div>

                    <!-- Right: Upload Icon (Acts as TRIGGER) -->
                    <div class="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 shrink-0 cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition-all" onclick="event.stopPropagation(); document.getElementById('input-temple').click()">
                        <i data-lucide="upload" class="w-4 h-4"></i>
                    </div>

                    <input type="file" id="input-temple" class="hidden" accept="image/png, image/jpeg" onchange="window.uploadTexture(this, 'temple')">
                </div>
                
                <!-- Controles das Hastes (Oculto por padrão) -->
                <div id="temple-controls" class="hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <!-- AREA DE CONTROLES UNIFICADA -->
                    <div id="unified-controls" class="space-y-4 pt-1">
                        
                        <!-- 1. Tamanho da hastes (Scale) -->
                        <div>
                            <div class="flex justify-between text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">
                                <span>Tamanho das hastes</span>
                                <span id="val-templeScale" class="bg-white dark:bg-slate-800 px-1.5 rounded text-slate-700 dark:text-slate-200 font-mono shadow-sm border border-slate-100 dark:border-slate-700">1.00</span>
                            </div>
                            <input type="range" min="0.5" max="5.0" step="0.01" value="1.0" class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" oninput="window.update3DParam('templeScale', this.value)">
                        </div>

                        <!-- 2. Tamanho Horizontal (Length) -->
                        <div>
                            <div class="flex justify-between text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">
                                <span>Tamanho Horizontal</span>
                                <span id="val-templeLength" class="bg-white dark:bg-slate-800 px-1.5 rounded text-slate-700 dark:text-slate-200 font-mono shadow-sm border border-slate-100 dark:border-slate-700">1.00</span>
                            </div>
                            <input type="range" min="0.5" max="2.0" step="0.01" value="1.0" class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" oninput="window.update3DParam('templeLength', this.value)">
                        </div>

                        <!-- 3. Inclinação (Tilt) -->
                        <div>
                            <div class="flex justify-between text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">
                                <span>Inclinação</span>
                                <span id="val-tilt" class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-1.5 rounded font-mono">0°</span>
                            </div>
                            <input type="range" min="-30" max="30" step="1" value="0" class="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" oninput="window.update3DParam('tilt', this.value)">
                        </div>
                    </div>
                </div>
                </div>
                
                <!-- Botão Seguir (Aparece sempre) -->
                <div id="btn-follow-container" class="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <button id="btn-follow" onclick="window.publishAction()" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all text-sm opacity-50">
                        <span>Seguir</span>
                        <i data-lucide="arrow-right" class="w-4 h-4"></i>
                    </button>
                </div>

            </div>

            <!-- Botão de Publicar -->
            <div class="sticky bottom-0 pt-4 pb-2 bg-white dark:bg-[#1e1e1e] z-10 mt-auto">
                <button id="btn-publish" onclick="window.publishAction()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all text-sm">
                    <i data-lucide="arrow-right" class="w-4 h-4"></i>
                    <span>Continuar</span>
                </button>
            </div>
        </div>
    
    <!-- TOAST NOTIFICATION -->
    <div id="toast-container" class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"></div>
`;


interface Advanced3DEditorProps {
    onPublish?: (data: { config: any, frontImage: string | null, templeImage: string | null }) => void;
    initialData?: {
        config: any;
        frontUrl?: string; // Can be a remote URL or data URL
        templeUrl?: string;
    } | null;
}

const Advanced3DEditor: React.FC<Advanced3DEditorProps> = ({ onPublish, initialData }) => {
    useEffect(() => {
        // === INIT LUCIDE ===
        createIcons({ icons });

        // === TAB SWITCH LOGIC ===
        // === TAB SWITCH LOGIC (Legacy - kept for safety) ===
        (window as any).switchTempleTab = (tab: string) => { /* ... */ };

        // === NEW TOGGLE SECTION LOGIC ===
        (window as any).toggleSection = (section: 'front' | 'temple') => {
            const frontControls = document.getElementById('front-controls');
            const templeControls = document.getElementById('temple-controls');
            const chevronFront = document.getElementById('icon-chevron-front');
            const chevronTemple = document.getElementById('icon-chevron-temple');

            if (section === 'front') {
                // Show Front, Hide Temple
                if (frontControls) frontControls.classList.remove('hidden');
                if (templeControls) templeControls.classList.add('hidden');

                // Rotate chevrons
                if (chevronFront) chevronFront.style.transform = 'rotate(180deg)';
                if (chevronTemple) chevronTemple.style.transform = 'rotate(0deg)';

            } else if (section === 'temple') {
                // Show Temple, Hide Front
                if (frontControls) frontControls.classList.add('hidden');
                if (templeControls) templeControls.classList.remove('hidden');

                // Rotate chevrons
                if (chevronFront) chevronFront.style.transform = 'rotate(0deg)';
                if (chevronTemple) chevronTemple.style.transform = 'rotate(180deg)';
            }
        };

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
            cameraZoom: 1.0,
            targetPos: new THREE.Vector3(),
            targetQuat: new THREE.Quaternion(),
            currentPos: new THREE.Vector3(),
            currentQuat: new THREE.Quaternion(),
            isTracking: false,
            isDragging: false,
            lastMouse: { x: 0, y: 0 },
            raycaster: new THREE.Raycaster(),
            mouse: new THREE.Vector2(),
            selectedGizmo: null,
            gizmos: []
        };

        const video = document.getElementById('video') as HTMLVideoElement;
        const canvas = document.getElementById('output-canvas') as HTMLCanvasElement;
        const container = document.getElementById('ar-scene-container') as HTMLElement;
        let faceMesh: any;
        let animationId: number;

        // === 1. INICIALIZAÇÃO ===
        async function init() {
            // Setup MediaPipe

            // Wait for global FaceMesh if not ready yet
            if (!window.FaceMesh) {
                let attempts = 0;
                while (!window.FaceMesh && attempts < 50) { // 10 seconds timeout
                    await new Promise(r => setTimeout(r, 200));
                    attempts++;
                }
                if (!window.FaceMesh) {
                    console.error("FaceMesh global not loaded!");
                    showToast("Erro: Biblioteca FaceMesh não carregou.", "error");
                    return;
                }
            }

            faceMesh = new window.FaceMesh({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            faceMesh.onResults(onFaceResults);

            initThreeJS();
            setupMouseEvents();

            if (initialData) {
                // Restore from props (Editing mode)
                if (initialData.config) {
                    state3D.params = { ...state3D.params, ...initialData.config };
                    // Update UI sliders immediately
                    Object.keys(state3D.params).forEach(key => update3DParam(key, String(state3D.params[key])));
                }

                // Load Initial Textures (Async)
                const restoreTextures = async () => {
                    if (initialData.frontUrl) {
                        const img = new Image();
                        img.crossOrigin = 'Anonymous';
                        img.src = initialData.frontUrl;
                        await new Promise(r => { img.onload = r; });
                        const tex = new THREE.Texture(img);
                        tex.colorSpace = THREE.SRGBColorSpace;
                        tex.needsUpdate = true;
                        state3D.textures.front = tex;

                        // Set thumb
                        const thumb = document.getElementById('thumb-front') as HTMLImageElement;
                        const icon = document.getElementById('icon-front') as HTMLElement;
                        if (thumb) { thumb.src = initialData.frontUrl; thumb.classList.remove('hidden'); }
                        if (icon) icon.classList.add('hidden');

                        const ctrls = document.getElementById('front-controls');
                        if (ctrls) ctrls.classList.remove('hidden');
                    }

                    if (initialData.templeUrl) {
                        const img = new Image();
                        img.crossOrigin = 'Anonymous';
                        img.src = initialData.templeUrl;
                        await new Promise(r => { img.onload = r; });
                        const tex = new THREE.Texture(img);
                        tex.colorSpace = THREE.SRGBColorSpace;
                        tex.needsUpdate = true;
                        state3D.textures.temple = tex;

                        const thumb = document.getElementById('thumb-temple') as HTMLImageElement;
                        const icon = document.getElementById('icon-temple') as HTMLElement;
                        if (thumb) { thumb.src = initialData.templeUrl; thumb.classList.remove('hidden'); }
                        if (icon) icon.classList.add('hidden');

                        const ctrls = document.getElementById('temple-controls');
                        // if (ctrls) ctrls.classList.remove('hidden'); // REMOVED BY USER REQUEST (Start collapsed)
                    }


                    createGlassesMeshes();

                    // Show Follow Button in Edit Mode (Always visible if editing)
                    const btnFollow = document.getElementById('btn-follow-container');
                    if (btnFollow) btnFollow.classList.remove('hidden');

                    // Remove transparency
                    const btnFollowObj = document.getElementById('btn-follow');
                    if (btnFollowObj) btnFollowObj.classList.remove('opacity-50');

                    // Button is now always visible
                    // if (initialData.frontUrl || initialData.templeUrl) { ... }
                };
                restoreTextures();

            } else {
                loadSavedSettings();
            }

            const resizeObserver = new ResizeObserver(() => handleResize());

            if (container) resizeObserver.observe(container);
            handleResize();

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
                if (video) {
                    video.srcObject = stream;
                    await new Promise(resolve => video.onloadeddata = resolve);
                    await video.play();

                    const loader = document.getElementById('loading-overlay');
                    if (loader) loader.classList.add('hidden');

                    const loop = async () => {
                        if (video.readyState === 4) {
                            await faceMesh.send({ image: video });
                        }
                        animationId = requestAnimationFrame(loop);
                    };
                    loop();
                }

            } catch (e) {
                console.error(e);
                showToast("Erro ao iniciar câmera", "error");
            }
        }

        function handleResize() {
            if (!state3D.renderer || !state3D.camera) return;
            if (!container) return;
            const width = container.clientWidth;
            const height = container.clientHeight;

            state3D.camera.aspect = width / height;
            state3D.camera.updateProjectionMatrix();
            state3D.renderer.setSize(width, height);
        }

        // === 2. THREE.JS SETUP ===
        function initThreeJS() {
            if (!container || !canvas) return;
            const width = container.clientWidth;
            const height = container.clientHeight;

            state3D.scene = new THREE.Scene();
            const fov = 45;
            state3D.camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 1000);
            state3D.camera.position.z = 20;

            state3D.renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
            state3D.renderer.setSize(width, height);
            state3D.renderer.setPixelRatio(window.devicePixelRatio);
            state3D.renderer.outputColorSpace = THREE.SRGBColorSpace;
            state3D.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            state3D.renderer.toneMappingExposure = 1.0;

            const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
            state3D.scene.add(ambientLight);
            const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
            dirLight.position.set(0, 10, 10);
            state3D.scene.add(dirLight);

            const headGeo = new THREE.CylinderGeometry(3.2, 3.2, 9, 32);
            headGeo.applyMatrix4(new THREE.Matrix4().makeScale(0.75, 1, 0.85));
            const occluderMat = new THREE.MeshBasicMaterial({ color: 0x000000, colorWrite: false });
            state3D.occluderMesh = new THREE.Mesh(headGeo, occluderMat);
            state3D.occluderMesh.renderOrder = 0;
            state3D.scene.add(state3D.occluderMesh);

            state3D.glassesGroup = new THREE.Group();
            state3D.glassesGroup.renderOrder = 1;
            state3D.scene.add(state3D.glassesGroup);

            createGlassesMeshes();
        }

        // === 3. MOUSE CONTROL SYSTEM ===
        function setupMouseEvents() {
            if (!container) return;
            const handleStart = (clientX: number, clientY: number, button: number) => {
                // Right click check
                if (button === 2) {
                    state3D.isRightDragging = true;
                    state3D.lastMouse = { x: clientX, y: clientY };
                    return;
                }

                const rect = container.getBoundingClientRect();
                const x = ((clientX - rect.left) / rect.width) * 2 - 1;
                const y = -((clientY - rect.top) / rect.height) * 2 + 1;
                state3D.mouse.set(-x, y);
                state3D.raycaster.setFromCamera(state3D.mouse, state3D.camera);

                const intersects = state3D.raycaster.intersectObjects(state3D.gizmos, false);

                if (intersects.length > 0) {
                    state3D.selectedGizmo = intersects[0].object.name;
                    state3D.isDragging = true;
                    state3D.lastMouse = { x: clientX, y: clientY };
                    intersects[0].object.material.color.set(0xffffff);
                } else {
                    state3D.selectedGizmo = null;
                    state3D.isDragging = true;
                    state3D.lastMouse = { x: clientX, y: clientY };
                }
            };

            const handleMove = (clientX: number, clientY: number) => {
                const dx = clientX - state3D.lastMouse.x;
                const dy = clientY - state3D.lastMouse.y;
                // state3D.lastMouse = { x: clientX, y: clientY }; // Update lastMouse at the end

                if (state3D.isRightDragging) {
                    state3D.lastMouse = { x: clientX, y: clientY };
                    const sensitivity = 0.002;

                    // Vertical Drag (Y) -> Temple Height
                    const deltaY = -dy * sensitivity;
                    const newY = state3D.params.templeY + deltaY;
                    update3DParam('templeY', newY.toString());

                    // Horizontal Drag
                    // If Shift is held: Temple Depth (Z) ("Pra frente / trás")
                    // Normal: Temple Width (X) ("Pra dentro / fora")
                    // We need to access the event to check for shiftKey, but handleMove only has coords.
                    // We need to update setupMouseEvents to pass the event or check window.event (deprecated but works) 
                    // OR better: Assume Normal = Width (X) as requested.

                    const isShift = (window.event as MouseEvent)?.shiftKey;

                    if (isShift) {
                        const deltaZ = dx * sensitivity;
                        const newZ = state3D.params.templeZ + deltaZ;
                        update3DParam('templeZ', newZ.toString());
                    } else {
                        const deltaX = dx * sensitivity; // Moving right increases X (wider)
                        const newX = state3D.params.templeX + deltaX;
                        update3DParam('templeX', newX.toString());
                    }

                    return;
                }

                if (!state3D.isDragging) return;
                state3D.lastMouse = { x: clientX, y: clientY };
                const sensitivity = 0.01;

                if (state3D.selectedGizmo) {
                    if (Math.abs(dx) > 0) {
                        let deltaOp = 0;
                        const openSens = 0.5;
                        if (state3D.selectedGizmo === 'gizmoRight') {
                            deltaOp = dx * openSens;
                        } else {
                            deltaOp = -dx * openSens;
                        }
                        let newOpening = state3D.params.opening + deltaOp;
                        newOpening = Math.max(-20, Math.min(45, newOpening));
                        update3DParam('opening', newOpening.toString());
                    }
                } else {
                    update3DParam('x', (state3D.params.x + (dx * sensitivity)).toString());
                    update3DParam('y', (state3D.params.y - (dy * sensitivity)).toString());
                }
                const inpX = document.getElementById('inp-x') as HTMLInputElement;
                const inpY = document.getElementById('inp-y') as HTMLInputElement;
                if (inpX) inpX.value = state3D.params.x;
                if (inpY) inpY.value = state3D.params.y;
            };

            const handleEnd = () => {
                state3D.isDragging = false;
                state3D.isRightDragging = false;
                if (state3D.gizmos) {
                    state3D.gizmos.forEach((g: any) => g.material.color.set(0x3b82f6));
                }
                state3D.selectedGizmo = null;
            };

            const handleZoom = (e: WheelEvent) => {
                e.preventDefault();
                const delta = -Math.sign(e.deltaY) * 0.1;
                const newZoom = Math.min(Math.max(1.0, state3D.cameraZoom + delta), 2.5);
                if (newZoom !== state3D.cameraZoom) {
                    state3D.cameraZoom = newZoom;
                    container.style.transform = `scaleX(-1) scale(${state3D.cameraZoom})`;
                }
            };

            container.addEventListener('mousedown', (e: MouseEvent) => handleStart(e.clientX, e.clientY, e.button));
            window.addEventListener('mousemove', (e: MouseEvent) => handleMove(e.clientX, e.clientY));
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('contextmenu', (e: MouseEvent) => e.preventDefault()); // Disable context menu
            container.addEventListener('wheel', handleZoom, { passive: false });
            container.addEventListener('touchstart', (e: TouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY, 0)); // Touch acts as left click
            window.addEventListener('touchmove', (e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY));
            window.addEventListener('touchend', handleEnd);
        }

        function createGlassesMeshes() {
            while (state3D.glassesGroup.children.length > 0) {
                state3D.glassesGroup.remove(state3D.glassesGroup.children[0]);
            }
            state3D.gizmos = [];

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
            let frontRatio = 2; // Default 3.2 / 1.6
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
            // IMPORTANT: Calculate ratio based on temple texture to match Viewer
            let templeRatio = 5; // Default 2 / 0.4
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

            const gizmoGeo = new THREE.SphereGeometry(0.15, 16, 16);
            const gizmoMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
            const leftGizmo = new THREE.Mesh(gizmoGeo, gizmoMat.clone());
            leftGizmo.position.set(2.0, 0, 0);
            leftGizmo.name = 'gizmoLeft';
            leftGizmo.visible = false;
            leftTemple.add(leftGizmo);
            state3D.gizmos.push(leftGizmo);

            state3D.glassesGroup.add(leftTemple);

            const rightTemple = new THREE.Mesh(templeGeo, matTemple);
            rightTemple.name = "rightTemple";
            rightTemple.position.set(state3D.params.templeX, state3D.params.templeY, state3D.params.templeZ);
            rightTemple.rotation.y = -Math.PI / 2;
            rightTemple.renderOrder = 2;

            const rightGizmo = new THREE.Mesh(gizmoGeo, gizmoMat.clone());
            rightGizmo.position.set(2.0, 0, 0);
            rightGizmo.name = 'gizmoRight';
            rightGizmo.visible = false;
            rightTemple.add(rightGizmo);
            state3D.gizmos.push(rightGizmo);

            state3D.glassesGroup.add(rightTemple);
        }

        function onFaceResults(results: any) {
            if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
                state3D.renderer.render(state3D.scene, state3D.camera);
                return;
            }

            const landmarks = results.multiFaceLandmarks[0];
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

            const headPos = nose.clone();

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
            } else {
                state3D.currentPos.lerp(nose, smoothFactor);
                state3D.currentQuat.slerp(targetQuat, smoothFactor);
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
                const baseRotLeft = (Math.PI / 2) - angleRad - 0.0;
                // Ajustar Hastes Direita
                const baseRotRight = -(Math.PI / 2) + angleRad + 0.0;

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
                            const dx = x - cx;
                            const dy = y - cy;
                            mu20 += dx * dx;
                            mu02 += dy * dy;
                            mu11 += dx * dy;
                        }
                    }
                }
                angle = 0.5 * Math.atan2(2 * mu11, mu20 - mu02);
                if (Math.abs(angle) < 0.05) angle = 0;
            }

            const diag = Math.sqrt(img.width * img.width + img.height * img.height);
            const rotCanvas = document.createElement('canvas');
            rotCanvas.width = diag;
            rotCanvas.height = diag;
            const rotCtx = rotCanvas.getContext('2d');

            if (!rotCtx) return img.src;

            rotCtx.translate(diag / 2, diag / 2);
            rotCtx.rotate(angle);
            rotCtx.drawImage(img, -img.width / 2, -img.height / 2);
            rotCtx.rotate(-angle);
            rotCtx.translate(-diag / 2, -diag / 2);

            const rotData = rotCtx.getImageData(0, 0, rotCanvas.width, rotCanvas.height).data;
            let minX = rotCanvas.width, maxX = 0, minY = rotCanvas.height, maxY = 0;
            let found = false;

            for (let y = 0; y < rotCanvas.height; y += 2) {
                for (let x = 0; x < rotCanvas.width; x += 2) {
                    const alpha = rotData[(y * rotCanvas.width + x) * 4 + 3];
                    if (alpha > 10) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                        found = true;
                    }
                }
            }

            if (!found) return img.src;

            const contentWidth = maxX - minX;
            const contentHeight = maxY - minY;

            const MAX_WIDTH = 1024;
            let finalWidth = contentWidth;
            let finalHeight = contentHeight;

            if (finalWidth > MAX_WIDTH) {
                const ratio = MAX_WIDTH / finalWidth;
                finalWidth = MAX_WIDTH;
                finalHeight = Math.round(contentHeight * ratio);
            }

            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = finalWidth;
            finalCanvas.height = finalHeight;
            const finalCtx = finalCanvas.getContext('2d');

            if (finalCtx) {
                finalCtx.imageSmoothingEnabled = true;
                finalCtx.imageSmoothingQuality = 'high';

                finalCtx.drawImage(
                    rotCanvas,
                    minX, minY, contentWidth, contentHeight,
                    0, 0, finalWidth, finalHeight
                );

                return finalCanvas.toDataURL('image/webp', 0.8);
            }

            return img.src;
        }

        function uploadTexture(input: HTMLInputElement, type: string) {
            const file = input.files?.[0]; if (!file) return;

            // showToast("Processando imagem...", "info"); // REMOVED BY USER REQUEST

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const finalSrc = processAndOptimizeImage(img);

                    const processedImg = new Image();
                    processedImg.onload = () => {
                        const thumb = document.getElementById(`thumb-${type}`) as HTMLImageElement;
                        const placeholder = document.getElementById(`icon-${type}-placeholder`);

                        if (thumb) {
                            thumb.src = finalSrc;
                            thumb.classList.remove('hidden');
                        }
                        if (placeholder) placeholder.classList.add('hidden');

                        const controls = document.getElementById(`${type}-controls`);
                        if (controls) controls.classList.remove('hidden');

                        // REQ: Auto-hide Front controls if modifying Temple
                        if (type === 'temple') {
                            const frontCtrls = document.getElementById('front-controls');
                            if (frontCtrls) frontCtrls.classList.add('hidden');

                            // Update chevrons
                            const chevronFront = document.getElementById('icon-chevron-front');
                            if (chevronFront) chevronFront.style.transform = 'rotate(0deg)';
                            const chevronTemple = document.getElementById('icon-chevron-temple');
                            if (chevronTemple) chevronTemple.style.transform = 'rotate(180deg)';

                            // Show Follow Button only for Temple upload
                            const btnFollow = document.getElementById('btn-follow-container');
                            if (btnFollow) btnFollow.classList.remove('hidden');
                        } else {
                            // Hide Follow Button if switch back to front (optional, but cleaner)
                            // const btnFollow = document.getElementById('btn-follow-container');
                            // if (btnFollow) btnFollow.classList.add('hidden');
                        }

                        // Remove transparency from Follow Button
                        const btnFollowObj = document.getElementById('btn-follow');
                        if (btnFollowObj) btnFollowObj.classList.remove('opacity-50');

                        // Show Publish Button for ALL uploads
                        // const btnPublish = document.getElementById('btn-publish');
                        // if (btnPublish) btnPublish.classList.remove('hidden');

                        // showToast(type === 'front' ? "Frente carregada!" : "Haste carregada!", "success"); // REMOVED BY USER REQUEST

                        // Re-init icons to ensure any new state is rendered correctly
                        createIcons({ icons });

                        const w = processedImg.width;
                        const h = processedImg.height;

                        const canvas = document.createElement('canvas');
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(processedImg, 0, 0, w, h);
                        }

                        const texture = new THREE.CanvasTexture(canvas);
                        texture.colorSpace = THREE.SRGBColorSpace;
                        texture.anisotropy = state3D.renderer.capabilities.getMaxAnisotropy();
                        texture.minFilter = THREE.LinearMipmapLinearFilter;
                        texture.magFilter = THREE.LinearFilter;
                        texture.generateMipmaps = true;
                        texture.needsUpdate = true;

                        state3D.textures[type] = texture;

                        const isFront = type === 'front';
                        const mat = new THREE.MeshBasicMaterial({
                            map: texture,
                            transparent: true,
                            side: isFront ? THREE.DoubleSide : THREE.BackSide,
                            depthWrite: isFront,
                            alphaTest: 0.1,
                            opacity: 1,
                            visible: true
                        });

                        if (type === 'front') {
                            const frontControls = document.getElementById('front-controls');
                            if (frontControls) frontControls.classList.remove('hidden');

                            const mesh = state3D.glassesGroup.getObjectByName('front');
                            if (mesh) {
                                mesh.material = mat;
                                const ratio = processedImg.width / processedImg.height;
                                mesh.scale.set(1, 1, 1);
                                mesh.geometry = new THREE.PlaneGeometry(3.2, 3.2 / ratio, 32, 1);
                                mesh.renderOrder = 1;

                                const saved = localStorage.getItem('ar_settings');
                                if (saved) {
                                    const p = JSON.parse(saved);
                                    if (p.templeX !== undefined) {
                                        update3DParam('templeX', String(p.templeX));
                                        const slider = document.querySelector('input[oninput*="templeX"]') as HTMLInputElement;
                                        if (slider) slider.value = p.templeX;
                                    }
                                } else {
                                    update3DParam('templeX', "1.55");
                                    const slider = document.querySelector('input[oninput*="templeX"]') as HTMLInputElement;
                                    if (slider) slider.value = "1.55";
                                }

                                // showToast("Imagem alinhada e otimizada!", "success"); // REMOVED BY USER REQUEST
                            }
                        } else if (type === 'temple') {
                            const templeControls = document.getElementById('temple-controls');
                            if (templeControls) templeControls.classList.remove('hidden');

                            const lMesh = state3D.glassesGroup.getObjectByName('leftTemple');
                            const rMesh = state3D.glassesGroup.getObjectByName('rightTemple');
                            const ratio = processedImg.width / processedImg.height;
                            const geo = new THREE.PlaneGeometry(2, 2 / ratio);
                            geo.translate(1.0, 0, 0);
                            if (lMesh) { lMesh.material = mat; lMesh.geometry = geo; lMesh.renderOrder = 2; }
                            if (rMesh) { rMesh.material = mat; rMesh.geometry = geo; rMesh.renderOrder = 2; }

                            const saved = localStorage.getItem('ar_settings');
                            if (saved) {
                                const p = JSON.parse(saved);
                                if (p.templeZ !== undefined) update3DParam('templeZ', String(p.templeZ));
                                if (p.templeY !== undefined) update3DParam('templeY', String(p.templeY));

                                const sliderZ = document.querySelector('input[oninput*="templeZ"]') as HTMLInputElement;
                                if (sliderZ && p.templeZ !== undefined) sliderZ.value = p.templeZ;

                                const sliderY = document.querySelector('input[oninput*="templeY"]') as HTMLInputElement;
                                if (sliderY && p.templeY !== undefined) sliderY.value = p.templeY;
                            } else {
                                update3DParam('templeZ', "0.0");
                                update3DParam('templeY', "0.21");
                                const sliderZ = document.querySelector('input[oninput*="templeZ"]') as HTMLInputElement;
                                if (sliderZ) sliderZ.value = "0.0";
                                const sliderY = document.querySelector('input[oninput*="templeY"]') as HTMLInputElement;
                                if (sliderY) sliderY.value = "0.21";
                            }

                            // showToast("Haste alinhada e otimizada!", "success"); // REMOVED BY USER REQUEST
                        }
                        input.value = '';
                    };
                    processedImg.src = finalSrc;
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }

        function update3DParam(prop: string, val: string) {
            state3D.params[prop] = parseFloat(val);
            if (prop === 'scale') { const el = document.getElementById('val-scale'); if (el) el.innerText = val; }
            if (prop === 'x') { const el = document.getElementById('val-x'); if (el) el.innerText = parseFloat(val).toFixed(2); }
            if (prop === 'y') { const el = document.getElementById('val-y'); if (el) el.innerText = parseFloat(val).toFixed(2); }
            if (prop === 'z') { const el = document.getElementById('val-z'); if (el) el.innerText = val; }
            if (prop === 'opening') { const el = document.getElementById('val-opening'); if (el) el.innerText = val + '°'; }
            if (prop === 'curvature') { const el = document.getElementById('val-curvature'); if (el) el.innerText = val; }
            if (prop === 'tilt') { const el = document.getElementById('val-tilt'); if (el) el.innerText = val + '°'; }

            if (prop === 'rotation') { const el = document.getElementById('val-rotation'); if (el) el.innerText = val + '°'; }

            if (prop === 'templeX') { const el = document.getElementById('val-templeX'); if (el) el.innerText = val; }
            if (prop === 'templeY') { const el = document.getElementById('val-templeY'); if (el) el.innerText = val; }
            if (prop === 'templeZ') { const el = document.getElementById('val-templeZ'); if (el) el.innerText = val; }

            if (prop === 'templeScale') { const el = document.getElementById('val-templeScale'); if (el) el.innerText = val; }
            if (prop === 'templeLength') { const el = document.getElementById('val-templeLength'); if (el) el.innerText = val; }
        }

        function saveTestConfig() {
            // Save using local storage (original behavior)
            localStorage.setItem('ar_settings', JSON.stringify(state3D.params));
            showToast("Configurações salvas localmente", "success");
        }

        function loadSavedSettings() {
            const saved = localStorage.getItem('ar_settings');
            if (saved) {
                try {
                    const p = JSON.parse(saved);
                    state3D.params = { ...state3D.params, ...p };

                    Object.keys(p).forEach(key => {
                        update3DParam(key, String(p[key]));
                        const input = document.querySelector(`input[oninput*="'${key}'"]`) as HTMLInputElement;
                        if (input) input.value = p[key];
                    });
                    showToast("Configurações carregadas!", "success");
                } catch (e) { console.error(e); }
            }
        }

        function resetEditor() {
            state3D.textures = { front: null, temple: null };
            createGlassesMeshes();
            state3D.params = {
                scale: 1.95, x: 0.0, y: 0.00, z: -0.3,
                opening: 10, curvature: 0, tilt: 0,
                rotation: 0,
                templeX: 1.55, templeY: 0.21, templeZ: 0.0,
                templeScale: 1.0, templeLength: 1.0
            };
            update3DParam('scale', "1.95"); update3DParam('x', "0"); update3DParam('y', "0.00"); update3DParam('curvature', "0");
            update3DParam('tilt', "0"); update3DParam('rotation', "0");
            update3DParam('templeX', "1.55"); update3DParam('templeY', "0.21"); update3DParam('templeZ', "0.0");
            update3DParam('templeScale', "1.0"); update3DParam('templeLength', "1.0");

            document.querySelectorAll('img[id^="thumb-"]').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('i[id^="icon-"]').forEach(el => el.classList.remove('hidden'));

            const frontControls = document.getElementById('front-controls');
            if (frontControls) frontControls.classList.add('hidden');
            const templeControls = document.getElementById('temple-controls');
            if (templeControls) templeControls.classList.add('hidden');

            // Hide Follow Button
            const btnFollow = document.getElementById('btn-follow-container');
            if (btnFollow) btnFollow.classList.add('hidden');

            showToast("Cena resetada", "info");
        }

        function handleClickSection(type: string) {
            // If no texture exists for this type, trigger upload
            if (!state3D.textures[type]) {
                const input = document.getElementById(`input-${type}`);
                if (input) input.click();
            } else {
                // If texture exists, toggle the accordion
                toggleSection(type);
            }
        }

        function showToast(message: string, type = 'info') {
            const container = document.getElementById('toast-container');
            if (!container) return;
            const toast = document.createElement('div');
            const color = type === 'error' ? 'bg-red-500' : (type === 'success' ? 'bg-green-500' : 'bg-slate-800');
            toast.className = `${color} text-white px-4 py-3 rounded-lg shadow-xl text-sm font-medium flex items-center gap-2 transform transition-all duration-300 translate-y-10 opacity-0 pointer-events-auto`;
            toast.innerHTML = `<span>${message}</span>`;
            container.appendChild(toast);
            requestAnimationFrame(() => toast.classList.remove('translate-y-10', 'opacity-0'));
            setTimeout(() => {
                toast.classList.add('translate-y-10', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        (window as any).resetEditor = resetEditor;
        (window as any).uploadTexture = uploadTexture;
        (window as any).update3DParam = update3DParam;
        (window as any).saveTestConfig = saveTestConfig;
        (window as any).handleClickSection = handleClickSection;

        (window as any).publishAction = () => {
            // Extract current images
            let frontImgData: string | null = null;
            let templeImgData: string | null = null;

            if (state3D.textures.front && state3D.textures.front.image) {
                const img = state3D.textures.front.image;
                const c = document.createElement('canvas');
                c.width = img.width;
                c.height = img.height;
                const ctx = c.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    frontImgData = c.toDataURL('image/webp', 1.0);
                }
            }

            if (state3D.textures.temple && state3D.textures.temple.image) {
                const img = state3D.textures.temple.image;
                const c = document.createElement('canvas');
                c.width = img.width;
                c.height = img.height;
                const ctx = c.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    templeImgData = c.toDataURL('image/webp', 1.0);
                }
            }

            if (onPublish) {
                onPublish({
                    config: state3D.params,
                    frontImage: frontImgData,
                    templeImage: templeImgData
                });
            }
        };

        init();

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
            // Clean up video stream traces if necessary
        };

    }, []);

    return (
        <div
            className="bg-slate-50 dark:bg-[#121212] h-full flex flex-col transition-colors duration-300"
            dangerouslySetInnerHTML={{ __html: ORIGINAL_HTML_CONTENT }}
        />
    );
};

export default Advanced3DEditor;
