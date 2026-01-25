// @ts-ignore
import { FaceMesh } from '@mediapipe/face_mesh';

class FaceMeshService {
    private static instance: FaceMeshService;
    private faceMesh: FaceMesh | null = null;
    private initPromise: Promise<FaceMesh> | null = null;

    private constructor() { }

    public static getInstance(): FaceMeshService {
        if (!FaceMeshService.instance) {
            FaceMeshService.instance = new FaceMeshService();
        }
        return FaceMeshService.instance;
    }

    public preload(): void {
        if (!this.initPromise) {
            console.log('🦁 [FaceMeshService] Starting Background Pre-load...');
            this.initPromise = this.initialize();
        }
    }

    private async initialize(): Promise<FaceMesh> {
        return new Promise<FaceMesh>(async (resolve, reject) => {
            try {
                // Wait for global if necessary or just load
                if (!window.FaceMesh) {
                    // Check if script is loaded from index.html
                    let attempts = 0;
                    while (!window.FaceMesh && attempts < 50) { // 10 seconds wait max
                        await new Promise(r => setTimeout(r, 200));
                        attempts++;
                    }
                    if (!window.FaceMesh) {
                        console.warn('🦁 [FaceMeshService] Global FaceMesh not found, verify index.html');
                        // Fallback or throw? Ideally index.html guarantees it.
                    }
                }

                // Double check window.FaceMesh availability
                const FaceMeshClass = window.FaceMesh;
                if (!FaceMeshClass) {
                    throw new Error("FaceMesh library not loaded.");
                }

                const fm = new FaceMeshClass({
                    locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`
                });

                fm.setOptions({
                    maxNumFaces: 1,
                    refineLandmarks: false, // SPEED OPTIMIZATION
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                // Dummy init to force WASM download/compilation? 
                // Mediapipe often inits strictly on first use or 'initialize()' call. 
                // Just creating the instance triggers the heavy constructor logic often.
                // We can also call fm.initialize() if available, but usually new FaceMesh() starts the fetching.

                console.log('🦁 [FaceMeshService] Ready and warmed up!');
                this.faceMesh = fm;
                resolve(fm);

            } catch (error) {
                console.error('🦁 [FaceMeshService] Initialization failed:', error);
                reject(error);
                this.initPromise = null; // Allow retry
            }
        });
    }

    public async getFaceMesh(): Promise<FaceMesh> {
        if (this.faceMesh) return this.faceMesh;
        if (!this.initPromise) this.preload();
        return this.initPromise!;
    }
}

export const faceMeshService = FaceMeshService.getInstance();
