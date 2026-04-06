import { Badge } from '@/components/ui/badge';
import { Target, AlertTriangle, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompetitorAnalysisProps {
  analysis: {
    businessType: string;
    valueProposition: string;
    overallScore: number;
    colorScheme: string[];
    sections: string[];
    strengths: string[];
    weaknesses: string[];
    missingElements: string[];
  };
  competitorUrl: string;
}

const CompetitorAnalysis = ({ analysis, competitorUrl }: CompetitorAnalysisProps) => {
  const scoreColor = analysis.overallScore >= 70
    ? 'text-green-500'
    : analysis.overallScore >= 40
      ? 'text-amber-500'
      : 'text-red-500';

  const scoreRingColor = analysis.overallScore >= 70
    ? 'stroke-green-500'
    : analysis.overallScore >= 40
      ? 'stroke-amber-500'
      : 'stroke-red-500';

  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (analysis.overallScore / 100) * circumference;

  return (
    <div className="mt-3 rounded-xl border border-border/50 bg-card/80 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-b border-border/30 flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Competitor Analysis</span>
        <Badge variant="outline" className="text-[10px] ml-auto">{new URL(competitorUrl).hostname}</Badge>
      </div>

      <div className="p-4 space-y-4">
        {/* Score + Business Type */}
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            <svg className="transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                className={scoreRingColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={cn('text-lg font-bold', scoreColor)}>{analysis.overallScore}</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Business Type</p>
            <p className="text-sm font-medium truncate">{analysis.businessType}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{analysis.valueProposition}</p>
          </div>
        </div>

        {/* Color Scheme */}
        {analysis.colorScheme.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Color Palette</p>
            <div className="flex gap-1.5">
              {analysis.colorScheme.map((color, i) => (
                <div
                  key={i}
                  className="h-6 w-6 rounded-md border border-border/30 shadow-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sections Found */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Star className="h-3 w-3" /> Sections Found</p>
          <div className="flex flex-wrap gap-1">
            {analysis.sections.map((s, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
            ))}
          </div>
        </div>

        {/* Weaknesses */}
        {analysis.weaknesses.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-500" /> Weaknesses Found</p>
            <ul className="space-y-1">
              {analysis.weaknesses.map((w, i) => (
                <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing Elements */}
        {analysis.missingElements.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Zap className="h-3 w-3 text-primary" /> Missing Elements (we'll add these)</p>
            <div className="flex flex-wrap gap-1">
              {analysis.missingElements.map((e, i) => (
                <Badge key={i} variant="outline" className="text-[10px] border-primary/30 text-primary">{e}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetitorAnalysis;
