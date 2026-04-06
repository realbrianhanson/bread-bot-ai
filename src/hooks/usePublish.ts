import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function generateSlug(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 6; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

export function usePublish(activeCode: { html: string; css: string; js: string } | null, conversationId?: string) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  // Check if already published for this conversation
  useEffect(() => {
    if (!conversationId) { setPublishedSlug(null); return; }

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('shared_previews')
        .select('slug')
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId)
        .eq('is_published', true)
        .maybeSingle();

      setPublishedSlug(data?.slug || null);
    };

    check();
  }, [conversationId]);

  const buildFullHTML = useCallback((): string => {
    if (!activeCode) return '';
    const { html, css, js } = activeCode;

    if (html.toLowerCase().includes('<!doctype') || html.toLowerCase().includes('<html')) {
      let fullHtml = html;
      if (css.trim()) {
        fullHtml = fullHtml.replace('</head>', `<style>\n${css}\n</style>\n</head>`);
      }
      if (js.trim()) {
        fullHtml = fullHtml.replace('</body>', `<script>\n${js}\n</script>\n</body>`);
      }
      return fullHtml;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  ${css.trim() ? `<style>\n${css}\n</style>` : ''}
</head>
<body>
${html}
${js.trim() ? `<script>\n${js}\n</script>` : ''}
</body>
</html>`;
  }, [activeCode]);

  const publish = useCallback(async () => {
    if (!activeCode) return;
    setIsPublishing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Please sign in to publish.'); return; }

      const fullHtml = buildFullHTML();
      const titleMatch = fullHtml.match(/<title[^>]*>([^<]+)<\/title>/i) || fullHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const title = titleMatch?.[1]?.trim() || 'Untitled Page';

      let currentSlug = publishedSlug;

      if (currentSlug) {
        await supabase
          .from('shared_previews')
          .update({ html_content: fullHtml, title })
          .eq('slug', currentSlug)
          .eq('user_id', user.id);
        
        const url = `${window.location.origin}/p/${currentSlug}`;
        await navigator.clipboard.writeText(url);
        toast.success('Page updated!', { description: url });
      } else {
        currentSlug = generateSlug();
        const { error } = await supabase
          .from('shared_previews')
          .insert({
            user_id: user.id,
            html_content: fullHtml,
            title,
            conversation_id: conversationId || null,
            is_published: true,
            slug: currentSlug,
          });
        if (error) throw error;
        setPublishedSlug(currentSlug);

        const url = `${window.location.origin}/p/${currentSlug}`;
        await navigator.clipboard.writeText(url);
        toast.success('Page published!', { description: `${url} — copied to clipboard` });
      }
    } catch (err) {
      console.error('Publish error:', err);
      toast.error('Failed to publish page.');
    } finally {
      setIsPublishing(false);
    }
  }, [activeCode, publishedSlug, conversationId, buildFullHTML]);

  return { publish, isPublishing, publishedSlug };
}
