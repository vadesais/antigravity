
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId } = await req.json()

    if (!userId) {
      throw new Error('User ID is required')
    }

    // 1. Clean up Storage files
    // Strategy: List files in buckets that might belong to the user.
    // Since buckets like 'glasses-images' might not be perfectly partitioned by folder,
    // we should rely on database references OR specific naming conventions if possible.
    // However, simplest safe approach for "wipe everything" is:
    // A. Delete 'model-generations' files (if they match user_id or profile_id)
    // B. Delete 'glasses-images' files? (Checking 'glasses' table first is safer)

    // Delete Glasses Images
    const { data: glasses } = await supabaseAdmin
      .from('glasses')
      .select('image_url, temple_url')
      .eq('store_id', userId) // Assuming store_id is profile_id. Wait, userId passed here is Auth ID or Profile ID?
    // Master Panel passes Profile ID usually. But Auth deletion needs Auth ID.
    // Let's assume we receive Profile ID (which is UUID). We need to get Auth ID.

    // Get Auth ID from Profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('id', userId) // userId here is profile UUID from MasterPanel
      .single()

    const targetAuthId = profile?.user_id
    const targetProfileId = userId

    // --- MANUALLY DELETE ALL RELATED DATA TO PREVENT FK ERRORS ---

    // 1. Storage Cleanup (Keep existing logic)
    if (glasses && glasses.length > 0) {
      const filesToDelete: string[] = []
      glasses.forEach((g: any) => {
        if (g.image_url) {
          const match = g.image_url.match(/\/glasses-images\/(.+)$/)
          if (match) filesToDelete.push(match[1])
        }
        if (g.temple_url) {
          const match = g.temple_url.match(/\/glasses-images\/(.+)$/)
          if (match) filesToDelete.push(match[1])
        }
      })

      if (filesToDelete.length > 0) {
        await supabaseAdmin.storage.from('glasses-images').remove(filesToDelete)
      }
    }

    // 2. Database Cleanup (Order matters if no CASCADE)

    // A. Delete Glasses
    await supabaseAdmin.from('glasses').delete().eq('store_id', targetProfileId)

    // B. Delete Model Generations
    await supabaseAdmin.from('model_generations').delete().eq('profile_id', targetProfileId)

    // C. Delete Limits
    await supabaseAdmin.from('model_generation_limits').delete().eq('profile_id', targetProfileId)

    // D. Delete User Roles (Needs Auth ID)
    if (targetAuthId) {
      await supabaseAdmin.from('user_roles').delete().eq('user_id', targetAuthId)
    }

    // 3. Delete User from Auth (This Cascades to public.profiles usually)
    if (targetAuthId) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        targetAuthId
      )
      if (deleteError) {
        console.error("Auth delete error", deleteError)
        // If Auth delete fails, try deleting profile manually as fallback
        // but throw mostly.
        throw deleteError
      }
    } else {
      // If no auth ID (maybe consistency issue), try delete profile manually
      const { error: deleteProfileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', targetProfileId)
      if (deleteProfileError) throw deleteProfileError
    }

    return new Response(
      JSON.stringify({ message: 'User deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
