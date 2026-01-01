import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Clock, Lock, HelpCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export type ChallengeType = 'auth' | 'complexity' | 'time' | 'access' | 'unknown';
export type ChallengeSeverity = 'low' | 'medium' | 'high';

export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  severity: ChallengeSeverity;
  mitigation?: string;
}

interface ChallengeIdentificationProps {
  challenges: Challenge[];
  isAnalyzing?: boolean;
}

const getChallengeIcon = (type: ChallengeType) => {
  switch (type) {
    case 'auth':
      return Lock;
    case 'complexity':
      return HelpCircle;
    case 'time':
      return Clock;
    case 'access':
      return Shield;
    case 'unknown':
    default:
      return AlertTriangle;
  }
};

const getSeverityColor = (severity: ChallengeSeverity) => {
  switch (severity) {
    case 'high':
      return 'text-red-500 bg-red-500/10 border-red-500/30';
    case 'medium':
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    case 'low':
      return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
  }
};

const getSeverityBadge = (severity: ChallengeSeverity) => {
  switch (severity) {
    case 'high':
      return 'bg-red-500/20 text-red-500';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-500';
    case 'low':
      return 'bg-blue-500/20 text-blue-500';
  }
};

const ChallengeIdentification = ({ challenges, isAnalyzing = false }: ChallengeIdentificationProps) => {
  const [isOpen, setIsOpen] = useState(true);

  if (challenges.length === 0 && !isAnalyzing) return null;

  const highSeverityCount = challenges.filter(c => c.severity === 'high').length;

  return (
    <Card className={`backdrop-blur-sm border ${highSeverityCount > 0 ? 'bg-red-500/5 border-red-500/30' : 'bg-yellow-500/5 border-yellow-500/30'}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-4 w-4 ${highSeverityCount > 0 ? 'text-red-500' : 'text-yellow-500'}`} />
            <h3 className="font-semibold text-sm">Potential Challenges</h3>
            {challenges.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {challenges.length}
              </Badge>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            {isAnalyzing && challenges.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Analyzing potential risks...</span>
              </div>
            )}
            
            {challenges.map((challenge) => {
              const Icon = getChallengeIcon(challenge.type);
              const colorClass = getSeverityColor(challenge.severity);
              
              return (
                <div
                  key={challenge.id}
                  className={`p-3 rounded-lg border ${colorClass}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{challenge.title}</p>
                        <Badge className={`text-[10px] ${getSeverityBadge(challenge.severity)}`}>
                          {challenge.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{challenge.description}</p>
                      {challenge.mitigation && (
                        <p className="text-xs text-foreground/70 mt-2 pl-2 border-l-2 border-current/30">
                          <span className="font-medium">Mitigation: </span>
                          {challenge.mitigation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ChallengeIdentification;
