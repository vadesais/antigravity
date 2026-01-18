export interface FaceAnalysis {
    shape: string;
    description: string;
    recommendedStyle: string;
    measurements: {
        faceIndex: number;
        jawIndex: number;
        foreheadIndex: number;
    };
}

export type GlassType = 'grau' | 'sol';

export interface VisagismoData {
    gender: 'Masculino' | 'Feminino' | 'Unissex' | null;
    glassType: GlassType | null;
    faceAnalysis: FaceAnalysis | null;
}

export type VisagismoStep = 'gender' | 'glassType' | 'camera' | 'results';
