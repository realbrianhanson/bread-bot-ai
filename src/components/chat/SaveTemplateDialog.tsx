import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const CATEGORIES = ['Lead Gen', 'SaaS', 'Event', 'Local Business', 'Portfolio', 'E-commerce', 'Custom'];

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: Record<string, string>;
}

export function SaveTemplateDialog({ open, onOpenChange, files }: SaveTemplateDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Custom');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    try {
      // Extract HTML/CSS/JS from files
      let html = '', css = '', js = '';
      for (const [path, content] of Object.entries(files)) {
        if (path.endsWith('.html')) html = content;
        else if (path.endsWith('.css')) css += content + '\n';
        else if (path.endsWith('.js') || path.endsWith('.ts') || path.endsWith('.tsx') || path.endsWith('.jsx')) {
          if (!content.includes('createRoot') && !content.includes('ReactDOM')) {
            js += content + '\n';
          }
        }
      }

      // If no separate HTML, build from the main component
      if (!html) {
        const mainFile = Object.entries(files).find(([p]) => p.includes('App'));
        if (mainFile) html = mainFile[1];
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('extract-template', {
        body: { html, css, js, name: name.trim(), category },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Template saved! It\'s now available in your style picker.');
      onOpenChange(false);
      setName('');
      setCategory('Custom');
    } catch (err: any) {
      console.error('Save template error:', err);
      toast.error(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Extract this page's design patterns into a reusable template
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Template Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., AI Consulting Landing Page"
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Category</label>
            <Select value={category} onValueChange={setCategory} disabled={saving}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={!name.trim() || saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Extracting design patterns...
              </>
            ) : (
              'Save Template'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
