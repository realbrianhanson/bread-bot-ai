import { useState, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface DesignTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  preview_colors: string[] | null;
  is_default: boolean | null;
}

interface StylePickerProps {
  selectedId: string | null;
  onSelect: (id: string | null, customMd?: string) => void;
  disabled?: boolean;
}

export function StylePicker({ selectedId, onSelect, disabled }: StylePickerProps) {
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customMd, setCustomMd] = useState('');

  useEffect(() => {
    supabase
      .from('design_templates')
      .select('id, name, description, category, preview_colors, is_default')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setTemplates(data as DesignTemplate[]);
      });
  }, []);

  const selected = templates.find((t) => t.id === selectedId);
  const defaultTemplate = templates.find((t) => t.is_default);

  const displayName = selected?.name || defaultTemplate?.name || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
            <div className="grid grid-cols-2 gap-2">
              {templates.map((t) => {
                const isSelected = selectedId === t.id || (!selectedId && t.is_default);
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelect(t.is_default ? null : t.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'text-left p-3 rounded-lg border transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-foreground truncate">
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
                    {t.category && (
                      <span className="text-[10px] text-muted-foreground">{t.category}</span>
                    )}
                  </button>
                );
              })}
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
