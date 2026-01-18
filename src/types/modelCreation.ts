export interface ModelGeneration {
    id: string;
    profile_id: string;
    user_id: string | null;
    mode: 'ai' | 'photo';
    glasses_image_url: string;
    model_description: string | null;
    scenario_description: string | null;
    user_photo_url: string | null;
    keep_background: boolean | null;
    result_image_url: string | null;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error_message: string | null;
    created_at: string;
    completed_at: string | null;
}

export interface ModelGenerationLimits {
    id: string;
    profile_id: string;
    daily_limit: number;
    monthly_limit: number;
    daily_count: number;
    monthly_count: number;
    last_daily_reset: string;
    last_monthly_reset: string;
    created_at: string;
    updated_at: string;
}

export interface ModelCreationConfig {
    profileId: string;
    mode: 'ai' | 'photo';
    modelDescription?: string;
    scenarioDescription?: string;
    userPhotoUrl?: string;
    keepBackground?: boolean;
}

export type ModelCreationStep =
    | 'upload'
    | 'mode'
    | 'config'
    | 'generate'
    | 'result';
