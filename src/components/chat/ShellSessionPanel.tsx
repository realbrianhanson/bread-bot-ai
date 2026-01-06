import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Terminal, 
  Square, 
  Play, 
  Clock, 
  X,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface ShellSession {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'waiting' | 'completed' | 'error';
  workingDir: string;
  output: string[];
  lastCommand?: string;
  startedAt?: string;
}

interface ShellSessionPanelProps {
  sessions: ShellSession[];
  activeSessionId?: string;
  onSelectSession?: (sessionId: string) => void;
  onKillProcess?: (sessionId: string) => void;
  onWriteInput?: (sessionId: string, input: string) => void;
  isKilling?: boolean;
  isSending?: boolean;
}

const getStatusBadge = (status: ShellSession['status']) => {
  switch (status) {
    case 'running':
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Running</Badge>;
    case 'waiting':
      return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Waiting</Badge>;
    case 'completed':
      return <Badge className="bg-muted text-muted-foreground">Completed</Badge>;
    case 'error':
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Error</Badge>;
    default:
      return <Badge variant="outline">Idle</Badge>;
  }
};

const ShellSessionPanel = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onKillProcess,
  onWriteInput,
  isKilling = false,
  isSending = false
}: ShellSessionPanelProps) => {
  const [expanded, setExpanded] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  if (sessions.length === 0) return null;

  const handleSendInput = () => {
    if (inputValue.trim() && activeSession && onWriteInput) {
      onWriteInput(activeSession.id, inputValue);
      setInputValue('');
    }
  };

  return (
    <Card className="border border-border/50 bg-background/80 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Shell Sessions</span>
          <Badge variant="secondary" className="text-xs">
            {sessions.length}
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="p-3">
          {sessions.length === 1 ? (
            // Single session view
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-muted-foreground">
                    {activeSession?.workingDir}
                  </span>
                  {getStatusBadge(activeSession?.status || 'idle')}
                </div>
                {activeSession?.status === 'running' && onKillProcess && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7"
                    onClick={() => onKillProcess(activeSession.id)}
                    disabled={isKilling}
                  >
                    {isKilling ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Square className="h-3 w-3 fill-current" />
                    )}
                    <span className="ml-1 text-xs">Kill</span>
                  </Button>
                )}
              </div>

              {/* Output */}
              <ScrollArea className="h-[200px] rounded bg-muted/30 border border-border/30">
                <div className="p-3 font-mono text-xs">
                  {activeSession?.output.map((line, idx) => (
                    <div key={idx} className="text-muted-foreground whitespace-pre-wrap">
                      {line}
                    </div>
                  ))}
                  {activeSession?.status === 'running' && (
                    <div className="flex items-center gap-1 text-green-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Running...</span>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input for waiting processes */}
              {activeSession?.status === 'waiting' && onWriteInput && (
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Enter input..."
                    className="font-mono text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleSendInput()}
                  />
                  <Button
                    size="sm"
                    onClick={handleSendInput}
                    disabled={isSending || !inputValue.trim()}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            // Multiple sessions - tabs view
            <Tabs value={activeSessionId || sessions[0]?.id} onValueChange={onSelectSession}>
              <TabsList className="w-full justify-start h-8 bg-muted/30">
                {sessions.map((session) => (
                  <TabsTrigger
                    key={session.id}
                    value={session.id}
                    className="text-xs data-[state=active]:bg-background"
                  >
                    <div className="flex items-center gap-1">
                      <span>{session.name}</span>
                      {session.status === 'running' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      )}
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>

              {sessions.map((session) => (
                <TabsContent key={session.id} value={session.id} className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {session.workingDir}
                      </span>
                      {getStatusBadge(session.status)}
                    </div>
                    {session.status === 'running' && onKillProcess && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7"
                        onClick={() => onKillProcess(session.id)}
                        disabled={isKilling}
                      >
                        {isKilling ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Square className="h-3 w-3 fill-current" />
                        )}
                        <span className="ml-1 text-xs">Kill</span>
                      </Button>
                    )}
                  </div>

                  <ScrollArea className="h-[180px] rounded bg-muted/30 border border-border/30">
                    <div className="p-3 font-mono text-xs">
                      {session.output.map((line, idx) => (
                        <div key={idx} className="text-muted-foreground whitespace-pre-wrap">
                          {line}
                        </div>
                      ))}
                      {session.status === 'running' && (
                        <div className="flex items-center gap-1 text-green-500">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Running...</span>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {session.status === 'waiting' && onWriteInput && (
                    <div className="flex gap-2">
                      <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Enter input..."
                        className="font-mono text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleSendInput()}
                      />
                      <Button
                        size="sm"
                        onClick={handleSendInput}
                        disabled={isSending || !inputValue.trim()}
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      )}
    </Card>
  );
};

export default ShellSessionPanel;
