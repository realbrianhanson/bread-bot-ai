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

      // fire-and-forget view increment
      supabase
        .from('shared_previews')
        .update({ views: (data.views || 0) + 1 })
        .eq('slug', slug)
        .then(() => {});
    };

    load();
  }, [slug]);

  if (notFound) {
    return (
      <div style={{ margin: 0, padding: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Page Not Found</h1>
          <p style={{ color: '#999' }}>This published page doesn't exist or has been unpublished.</p>
        </div>
      </div>
    );
  }

  if (html === null) {
    return (
      <div style={{ margin: 0, padding: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', color: '#fff' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #333', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html}
      title="Published Page"
      style={{ display: 'block', width: '100vw', height: '100vh', border: 'none', margin: 0, padding: 0 }}
      sandbox="allow-scripts allow-same-origin"
    />
  );
};

export default PublishedPage;
