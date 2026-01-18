import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = 'AIzaSyD41-6G4OsmAYf4gzshEALaqwyEPAWeGRg';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

const PROMPTS = {
    singleImage: {
        base: `Generate a photorealistic close-up portrait of a person wearing the glasses shown in the input image.
The generated person's face MUST match this description: {MODEL_DESC}.
The person must be wearing EXACTLY the glasses provided in the image (frames, lens shape, color).
The glasses must be positioned correctly on the nose bridge and ears.
The scenario is: {SCENARIO_DESC}.
The image must have a vertical portrait aspect ratio (3:4).
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
The output image should maintain the original aspect ratio or be a vertical portrait.
Output ONLY one single image.`,
        keepScenario: `Preserve the exact original background and lighting of the "Model Image".`,
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

        // 3. Verificar limites
        const { data: limits, error: limitsError } = await supabase
            .from('model_generation_limits')
            .select('*')
            .eq('profile_id', profile.id)
            .single();

        if (limitsError) {
            // Criar limites se não existir
            const { data: newLimits } = await supabase
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

        // 5. Incrementar contador
        await supabase
            .from('model_generation_limits')
            .update({
                daily_count: (limits?.daily_count || 0) + 1,
                monthly_count: (limits?.monthly_count || 0) + 1,
                updated_at: new Date().toISOString()
            })
            .eq('profile_id', profile.id);

        // 6. Processar com Gemini (assíncrono)
        processWithGemini(generation.id, mode, glassesImageUrl, config, supabase);

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

async function processWithGemini(
    generationId: string,
    mode: string,
    glassesImageUrl: string,
    config: any,
    supabase: any
) {
    try {
        // Baixar imagem dos óculos
        const glassesResponse = await fetch(glassesImageUrl);
        const glassesBlob = await glassesResponse.blob();
        const glassesBase64 = await blobToBase64(glassesBlob);

        let prompt: string;
        let images: any[] = [];

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
        const generatedImageBase64 = geminiData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!generatedImageBase64) {
            throw new Error('No image generated by Gemini');
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
