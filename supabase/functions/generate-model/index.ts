import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';

if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
}

const PROMPTS = {
    singleImage: {
        base: `Generate a photorealistic close-up portrait of a person wearing the glasses shown in the input image.
The generated person's face MUST match this description: {MODEL_DESC}.
The person must be wearing EXACTLY the glasses provided in the image (frames, lens shape, color).
The glasses must be positioned correctly on the nose bridge and ears.
The scenario is: {SCENARIO_DESC}.
The image MUST vary strictly adhere to the aspect ratio 4:5 (1080x1350).
The composition must be a classic portrait that fits perfectly in a 4:5 frame without being too wide.
Ensure high fashion photography quality, sharp focus on the face and glasses.
Output ONLY one single image.`
    },
    dualImage: {
        base: `The goal is to virtually try on glasses. Take the person in "Model Image" and put the glasses from "Clothing Image" on their face.
CRITICAL INSTRUCTION: You MUST PRESERVE the EXACT hair color, hair style, skin tone, and facial features of the "Model Image".
DO NOT change the hair color. If the hair is dark, KEEP IT DARK.
DO NOT change the person's identity. The person in the output must look exactly like the person in "Model Image".
The only allowed change is the addition of the glasses on the face.
The glasses must fit naturally on the nose bridge.
{SCENARIO_INSTRUCTION}
The output image MUST be a PORTRAIT with aspect ratio 4:5 (1080x1350).
If the input "Model Image" is landscape/wide, you MUST CROP IT to a vertical 4:5 format centered on the face.
DO NOT generate wide images. The output MUST be taller than it is wide.
Output ONLY one single image.`,
        keepScenario: `Preserve the original background as much as possible, but CROP the image to fill the 4:5 vertical frame. Do NOT keep the original aspect ratio if it is not 4:5.`,
        newScenario: `Change the background to: {SCENARIO_DESC} (but keep the face lighting natural).`
    }
};

serve(async (req) => {
    try {
        // CORS headers
        if (req.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
                },
            });
        }

        const { glassesImageUrl, mode, config } = await req.json();

        // 1. Validar autenticação
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Unauthorized');

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        );

        // Create Admin client for DB operations ignoring RLS
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Unauthorized');

        // 2. Buscar profile do usuário
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, allow_model_creation')
            .eq('id', config.profileId)
            .single();

        if (profileError || !profile) throw new Error('Profile not found');
        if (!profile.allow_model_creation) throw new Error('Module not enabled for this profile');

        // 3. Verificar limites (Using Admin to ensure we can read)
        const { data: limits, error: limitsError } = await supabaseAdmin
            .from('model_generation_limits')
            .select('*')
            .eq('profile_id', profile.id)
            .single();

        if (limitsError) {
            // Criar limites se não existir
            const { data: newLimits } = await supabaseAdmin
                .from('model_generation_limits')
                .insert({ profile_id: profile.id })
                .select()
                .single();

            if (!newLimits) throw new Error('Failed to create limits');
        } else {
            // Verificar se atingiu limite
            if (limits.daily_count >= limits.daily_limit) {
                throw new Error('Daily limit reached');
            }
        }

        // 4. Criar registro de geração
        const { data: generation, error: genError } = await supabase
            .from('model_generations')
            .insert({
                profile_id: profile.id,
                user_id: user.id,
                mode,
                glasses_image_url: glassesImageUrl,
                model_description: config.modelDescription,
                scenario_description: config.scenarioDescription,
                user_photo_url: config.userPhotoUrl,
                keep_background: config.keepBackground,
                status: 'processing'
            })
            .select()
            .single();

        if (genError || !generation) throw new Error('Failed to create generation record');

        // 5. Incrementar contador movido para processWithGemini (após sucesso)

        // 6. Processar com Gemini (assíncrono)
        processWithGemini(generation.id, mode, glassesImageUrl, config, supabaseAdmin);

        return new Response(
            JSON.stringify({
                success: true,
                generationId: generation.id,
                message: 'Generation started'
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );
    }
});

interface GenerateConfig {
    modelDescription?: string;
    scenarioDescription?: string;
    userPhotoUrl?: string;
    keepBackground?: boolean;
    profileId?: string;
}

async function processWithGemini(
    generationId: string,
    mode: string,
    glassesImageUrl: string,
    config: GenerateConfig,
    supabase: SupabaseClient
) {
    try {
        // Baixar imagem dos óculos
        const glassesResponse = await fetch(glassesImageUrl);
        const glassesBlob = await glassesResponse.blob();
        const glassesBase64 = await blobToBase64(glassesBlob);

        let prompt: string;
        let images: Record<string, unknown>[] = [];

        if (mode === 'ai') {
            // Modo IA: Gerar modelo artificial
            prompt = PROMPTS.singleImage.base
                .replace('{MODEL_DESC}', config.modelDescription || 'a professional model')
                .replace('{SCENARIO_DESC}', config.scenarioDescription || 'professional studio with neutral background');

            images = [{
                inlineData: {
                    mimeType: glassesBlob.type,
                    data: glassesBase64
                }
            }];

        } else {
            // Modo Foto: Usar foto do usuário
            if (!config.userPhotoUrl) throw new Error('Foto do usuário obrigatória para este modo');

            const userPhotoResponse = await fetch(config.userPhotoUrl);
            const userPhotoBlob = await userPhotoResponse.blob();
            const userPhotoBase64 = await blobToBase64(userPhotoBlob);

            const scenarioInstruction = config.keepBackground
                ? PROMPTS.dualImage.keepScenario
                : PROMPTS.dualImage.newScenario.replace('{SCENARIO_DESC}', config.scenarioDescription || 'professional studio');

            prompt = PROMPTS.dualImage.base
                .replace('{SCENARIO_INSTRUCTION}', scenarioInstruction);

            images = [
                {
                    inlineData: {
                        mimeType: userPhotoBlob.type,
                        data: userPhotoBase64
                    }
                },
                {
                    inlineData: {
                        mimeType: glassesBlob.type,
                        data: glassesBase64
                    }
                }
            ];
        }

        // Chamar Gemini API
        const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        ...images
                    ]
                }],
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 4096,
                }
            })
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            throw new Error(`Gemini API error: ${errorText}`);
        }

        const geminiData = await geminiResponse.json();

        // Extrair imagem gerada
        const candidate = geminiData.candidates?.[0];

        console.log('Gemini Status:', candidate?.finishReason);

        if (!candidate) {
            throw new Error('No candidates returned from Gemini. The model might be overloaded or the prompt is invalid.');
        }

        // Verificar motivo de finalização (Filtros de Segurança, Recusa, etc)
        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
            const safetyRatings = candidate.safetyRatings?.map((r: any) => `${r.category}: ${r.probability}`).join(', ');

            // Tentar extrair mensagem de texto se houver, mesmo com bloqueio
            const textPart = candidate.content?.parts?.find((p: any) => p.text)?.text;

            throw new Error(`Geração bloqueada. Motivo: ${candidate.finishReason}. ${textPart ? `Detalhe: ${textPart}` : ''} (Safety: ${safetyRatings})`);
        }

        const generatedImageBase64 = candidate.content?.parts?.[0]?.inlineData?.data;

        if (!generatedImageBase64) {
            // Se não tem imagem, verificar se o modelo respondeu com texto (Ex: "Não posso gerar imagens de pessoas reais...")
            const textResponse = candidate.content?.parts?.[0]?.text;
            if (textResponse) {
                throw new Error(`Gemini recusou a geração: "${textResponse}"`);
            }
            throw new Error('Gemini não retornou imagem nem mensagem de erro clara. Verifique os logs.');
        }

        // Upload para Supabase Storage
        const imageBuffer = Uint8Array.from(atob(generatedImageBase64), c => c.charCodeAt(0));
        const fileName = `${generationId}.png`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('model-generations')
            .upload(fileName, imageBuffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage
            .from('model-generations')
            .getPublicUrl(fileName);

        // Atualizar registro
        await supabase
            .from('model_generations')
            .update({
                result_image_url: publicUrl,
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('id', generationId);

        // Incrementar contador após sucesso
        // Primeiro buscar limites atuais para garantir precisão
        const { data: currentLimits } = await supabase
            .from('model_generation_limits')
            .select('*')
            .eq('profile_id', config.profileId)
            .single();

        if (currentLimits) {
            await supabase
                .from('model_generation_limits')
                .update({
                    daily_count: (currentLimits.daily_count || 0) + 1,
                    monthly_count: (currentLimits.monthly_count || 0) + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('profile_id', config.profileId);
        }

    } catch (error) {
        console.error('Processing error:', error);

        // Atualizar com erro
        await supabase
            .from('model_generations')
            .update({
                status: 'failed',
                error_message: error.message,
                completed_at: new Date().toISOString()
            })
            .eq('id', generationId);
    }
}

async function blobToBase64(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
