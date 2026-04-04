import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  UserPlus, ShoppingCart, Video, Calendar, CheckCircle,
  PlayCircle, Clock, BarChart, Search, Pencil, X, LayoutGrid,
} from 'lucide-react';
import {
  GHL_TEMPLATES,
  CATEGORY_LABELS,
  type GHLTemplate,
  type GHLTemplateCategory,
} from '@/lib/ghlTemplates';

const CATEGORY_ICONS: Record<GHLTemplateCategory, typeof UserPlus> = {
  'lead-capture': UserPlus,
  sales: ShoppingCart,
  webinar: Video,
  booking: Calendar,
  thankyou: CheckCircle,
  vsl: PlayCircle,
  'coming-soon': Clock,
  'case-study': BarChart,
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as GHLTemplateCategory[];

interface GHLTemplateGalleryProps {
  onSelectTemplate: (prompt: string) => void;
  onClose?: () => void;
  inline?: boolean; // when true, renders as an inline section (empty state), not a panel
}

const GHLTemplateGallery = ({ onSelectTemplate, onClose, inline = false }: GHLTemplateGalleryProps) => {
  const [activeCategory, setActiveCategory] = useState<GHLTemplateCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = GHL_TEMPLATES;
    if (activeCategory !== 'all') {
      list = list.filter((t) => t.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategory, search]);

  const handleSelect = (template: GHLTemplate) => {
    setSelectedId(template.id);
    onSelectTemplate(template.prompt);
  };

  const Wrapper = inline ? 'div' : motion.div;
  const wrapperProps = inline
    ? { className: 'flex flex-col items-center gap-4 px-4 py-6 w-full max-w-2xl mx-auto' }
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 },
        className: 'flex flex-col gap-3 p-4 w-full max-w-2xl mx-auto',
      };

  return (
    <Wrapper {...(wrapperProps as any)}>
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Badge className="text-[10px] h-5 gap-1 bg-accent/15 text-accent border-accent/30 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            GHL Mode
          </Badge>
          {inline && (
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Choose a Template</h3>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {!inline && (
        <p className="text-xs text-muted-foreground -mt-1">
          Pick a pre-built design — it sends the perfect prompt to generate a polished GHL page.
        </p>
      )}

      {/* Search + category filter */}
      <div className="w-full space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-card/60 border-border/40"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn(
              'px-2 py-1 rounded-md text-[10px] font-medium transition-colors',
              activeCategory === 'all'
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            All
          </button>
          {ALL_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'px-2 py-1 rounded-md text-[10px] font-medium transition-colors flex items-center gap-1',
                  activeCategory === cat
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <Icon className="h-2.5 w-2.5" />
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
        {filtered.map((template) => {
          const Icon = CATEGORY_ICONS[template.category];
          const isSelected = selectedId === template.id;
          return (
            <motion.button
              key={template.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(template)}
              className={cn(
                'flex flex-col gap-2 p-3 rounded-xl border text-left transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border/50 bg-card/60 hover:border-primary/30 hover:bg-primary/[0.03]'
              )}
            >
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 gap-1 border-border/40 text-muted-foreground font-normal"
                >
                  <Icon className="h-2.5 w-2.5" />
                  {CATEGORY_LABELS[template.category]}
                </Badge>
                <div className="flex items-center gap-1">
                  {[template.colorScheme.primary, template.colorScheme.accent, template.colorScheme.bgDark].map(
                    (c, i) => (
                      <span
                        key={i}
                        className="w-2.5 h-2.5 rounded-full border border-border/30"
                        style={{ backgroundColor: c }}
                      />
                    )
                  )}
                </div>
              </div>
              <span className="text-xs font-medium text-foreground leading-tight">{template.name}</span>
              <span className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                {template.description}
              </span>
            </motion.button>
          );
        })}

        {/* Custom card */}
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setSelectedId('custom');
            onSelectTemplate('');
          }}
          className={cn(
            'flex flex-col gap-2 p-3 rounded-xl border text-left transition-colors items-center justify-center min-h-[90px]',
            selectedId === 'custom'
              ? 'border-primary bg-primary/5'
              : 'border-dashed border-border/50 bg-card/30 hover:border-primary/30 hover:bg-primary/[0.03]'
          )}
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Custom Page</span>
          <span className="text-[10px] text-muted-foreground">Describe from scratch</span>
        </motion.button>
      </div>

      {filtered.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-6">No templates match your search.</p>
      )}
    </Wrapper>
  );
};

export default GHLTemplateGallery;
