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

export interface VisagismoData {
    gender: 'Masculino' | 'Feminino' | 'Unissex' | null;
    faceAnalysis: FaceAnalysis | null;
}

export type VisagismoStep = 'gender' | 'camera' | 'results';
