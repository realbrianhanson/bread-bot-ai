import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { action, userId, query, topic, title, content, sourceUrls, tags, sourceTaskId, entryId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'search': {
        if (!query) {
          return new Response(JSON.stringify({ error: 'query is required for search' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabaseClient.rpc('search_knowledge_entries', {
          p_user_id: userId,
          p_query: query,
        });

        if (error) {
          // Fallback to simple ILIKE search if the RPC doesn't exist yet
          const { data: fallbackData, error: fallbackError } = await supabaseClient
            .from('knowledge_entries')
            .select('*')
            .eq('user_id', userId)
            .or(`topic.ilike.%${query}%,title.ilike.%${query}%,content.ilike.%${query}%`)
            .order('updated_at', { ascending: false })
            .limit(10);

          if (fallbackError) {
            return new Response(JSON.stringify({ error: fallbackError.message }), {
              status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          return new Response(JSON.stringify({ entries: fallbackData || [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ entries: data || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'store': {
        if (!topic || !title || !content) {
          return new Response(JSON.stringify({ error: 'topic, title, and content are required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabaseClient
          .from('knowledge_entries')
          .insert({
            user_id: userId,
            topic,
            title,
            content,
            source_urls: sourceUrls || [],
            tags: tags || [],
            source_task_id: sourceTaskId || null,
          })
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ entry: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'list': {
        let q = supabaseClient
          .from('knowledge_entries')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (topic) {
          q = q.eq('topic', topic);
        }

        const { data, error } = await q.limit(100);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ entries: data || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        if (!entryId) {
          return new Response(JSON.stringify({ error: 'entryId is required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabaseClient
          .from('knowledge_entries')
          .delete()
          .eq('id', entryId)
          .eq('user_id', userId);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'clear': {
        const { error } = await supabaseClient
          .from('knowledge_entries')
          .delete()
          .eq('user_id', userId);

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Knowledge base error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
