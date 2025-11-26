import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor } from 'lucide-react';

interface BrowserPreviewProps {
  screenshots?: string[];
  actions?: Array<{ type: string; timestamp: string; [key: string]: any }>;
}

const BrowserPreview: React.FC<BrowserPreviewProps> = ({ screenshots, actions }) => {
  if (!screenshots?.length && !actions?.length) return null;

  return (
    <Card className="p-4 bg-muted/30 backdrop-blur-sm border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <Monitor className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Browser Activity</h3>
      </div>

      {actions && actions.length > 0 && (
        <div className="space-y-2 mb-3">
          {actions.map((action, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs">
                {action.type}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {new Date(action.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {screenshots && screenshots.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {screenshots.map((screenshot, idx) => (
            <img
              key={idx}
              src={screenshot}
              alt={`Browser screenshot ${idx + 1}`}
              className="rounded border border-border/50 w-full"
            />
          ))}
        </div>
      )}
    </Card>
  );
};

export default BrowserPreview;