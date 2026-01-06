import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Rocket, 
  Globe, 
  Link, 
  Copy, 
  Check, 
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronUp,
  Server,
  Wifi
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export type DeploymentType = 'static' | 'nextjs' | 'port';

export interface Deployment {
  id: string;
  type: DeploymentType;
  status: 'pending' | 'deploying' | 'live' | 'error';
  url?: string;
  port?: number;
  localDir?: string;
  createdAt: string;
  expiresAt?: string; // For exposed ports
}

interface DeploymentPanelProps {
  deployments: Deployment[];
  onDeploy?: (type: DeploymentType, localDir?: string) => void;
  onExposePort?: (port: number) => void;
  isDeploying?: boolean;
}

const getDeploymentIcon = (type: DeploymentType) => {
  switch (type) {
    case 'static':
      return Globe;
    case 'nextjs':
      return Server;
    case 'port':
      return Wifi;
    default:
      return Rocket;
  }
};

const getStatusBadge = (status: Deployment['status']) => {
  switch (status) {
    case 'live':
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Live</Badge>;
    case 'deploying':
      return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Deploying</Badge>;
    case 'error':
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Error</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};

const DeploymentPanel = ({
  deployments,
  onDeploy,
  onExposePort,
  isDeploying = false
}: DeploymentPanelProps) => {
  const [expanded, setExpanded] = useState(true);
  const [portInput, setPortInput] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast({
      title: "URL copied to clipboard",
      duration: 2000,
    });
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleExposePort = () => {
    const port = parseInt(portInput, 10);
    if (port && port > 0 && port < 65536 && onExposePort) {
      onExposePort(port);
      setPortInput('');
    }
  };

  const liveDeployments = deployments.filter(d => d.status === 'live');
  const hasDeployments = deployments.length > 0;

  return (
    <Card className="border border-border/50 bg-background/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Deployments</span>
          {liveDeployments.length > 0 && (
            <Badge className="bg-green-500/20 text-green-500 text-xs">
              {liveDeployments.length} live
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            {onDeploy && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => onDeploy('static')}
                  disabled={isDeploying}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Deploy Static
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => onDeploy('nextjs')}
                  disabled={isDeploying}
                >
                  <Server className="h-4 w-4 mr-2" />
                  Deploy App
                </Button>
              </>
            )}
          </div>

          {/* Expose Port */}
          {onExposePort && (
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Port (e.g., 3000)"
                value={portInput}
                onChange={(e) => setPortInput(e.target.value)}
                className="h-9"
                min={1}
                max={65535}
              />
              <Button
                size="sm"
                className="h-9"
                onClick={handleExposePort}
                disabled={!portInput || isDeploying}
              >
                <Wifi className="h-4 w-4 mr-1" />
                Expose
              </Button>
            </div>
          )}

          {/* Deployment List */}
          {hasDeployments && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Active Deployments</p>
              {deployments.map((deployment) => {
                const Icon = getDeploymentIcon(deployment.type);
                return (
                  <div
                    key={deployment.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium capitalize">
                            {deployment.type === 'port' ? `Port ${deployment.port}` : deployment.type}
                          </span>
                          {getStatusBadge(deployment.status)}
                        </div>
                        {deployment.url && (
                          <p className="text-xs text-muted-foreground truncate">
                            {deployment.url}
                          </p>
                        )}
                      </div>
                    </div>

                    {deployment.url && deployment.status === 'live' && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => copyToClipboard(deployment.url!)}
                        >
                          {copiedUrl === deployment.url ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => window.open(deployment.url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {deployment.status === 'deploying' && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!hasDeployments && (
            <p className="text-xs text-muted-foreground text-center py-2">
              No active deployments
            </p>
          )}
        </div>
      )}
    </Card>
  );
};

export default DeploymentPanel;
