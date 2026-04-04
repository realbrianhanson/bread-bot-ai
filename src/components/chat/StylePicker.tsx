import { useState, useEffect } from 'react';
import { Palette, Check, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DesignTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  preview_colors: string[] | null;
  is_default: boolean | null;
  source: string | null;
  marketing_md: string | null;
}

interface StylePickerProps {
  selectedId: string | null;
  onSelect: (id: string | null, customMd?: string, marketingMd?: string) => void;
  disabled?: boolean;
}

export function StylePicker({ selectedId, onSelect, disabled }: StylePickerProps) {
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customMd, setCustomMd] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchTemplates = () => {
    supabase
      .from('design_templates')
      .select('id, name, description, category, preview_colors, is_default, source, marketing_md')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setTemplates(data as DesignTemplate[]);
      });
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const userTemplates = templates.filter((t) => t.source === 'user_created');
  const globalTemplates = templates.filter((t) => t.source !== 'user_created');

  const selected = templates.find((t) => t.id === selectedId);
  const defaultTemplate = templates.find((t) => t.is_default);
  const displayName = selected?.name || defaultTemplate?.name || null;

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('design_templates').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete template');
    } else {
      toast.success('Template deleted');
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (selectedId === id) onSelect(null);
    }
    setConfirmDelete(null);
  };

  const TemplateCard = ({ t }: { t: DesignTemplate }) => {
    const isSelected = selectedId === t.id || (!selectedId && t.is_default);
    const isUserCreated = t.source === 'user_created';

    return (
      <div className="relative group">
        <button
          onClick={() => {
            onSelect(
              t.is_default ? null : t.id,
              undefined,
              t.marketing_md || undefined
            );
            setOpen(false);
          }}
          className={cn(
            'text-left w-full p-3 rounded-lg border transition-all',
            isSelected
              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
              : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
          )}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-foreground truncate pr-4">
              {t.name}
            </span>
            {isSelected && <Check className="h-3 w-3 text-primary shrink-0" />}
          </div>
          {t.preview_colors && (
            <div className="flex gap-1 mb-1.5">
              {t.preview_colors.map((color, i) => (
                <div
                  key={i}
                  className="h-3 w-3 rounded-full border border-border/30"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {isUserCreated && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium">Custom</span>
            )}
            {t.category && (
              <span className="text-[10px] text-muted-foreground">{t.category}</span>
            )}
          </div>
        </button>
        {isUserCreated && (
          confirmDelete === t.id ? (
            <div className="absolute -top-1 -right-1 flex gap-0.5 z-10">
              <button
                onClick={() => handleDelete(t.id)}
                className="p-1 rounded bg-destructive text-destructive-foreground text-[10px] font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="p-1 rounded bg-muted text-muted-foreground text-[10px]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(t.id); }}
              className="absolute top-1.5 right-1.5 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-opacity"
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </button>
          )
        )}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirmDelete(null); }}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            'shrink-0 mb-0.5 p-1.5 rounded-lg transition-colors',
            'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            disabled && 'opacity-30 pointer-events-none',
            selectedId && 'text-primary'
          )}
          title={displayName ? `Style: ${displayName}` : 'Choose design style'}
        >
          <Palette className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-[360px] max-h-[420px] overflow-y-auto p-3"
      >
        <h4 className="text-sm font-semibold text-foreground mb-2">Design Style</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Choose a pre-built design system for generated pages
        </p>

        {!showCustom ? (
          <>
            {/* My Templates Section */}
            {userTemplates.length > 0 ? (
              <div className="mb-3">
                <h5 className="text-xs font-medium text-foreground mb-1">My Templates</h5>
                <p className="text-[10px] text-muted-foreground mb-2">(from your saved pages)</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {userTemplates.map((t) => (
                    <TemplateCard key={t.id} t={t} />
                  ))}
                </div>
                <div className="border-b border-border/30 mb-2" />
              </div>
            ) : (
              <div className="mb-3 p-2 rounded-lg bg-muted/30 text-[10px] text-muted-foreground">
                💡 Save any page as a template using the bookmark icon in the preview
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {globalTemplates.map((t) => (
                <TemplateCard key={t.id} t={t} />
              ))}
            </div>
            <button
              onClick={() => setShowCustom(true)}
              className="mt-2 w-full text-left p-2 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
            >
              ✏️ Paste custom DESIGN.md...
            </button>
          </>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={customMd}
              onChange={(e) => setCustomMd(e.target.value)}
              placeholder="Paste your DESIGN.md content here..."
              className="text-xs min-h-[160px] font-mono"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowCustom(false)}
                className="flex-1 text-xs"
              >
                Back
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (customMd.trim()) {
                    onSelect('custom', customMd.trim());
                    setOpen(false);
                  }
                }}
                disabled={!customMd.trim()}
                className="flex-1 text-xs"
              >
                Apply Custom
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
