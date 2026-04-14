import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Copy, Check, ChevronDown, ChevronUp, Zap, TrendingUp, Lightbulb, Sparkles, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AuditDimension {
  name: string;
  score: number;
  justification: string;
  recommendation: string;
  example: string;
}

interface AuditData {
  dimensions: AuditDimension[];
  overallScore: number;
  quickWins: string[];
  highImpactChanges: string[];
  headlineAlternatives: string[];
  ctaAlternatives: string[];
}

function parseAuditFromMarkdown(content: string): AuditData | null {
  try {
    const dimensions: AuditDimension[] = [];
    const dimensionNames = [
      'VALUE PROPOSITION CLARITY',
      'HEADLINE EFFECTIVENESS',
      'CTA PLACEMENT & COPY',
      'VISUAL HIERARCHY',
      'TRUST SIGNALS',
      'OBJECTION HANDLING',
      'FRICTION POINTS',
    ];

    for (const name of dimensionNames) {
      const regex = new RegExp(`${name.replace(/[&]/g, '&?')}[^]*?(?:Score|score)[:\\s]*\\*?\\*?(\\d+)\\/?10`, 'i');
      const match = content.match(regex);
      const score = match ? parseInt(match[1]) : 5;

      dimensions.push({
        name: name.split('(')[0].trim(),
        score,
        justification: '',
        recommendation: '',
        example: '',
      });
    }

    const overallMatch = content.match(/OVERALL[^]*?(?:SCORE|Score)[:\\s]*\\*?\\*?(\d+)\\?\/?70/i);
    const overallScore = overallMatch ? parseInt(overallMatch[1]) : dimensions.reduce((s, d) => s + d.score, 0);

    const quickWins: string[] = [];
    const qwMatch = content.match(/(?:QUICK WINS|Quick Wins)[^]*?(?=(?:TOP 3 HIGH|HIGH.IMPACT|HEADLINE|$))/i);
    if (qwMatch) {
      const items = qwMatch[0].match(/[-•\d.]\s+.+/g);
      if (items) quickWins.push(...items.map(i => i.replace(/^[-•\d.]+\s*/, '').trim()));
    }

    const highImpactChanges: string[] = [];
    const hiMatch = content.match(/(?:HIGH.IMPACT|High.Impact)[^]*?(?=(?:HEADLINE|CTA ALTERNATIVES|$))/i);
    if (hiMatch) {
      const items = hiMatch[0].match(/[-•\d.]\s+.+/g);
      if (items) highImpactChanges.push(...items.map(i => i.replace(/^[-•\d.]+\s*/, '').trim()));
    }

    const headlineAlternatives: string[] = [];
    const hlMatch = content.match(/(?:HEADLINE ALTERNATIVES|Headline Alternatives)[^]*?(?=(?:CTA ALTERNATIVES|CTA Alternatives|$))/i);
    if (hlMatch) {
      const items = hlMatch[0].match(/[""].+?[""]|[-•\d.]\s+.+/g);
      if (items) headlineAlternatives.push(...items.map(i => i.replace(/^[-•\d.]+\s*/, '').replace(/[""]/g, '').trim()));
    }

    const ctaAlternatives: string[] = [];
    const ctaMatch = content.match(/(?:CTA ALTERNATIVES|CTA Alternatives|CTA Button)[^]*/i);
    if (ctaMatch) {
      const items = ctaMatch[0].match(/[""].+?[""]|[-•\d.]\s+.+/g);
      if (items) ctaAlternatives.push(...items.map(i => i.replace(/^[-•\d.]+\s*/, '').replace(/[""]/g, '').trim()));
    }

    if (dimensions.length === 0) return null;

    return { dimensions, overallScore, quickWins, highImpactChanges, headlineAlternatives, ctaAlternatives };
  } catch {
    return null;
  }
}

function ScoreCircle({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 70 ? 'text-green-500' : pct >= 40 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
        <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={color} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn('text-lg font-bold', color)}>{score}</span>
        <span className="text-[9px] text-muted-foreground">/{max}</span>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 7 ? 'border-green-500/30 text-green-600 bg-green-500/5' :
    score >= 4 ? 'border-amber-500/30 text-amber-600 bg-amber-500/5' :
      'border-red-500/30 text-red-600 bg-red-500/5';
  return (
    <Badge variant="outline" className={cn('text-xs font-bold tabular-nums', color)}>
      {score}/10
    </Badge>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

interface AuditResultsProps {
  content: string;
  url: string;
  onRebuild?: () => void;
  onGenerateCopy?: () => void;
}

export default function AuditResults({ content, url, onRebuild, onGenerateCopy }: AuditResultsProps) {
  const audit = parseAuditFromMarkdown(content);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (!audit || audit.dimensions.length === 0) return null;

  return (
    <div className="mt-3 space-y-3">
      {/* Overall score + dimension scores */}
      <div className="flex items-center gap-4">
        <ScoreCircle score={audit.overallScore} max={70} />
        <div className="flex-1">
          <p className="text-xs font-semibold text-foreground mb-1.5">Conversion Score</p>
          <div className="flex flex-wrap gap-1">
            {audit.dimensions.map((d, i) => (
              <button
                key={i}
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className="group flex items-center gap-1"
                title={d.name}
              >
                <span className="text-[9px] text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[70px]">
                  {d.name.split(' ').slice(0, 2).join(' ')}
                </span>
                <ScoreBadge score={d.score} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expanded dimension detail */}
      {expandedIdx !== null && audit.dimensions[expandedIdx] && (
        <Card className="p-3 bg-muted/20 border-border/40">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-foreground">{audit.dimensions[expandedIdx].name}</p>
            <ScoreBadge score={audit.dimensions[expandedIdx].score} />
          </div>
          <button onClick={() => setExpandedIdx(null)} className="text-[10px] text-muted-foreground hover:text-foreground">
            Close ✕
          </button>
        </Card>
      )}

      {/* Quick wins */}
      {audit.quickWins.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-semibold text-foreground w-full group">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Quick Wins ({audit.quickWins.length})
            <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground group-data-[state=open]:hidden" />
            <ChevronUp className="h-3 w-3 ml-auto text-muted-foreground group-data-[state=closed]:hidden" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1.5 space-y-1">
            {audit.quickWins.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>{w}</span>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* High impact */}
      {audit.highImpactChanges.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-semibold text-foreground w-full group">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            High-Impact Changes ({audit.highImpactChanges.length})
            <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground group-data-[state=open]:hidden" />
            <ChevronUp className="h-3 w-3 ml-auto text-muted-foreground group-data-[state=closed]:hidden" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1.5 space-y-1">
            {audit.highImpactChanges.map((c, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-primary mt-0.5">•</span>
                <span>{c}</span>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Headline alternatives */}
      {audit.headlineAlternatives.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-semibold text-foreground w-full group">
            <Lightbulb className="h-3.5 w-3.5 text-accent" />
            Headline Alternatives ({audit.headlineAlternatives.length})
            <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground group-data-[state=open]:hidden" />
            <ChevronUp className="h-3 w-3 ml-auto text-muted-foreground group-data-[state=closed]:hidden" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1.5 space-y-1">
            {audit.headlineAlternatives.map((h, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs bg-muted/30 rounded-md px-2 py-1.5">
                <span className="text-foreground">{h}</span>
                <CopyButton text={h} />
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* CTA alternatives */}
      {audit.ctaAlternatives.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-semibold text-foreground w-full group">
            <Lightbulb className="h-3.5 w-3.5 text-accent" />
            CTA Alternatives ({audit.ctaAlternatives.length})
            <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground group-data-[state=open]:hidden" />
            <ChevronUp className="h-3 w-3 ml-auto text-muted-foreground group-data-[state=closed]:hidden" />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1.5 space-y-1">
            {audit.ctaAlternatives.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs bg-muted/30 rounded-md px-2 py-1.5">
                <span className="text-foreground">{c}</span>
                <CopyButton text={c} />
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-1">
        {onRebuild && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onRebuild}>
            <Sparkles className="h-3 w-3 mr-1" /> Rebuild This Page
          </Button>
        )}
        {onGenerateCopy && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onGenerateCopy}>
            <Pencil className="h-3 w-3 mr-1" /> Generate Better Copy
          </Button>
        )}
      </div>
    </div>
  );
}
