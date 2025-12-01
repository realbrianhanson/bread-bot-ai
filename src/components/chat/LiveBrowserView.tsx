import { Card } from '@/components/ui/card';
import { Monitor, Loader2 } from 'lucide-react';
import BrowserPreview from './BrowserPreview';

interface LiveBrowserViewProps {
  liveUrl?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  screenshots?: string[];
  actions?: Array<{ type: string; timestamp: string; [key: string]: any }>;
}

const LiveBrowserView = ({ liveUrl, status, screenshots, actions }: LiveBrowserViewProps) => {
  // Show live browser when running and we have a live URL
  if (status === 'running' && liveUrl) {
    return (
      <Card className="p-4 bg-muted/30 backdrop-blur-sm border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <Monitor className="h-4 w-4 animate-pulse text-green-500" />
          <h3 className="font-semibold text-sm">Live Browser Session</h3>
          <div className="flex items-center gap-1 ml-auto text-xs text-green-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Active</span>
          </div>
        </div>
        
        <div className="relative bg-black rounded-lg overflow-hidden border border-border/50">
          <iframe 
            src={liveUrl}
            className="w-full h-[500px]"
            allow="clipboard-write"
            title="Live Browser Automation"
          />
        </div>

        {actions && actions.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            <p>Latest action: {actions[actions.length - 1]?.type}</p>
          </div>
        )}
      </Card>
    );
  }

  // Show loading state when pending
  if (status === 'pending') {
    return (
      <Card className="p-4 bg-muted/30 backdrop-blur-sm border-border/50">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Starting browser session...</span>
        </div>
      </Card>
    );
  }

  // Fall back to screenshots after completion or failure
  if (status === 'completed' || status === 'failed') {
    return <BrowserPreview screenshots={screenshots} actions={actions} />;
  }

  return null;
};

export default LiveBrowserView;
