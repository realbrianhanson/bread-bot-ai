import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const PublishedPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); return; }

    const load = async () => {
      const { data, error } = await supabase
        .from('shared_previews')
        .select('html_content, title, views')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error || !data) { setNotFound(true); return; }

      document.title = data.title ? `${data.title} — GarlicBread.ai` : 'Published Page — GarlicBread.ai';
      setHtml(data.html_content);

      // fire-and-forget view increment via SECURITY DEFINER RPC (works for anon)
      supabase.rpc('increment_page_views', { p_slug: slug }).then(() => {});
    };

    load();
  }, [slug]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-sans px-6">
        <div className="text-center">
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Page Not Found</h1>
          <p className="text-muted-foreground">This published page doesn't exist, has been unpublished, or has expired.</p>
        </div>
      </div>
    );
  }

  if (html === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="h-8 w-8 rounded-full border-4 border-muted border-t-primary animate-spin" />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html}
      title="Published Page"
      style={{ display: 'block', width: '100vw', height: '100vh', border: 'none', margin: 0, padding: 0 }}
      sandbox="allow-scripts"
    />
  );
};

export default PublishedPage;
