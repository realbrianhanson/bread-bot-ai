import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

const TypingIndicator = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.2 }}
      className="flex gap-2.5 justify-start"
    >
      <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-card border border-border/60 shadow-soft flex items-center gap-3">
        <div className="flex items-center gap-1">
          {[0, 150, 300].map((delay, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 bg-primary/60 rounded-full"
              animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: delay / 1000, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Thinking…</span>
      </div>
    </motion.div>
  );
};

export default TypingIndicator;
