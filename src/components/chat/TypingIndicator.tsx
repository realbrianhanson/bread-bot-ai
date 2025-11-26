import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot } from 'lucide-react';

const TypingIndicator = () => {
  return (
    <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Avatar className="h-8 w-8 border-2 border-primary/20">
        <AvatarFallback className="bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </AvatarFallback>
      </Avatar>

      <div className="rounded-lg px-4 py-3 bg-muted/50 backdrop-blur-sm border border-border/50">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
