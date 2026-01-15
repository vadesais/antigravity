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
    // Get the authorization header to verify the calling user is a master
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify they are master
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the calling user using getClaims instead of getUser
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

    // Check if user is master using service role client
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roleData, error: roleCheckError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', callingUserId)
      .eq('role', 'master')
      .single();

    if (roleCheckError || !roleData) {
      console.error('User is not master:', roleCheckError);
      return new Response(
        JSON.stringify({ error: 'Apenas usuários master podem criar óticas' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { 
      email, 
      password, 
      storeName, 
      allowCamera, 
      allowImage, 
      allowVisagismo,
      allowAi,
      plan, 
      isBlocked 
    } = await req.json();
    
    if (!email || !password || !storeName) {
      return new Response(
        JSON.stringify({ error: 'Email, senha e nome da loja são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating admin user for store: ${storeName}`);

    // Create user using admin client (service role)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { store_name: storeName }
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = authData.user.id;
    console.log(`User created with ID: ${newUserId}`);

    // Add admin role using service role
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role: 'admin',
      });

    if (roleError) {
      console.error('Error adding role:', roleError);
      // Try to clean up the created user
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: 'Erro ao adicionar role: ' + roleError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin role added successfully');

    // Update profile with additional settings (profile is created by trigger)
    // Wait a moment for the trigger to execute
    await new Promise(resolve => setTimeout(resolve, 500));

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        allow_camera: allowCamera ?? true,
        allow_image: allowImage ?? false,
        allow_visagismo: allowVisagismo ?? false,
        allow_ai: allowAi ?? false,
        is_blocked: isBlocked ?? false,
        plan: plan ?? '1_month',
      })
      .eq('user_id', newUserId);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Don't fail completely, profile can be updated later
    } else {
      console.log('Profile updated successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUserId,
        message: `Ótica "${storeName}" criada com sucesso!`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});