import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { Terminal, Copy, Check, Download, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GeneratedFile {
  name: string;
  url: string;
  type: string;
}

interface CodeExecutionResultProps {
  code: string;
  language?: string;
  stdout?: string;
  stderr?: string;
  result?: string;
  executionTime?: number;
  files?: GeneratedFile[];
}

const CodeExecutionResult = ({
  code,
  language = 'python',
  stdout,
  stderr,
  result,
  executionTime,
  files,
}: CodeExecutionResultProps) => {
  const [copied, setCopied] = useState(false);
  const [codeExpanded, setCodeExpanded] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeLines = code.split('\n').length;
  const showCodeToggle = codeLines > 8;
  const displayCode = showCodeToggle && !codeExpanded
    ? code.split('\n').slice(0, 8).join('\n') + '\n...'
    : code;

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden border border-border/60 shadow-soft my-2"
    >
      {/* Terminal title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(220_13%_11%)] border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[hsl(0_72%_51%)]" />
            <div className="w-3 h-3 rounded-full bg-[hsl(45_93%_47%)]" />
            <div className="w-3 h-3 rounded-full bg-[hsl(142_71%_45%)]" />
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" />
            <span className="text-xs font-mono font-medium">Code Execution</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {executionTime != null && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
              <Clock className="h-3 w-3" />
              {executionTime < 1000 ? `${executionTime}ms` : `${(executionTime / 1000).toFixed(1)}s`}
            </span>
          )}
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={copyCode}>
            {copied ? <><Check className="h-3 w-3 mr-1" />Copied</> : <><Copy className="h-3 w-3 mr-1" />Copy</>}
          </Button>
        </div>
      </div>

      {/* Code block */}
      <div className="relative">
        <SyntaxHighlighter
          style={oneDark as any}
          language={language}
          PreTag="div"
          customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.8rem', background: 'hsl(220 13% 14%)', maxHeight: codeExpanded ? 'none' : '220px' }}
        >
          {displayCode}
        </SyntaxHighlighter>
        {showCodeToggle && (
          <button
            onClick={() => setCodeExpanded(!codeExpanded)}
            className="w-full py-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground bg-[hsl(220_13%_14%)] border-t border-border/20 flex items-center justify-center gap-1 transition-colors"
          >
            {codeExpanded ? <><ChevronUp className="h-3 w-3" />Show less</> : <><ChevronDown className="h-3 w-3" />Show all {codeLines} lines</>}
          </button>
        )}
      </div>

      {/* Output area */}
      {(stdout || result) && (
        <div className="bg-[hsl(220_13%_8%)] border-t border-border/30 px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-mono mb-1.5">Output</div>
          <pre className="text-[hsl(142_71%_45%)] text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
            {stdout || result}
          </pre>
        </div>
      )}

      {/* Stderr */}
      {stderr && (
        <div className="bg-[hsl(0_50%_8%)] border-t border-[hsl(0_50%_20%)] px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-[hsl(0_72%_51%)] font-mono mb-1.5">Error</div>
          <pre className="text-[hsl(0_72%_65%)] text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
            {stderr}
          </pre>
        </div>
      )}

      {/* Generated files */}
      {files && files.length > 0 && (
        <div className="bg-card border-t border-border/30 px-4 py-3 space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-mono mb-2">Generated Files</div>
          <div className="space-y-2">
            {files.filter(f => isImage(f.type)).map((file, i) => (
              <img key={i} src={file.url} alt={file.name} className="rounded-lg border border-border/50 max-w-full max-h-80 object-contain" />
            ))}
            {files.filter(f => !isImage(f.type)).map((file, i) => (
              <a
                key={i}
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <Download className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                <span className="text-sm font-mono text-foreground truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground ml-auto">{file.type.split('/')[1]?.toUpperCase()}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CodeExecutionResult;
