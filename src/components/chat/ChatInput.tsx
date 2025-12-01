import { useState, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Square } from 'lucide-react';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
}

const ChatInput = ({
  onSend,
  disabled = false,
  isStreaming = false,
  onStop,
}) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message or /browse to automate... (Shift + Enter for new line)"
        disabled={disabled}
        className="min-h-[60px] max-h-[200px] resize-none bg-background/50 backdrop-blur-sm border-border/50"
        rows={2}
      />
      
      {isStreaming ? (
        <Button
          onClick={onStop}
          variant="destructive"
          size="icon"
          className="h-[60px] w-[60px] shrink-0"
        >
          <Square className="h-5 w-5" />
        </Button>
      ) : (
        <Button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          size="icon"
          className="h-[60px] w-[60px] shrink-0"
        >
          <Send className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default ChatInput;