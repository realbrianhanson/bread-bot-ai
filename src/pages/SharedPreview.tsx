import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const SharedPreview = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!shareId) { setNotFound(true); return; }

    const load = async () => {
      const { data, error } = await supabase
        .from('shared_previews')
        .select('html_content, title, share_id')
        .eq('share_id', shareId)
        .single();

      if (error || !data) { setNotFound(true); return; }

      document.title = data.title ? `${data.title} — GarlicBread.ai` : 'Preview — GarlicBread.ai';
      setHtml(data.html_content);

      // fire-and-forget view increment via SECURITY DEFINER RPC (only touches views column)
      supabase.rpc('increment_preview_views', { p_share_id: data.share_id }).then(() => {});
    };

    load();
  }, [shareId]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-sans px-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">This link has expired</h1>
          <p className="text-muted-foreground">Shared preview links are valid for 7 days. Ask the sender to republish for a fresh link.</p>
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
      title="Shared Preview"
      style={{ display: 'block', width: '100vw', height: '100vh', border: 'none', margin: 0, padding: 0 }}
      sandbox="allow-scripts"
    />
  );
};

export default SharedPreview;
