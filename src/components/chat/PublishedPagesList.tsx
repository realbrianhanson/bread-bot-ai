import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Globe, Copy, Check, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface PublishedPage {
  id: string;
  slug: string;
  title: string | null;
  views: number | null;
  created_at: string | null;
}

const PublishedPagesList = () => {
  const { user } = useAuth();
  const [pages, setPages] = useState<PublishedPage[]>([]);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('shared_previews')
      .select('id, slug, title, views, created_at')
      .eq('user_id', user.id)
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    setPages((data as PublishedPage[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPages(); }, [user]);

  const handleCopy = async (slug: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast.success('URL copied!');
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleUnpublish = async (id: string) => {
    await supabase
      .from('shared_previews')
      .update({ is_published: false })
      .eq('id', id);
    toast.success('Page unpublished');
    fetchPages();
  };

  if (loading || pages.length === 0) return null;

  return (
    <div className="border-b border-border/50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">Published Pages</span>
        <span className="text-[10px] text-muted-foreground">({pages.length})</span>
      </div>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {pages.map((page) => (
          <div key={page.id} className="flex items-center gap-2 group rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{page.title || 'Untitled'}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                <span>/p/{page.slug}</span>
                <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{page.views || 0}</span>
                <span>{page.created_at ? new Date(page.created_at).toLocaleDateString() : ''}</span>
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleCopy(page.slug)}>
              {copiedSlug === page.slug ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleUnpublish(page.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PublishedPagesList;
