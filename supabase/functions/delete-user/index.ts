import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. VERIFY AUTHORIZATION MANUALLY (To avoid Gateway 401 issues)
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Não autorizado: Token ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with user's token to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error('Failed to verify token:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callingUserId = claimsData.claims.sub;

    // Check if user is master
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData, error: roleCheckError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUserId)
      .eq('role', 'master')
      .single();

    if (roleCheckError || !roleData) {
      console.error('User is not master:', roleCheckError);
      return new Response(
        JSON.stringify({ error: 'Apenas usuários master podem excluir óticas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. PARSE REQUEST AND EXECUTE DELETE
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    // 3. STORAGE CLEANUP
    // Collect all files to delete first
    const filesToDelete: string[] = [];

    // A. Glasses Images
    const { data: glasses } = await supabaseAdmin
      .from('glasses')
      .select('image_url, temple_url')
      .eq('store_id', userId);

    if (glasses && glasses.length > 0) {
      glasses.forEach((g: any) => {
        if (g.image_url) {
          const match = g.image_url.match(/\/glasses-images\/(.+)$/);
          if (match) filesToDelete.push(match[1]);
        }
        if (g.temple_url) {
          const match = g.temple_url.match(/\/glasses-images\/(.+)$/);
          if (match) filesToDelete.push(match[1]);
        }
      });
    }

    // B. Profile Images (Banner, Logo)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_id, banner_url, store_logo_url, store_logo_rect_url')
      .eq('id', userId)
      .single();

    if (profile) {
      if (profile.banner_url) {
        const match = profile.banner_url.match(/\/glasses-images\/(.+)$/);
        if (match) filesToDelete.push(match[1]);
      }
      if (profile.store_logo_url) {
        const match = profile.store_logo_url.match(/\/glasses-images\/(.+)$/);
        if (match) filesToDelete.push(match[1]);
      }
      if (profile.store_logo_rect_url) {
        const match = profile.store_logo_rect_url.match(/\/glasses-images\/(.+)$/);
        if (match) filesToDelete.push(match[1]);
      }
    }

    if (filesToDelete.length > 0) {
      // Remove duplicates just in case
      const uniqueFiles = [...new Set(filesToDelete)];
      await supabaseAdmin.storage.from('glasses-images').remove(uniqueFiles);
    }

    const targetAuthId = profile?.user_id;
    const targetProfileId = userId;

    // 4. DATABASE CLEANUP
    // A. Delete Glasses (Delete first as they might reference categories)
    await supabaseAdmin.from('glasses').delete().eq('store_id', targetProfileId);

    // B. Delete Categories (Missed this previously!)
    await supabaseAdmin.from('categories').delete().eq('store_id', targetProfileId);

    // C. Delete WhatsApp Contacts
    await supabaseAdmin.from('whatsapp_contacts').delete().eq('store_id', targetProfileId);

    // D. Delete Model Generations
    await supabaseAdmin.from('model_generations').delete().eq('profile_id', targetProfileId);

    // E. Delete Limits
    await supabaseAdmin.from('model_generation_limits').delete().eq('profile_id', targetProfileId);

    // F. Delete User Roles
    if (targetAuthId) {
      await supabaseAdmin.from('user_roles').delete().eq('user_id', targetAuthId);
    }

    // 5. DELETE USER (Auth + Profile)
    // 5. DELETE USER (Auth + Profile)
    // We explicitly delete the profile first to ensure it's removed even if Auth delete fails or isn't cascaded.
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', targetProfileId);

    if (deleteProfileError) {
      console.error("Error deleting profile row:", deleteProfileError);
      throw deleteProfileError;
    }

    if (targetAuthId) {
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetAuthId);
      if (deleteAuthError) {
        // If user is not found, it means they were already deleted (Ghost profile scenario). 
        // We can ignore this error since the profile is already gone.
        console.warn("Auth deletion warning (ignorable if user already gone):", deleteAuthError);
      }
    }

    return new Response(
      JSON.stringify({ message: 'User deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error executing delete-user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
