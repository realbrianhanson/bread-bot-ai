import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Megaphone, X, Target, CreditCard, Calendar, MapPin, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface MarketingTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  marketing_md: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Target: <Target className="h-4 w-4" />,
  CreditCard: <CreditCard className="h-4 w-4" />,
  Calendar: <Calendar className="h-4 w-4" />,
  MapPin: <MapPin className="h-4 w-4" />,
  Mail: <Mail className="h-4 w-4" />,
};

interface PurposePickerProps {
  selectedId: string | null;
  onSelect: (id: string | null, md?: string, category?: string) => void;
  disabled?: boolean;
}

export function PurposePicker({ selectedId, onSelect, disabled }: PurposePickerProps) {
  const [templates, setTemplates] = useState<MarketingTemplate[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase
      .from('marketing_templates')
      .select('id, name, description, category, icon, marketing_md')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setTemplates(data as MarketingTemplate[]);
      });
  }, []);

  const selected = templates.find((t) => t.id === selectedId);

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                disabled={disabled}
                className={cn(
                  'shrink-0 mb-0.5 p-1.5 rounded-lg transition-colors',
                  'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  selectedId && 'text-accent',
                  disabled && 'opacity-30 pointer-events-none'
                )}
              >
                <Megaphone className="h-4 w-4" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Page Purpose</p>
          </TooltipContent>
        </Tooltip>

        <PopoverContent className="w-80 p-3" align="start" side="top">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Page Purpose</h4>
              {selectedId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Controls WHAT the page does — conversion rules, copy frameworks, section order.
            </p>
            <div className="grid gap-1.5 max-h-64 overflow-y-auto">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelect(t.id, t.marketing_md, t.category || undefined);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full text-left p-2.5 rounded-lg border transition-all',
                    selectedId === t.id
                      ? 'border-accent bg-accent/5'
                      : 'border-border/40 hover:border-border hover:bg-muted/30'
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="shrink-0 mt-0.5 text-muted-foreground">
                      {ICON_MAP[t.icon || ''] || <Target className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground truncate">{t.name}</span>
                        {t.category && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                            {t.category}
                          </Badge>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
