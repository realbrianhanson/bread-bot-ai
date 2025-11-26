import { Message } from '@/hooks/useChat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <Avatar className="h-8 w-8 border-2 border-primary/20">
          <AvatarFallback className="bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={`rounded-lg px-4 py-3 max-w-[80%] ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/50 backdrop-blur-sm border border-border/50 text-foreground'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
        
        {message.metadata?.screenshots && message.metadata.screenshots.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {message.metadata.screenshots.map((screenshot: string, idx: number) => (
              <img
                key={idx}
                src={screenshot}
                alt={`Screenshot ${idx + 1}`}
                className="rounded border border-border/50 w-full"
              />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <Avatar className="h-8 w-8 border-2 border-primary/20">
          <AvatarFallback className="bg-primary/10">
            <User className="h-4 w-4 text-primary" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default ChatMessage;