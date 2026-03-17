import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  // Expanded allowed headers to include additional client and runtime info
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Extract token from Bearer scheme
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Use the extracted token for authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Proceed with request handling
    const { action, profileId, name, description, sites } = await req.json();

    const browserUseApiKey = Deno.env.get('BROWSER_USE_API_KEY');
    if (!browserUseApiKey) {
      throw new Error('Browser Use API key not configured');
    }

    if (action === 'create') {
      console.log('Creating new browser profile:', name);

      const createResponse = await fetch('https://api.browser-use.com/api/v3/browser-profiles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${browserUseApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile_name: name || 'Default Profile' }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Failed to create Browser Use profile:', errorText);
        throw new Error(`Failed to create Browser Use profile: ${errorText}`);
      }

      const browserUseProfile = await createResponse.json();

      const { data: profile, error: insertError } = await supabase
        .from('browser_profiles')
        .insert({
          user_id: user.id,
          name: name || 'Default Profile',
          description: description || '',
          sites: sites || [],
          browser_use_profile_id: browserUseProfile.profile_id,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to insert profile:', insertError);
        throw insertError;
      }

      return new Response(
        JSON.stringify({ success: true, profile }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (action === 'list') {
      console.log('Listing browser profiles for user:', user.id);

      const { data: profiles, error: listError } = await supabase
        .from('browser_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('last_used_at', { ascending: false, nullsFirst: false });

      if (listError) {
        console.error('Failed to list profiles:', listError);
        throw listError;
      }

      return new Response(
        JSON.stringify({ success: true, profiles: profiles || [] }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (action === 'delete') {
      if (!profileId) {
        throw new Error('Profile ID is required for delete action');
      }

      console.log('Deleting browser profile:', profileId);

      const { data: profile, error: getError } = await supabase
        .from('browser_profiles')
        .select('*')
        .eq('id', profileId)
        .eq('user_id', user.id)
        .single();

      if (getError || !profile) {
        throw new Error('Profile not found');
      }

      if (profile.browser_use_profile_id) {
        const deleteResponse = await fetch(
          `https://api.browser-use.com/api/v3/browser-profiles/${profile.browser_use_profile_id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${browserUseApiKey}`,
            },
          }
        );

        if (!deleteResponse.ok) {
          console.error('Failed to delete Browser Use profile, continuing with database deletion');
        }
      }

      const { error: deleteError } = await supabase
        .from('browser_profiles')
        .delete()
        .eq('id', profileId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Failed to delete profile:', deleteError);
        throw deleteError;
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Error managing profile:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
