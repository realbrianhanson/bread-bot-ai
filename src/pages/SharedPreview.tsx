import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const SharedPreview = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [ready, setReady] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!shareId) { setNotFound(true); return; }
    document.title = 'Preview — GarlicBread.ai';
    // Verify existence via HEAD so we can show a friendly not-found state.
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-preview?token=${encodeURIComponent(shareId)}`;
    fetch(url, { method: 'GET' })
      .then((r) => { if (!r.ok) setNotFound(true); else setReady(true); })
      .catch(() => setNotFound(true));
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

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="h-8 w-8 rounded-full border-4 border-muted border-t-primary animate-spin" />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <iframe
      src={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-preview?token=${encodeURIComponent(shareId!)}`}
      title="Shared Preview"
      style={{ display: 'block', width: '100vw', height: '100vh', border: 'none', margin: 0, padding: 0 }}
      sandbox="allow-scripts"
    />
  );
};

export default SharedPreview;
