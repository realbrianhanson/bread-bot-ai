import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Brain, Globe, LogIn, AlertCircle, Clock, Trash2, Key, Sparkles, FileEdit } from 'lucide-react';
import { useState } from 'react';

export interface SiteKnowledge {
  domain: string;
  loginMethod?: 'form' | 'oauth' | 'sso' | 'magic-link';
  loginUrl?: string;
  requiresLogin?: boolean;
  notes?: string[];
  quirks?: string[];
  lastUsed?: string;
  successRate?: number;
}

interface SiteKnowledgePanelProps {
  sites: SiteKnowledge[];
  onDeleteSite?: (domain: string) => void;
  compact?: boolean;
}

const SiteKnowledgePanel = ({ sites, onDeleteSite, compact = false }: SiteKnowledgePanelProps) => {
  const [isOpen, setIsOpen] = useState(!compact);

  if (sites.length === 0) return null;

  const getLoginIcon = (method?: string) => {
    switch (method) {
      case 'oauth':
      case 'sso':
        return <Key className="h-3 w-3" />;
      case 'magic-link':
        return <Sparkles className="h-3 w-3" />;
      case 'form':
      default:
        return <FileEdit className="h-3 w-3" />;
    }
  };

  return (
    <Card className="bg-cyan-500/10 backdrop-blur-sm border-cyan-500/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-cyan-500/10 transition-colors">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-cyan-500" />
            <h3 className="font-semibold text-sm">Site Knowledge</h3>
            <Badge variant="secondary" className="text-xs bg-cyan-500/20 text-cyan-500">
              {sites.length} {sites.length === 1 ? 'site' : 'sites'}
            </Badge>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Remembered information about sites you've automated.
            </p>
            
            {sites.map((site) => (
              <div 
                key={site.domain}
                className="p-3 rounded-lg border border-cyan-500/20 bg-background/50 space-y-2"
              >
                {/* Site Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-cyan-500" />
                    <span className="font-mono text-sm">{site.domain}</span>
                  </div>
                  {onDeleteSite && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onDeleteSite(site.domain)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                {/* Login Info */}
                {site.requiresLogin && (
                  <div className="flex items-center gap-2 text-xs">
                    <LogIn className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Login:</span>
                    <Badge variant="outline" className="text-[10px]">
                      {getLoginIcon(site.loginMethod)} {site.loginMethod || 'form'}
                    </Badge>
                    {site.loginUrl && (
                      <span className="font-mono text-muted-foreground/70 truncate max-w-[150px]">
                        {site.loginUrl}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Quirks/Notes */}
                {site.quirks && site.quirks.length > 0 && (
                  <div className="space-y-1">
                    {site.quirks.map((quirk, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs">
                        <AlertCircle className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{quirk}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Notes */}
                {site.notes && site.notes.length > 0 && (
                  <div className="space-y-1">
                    {site.notes.map((note, index) => (
                      <p key={index} className="text-xs text-muted-foreground/70">
                        • {note}
                      </p>
                    ))}
                  </div>
                )}
                
                {/* Footer Stats */}
                <div className="flex items-center gap-4 pt-1 border-t border-border/30 text-[10px] text-muted-foreground">
                  {site.lastUsed && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Last: {new Date(site.lastUsed).toLocaleDateString()}</span>
                    </div>
                  )}
                  {site.successRate !== undefined && (
                    <div className="flex items-center gap-1">
                      <span className={site.successRate > 80 ? 'text-green-500' : site.successRate > 50 ? 'text-yellow-500' : 'text-red-500'}>
                        {site.successRate}% success
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default SiteKnowledgePanel;
