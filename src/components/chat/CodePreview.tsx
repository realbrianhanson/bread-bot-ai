import { SandpackProvider, SandpackLayout, SandpackPreview } from '@codesandbox/sandpack-react';
import { Maximize2, RefreshCw, Copy, Download, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface CodePreviewProps {
  files: Record<string, string>;
  mainFile: string;
  template?: 'react-ts' | 'vanilla' | 'static';
}

const SandpackWithFallback = ({ files, template, onFallback }: {
  files: Record<string, string>;
  template: 'react-ts';
  onFallback: () => void;
}) => {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
      onFallback();
    }, 8000);
    return () => clearTimeout(timer);
  }, [onFallback]);

  if (timedOut) return null;

  return (
    <SandpackProvider
      files={files}
      template={template}
      style={{ height: '100%' }}
      theme={{
        colors: {
          surface1: '#ffffff', surface2: '#f6f6f6', surface3: '#e4e4e4',
          clickable: '#999999', base: '#323232', disabled: '#C5C5C5',
          hover: '#4D4D4D', accent: '#0971f1', error: '#ff453a', errorSurface: '#ffeceb',
        },
        syntax: {
          plain: '#24292e', comment: '#6a737d', keyword: '#d73a49', tag: '#22863a',
          punctuation: '#24292e', definition: '#6f42c1', property: '#005cc5',
          static: '#032f62', string: '#032f62',
        },
        font: {
          body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          mono: '"Fira Mono", "DejaVu Sans Mono", Menlo, Consolas, monospace',
          size: '13px', lineHeight: '20px',
        },
      }}
      customSetup={{
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0',
          'lucide-react': 'latest',
        }
      }}
      options={{
        externalResources: [
          'https://cdn.tailwindcss.com',
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
        ],
        recompileMode: 'delayed',
        recompileDelay: 300,
        autorun: true,
        autoReload: true,
        initMode: 'immediate',
      }}
    >
      <SandpackLayout style={{ height: '100%', border: 'none' }}>
        <SandpackPreview
          showNavigator={false}
          showOpenInCodeSandbox={false}
          showRefreshButton={false}
          showOpenNewtab={false}
          showSandpackErrorOverlay={true}
          style={{ height: '100%', width: '100%', border: 'none' }}
        />
      </SandpackLayout>
    </SandpackProvider>
  );
};

const CodePreview = ({ files, mainFile, template = 'react-ts' }: CodePreviewProps) => {
  const [key, setKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isStatic = template === 'static' || template === 'vanilla';

  const buildCombinedHTML = useCallback((): string => {
    let css = '';
    let js = '';
    let html = '';

    for (const [path, content] of Object.entries(files)) {
      if (path.endsWith('.css')) {
        css += content + '\n';
      } else if (path.endsWith('.js') || path.endsWith('.ts')) {
        if (!content.includes('createRoot') && !content.includes('ReactDOM')) {
          js += content + '\n';
        }
      } else if (path.endsWith('.html')) {
        html = content;
      }
    }

    let bodyContent = html;
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      bodyContent = bodyMatch[1].trim();
    }

    if (!bodyContent && files[mainFile]) {
      const mainContent = files[mainFile];
      const returnMatch = mainContent.match(/return\s*\(\s*([\s\S]*?)\s*\);?\s*}/);
      if (returnMatch) {
        bodyContent = `<!-- Generated from React component — may need manual adjustment -->\n${returnMatch[1]}`;
      } else {
        bodyContent = `<div id="app">\n  <!-- Paste your content here -->\n</div>`;
      }
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Page</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
    }
${css.split('\n').map(l => '    ' + l).join('\n')}
  </style>
</head>
<body>
${bodyContent}
${js.trim() ? `\n  <script>\n${js.split('\n').map(l => '    ' + l).join('\n')}\n  <\/script>` : ''}
</body>
</html>`;
  }, [files, mainFile]);

  const handleRefresh = () => {
    setKey(prev => prev + 1);
    setUseFallback(false);
  };

  const handleFullscreen = () => {
    const el = iframeRef.current || document.querySelector('iframe[title="Sandpack Preview"]');
    if (el && el.requestFullscreen) {
      el.requestFullscreen();
    }
  };

  const handleCopyForGHL = async () => {
    const html = buildCombinedHTML();
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('HTML copied! Paste into a GHL Custom Code element on a blank page.');
  };

  const handleDownloadHTML = () => {
    const html = buildCombinedHTML();
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `website-${date}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('HTML file downloaded.');
  };

  // Empty state
  if (Object.keys(files).length === 0 || (Object.keys(files).length === 1 && files[mainFile]?.includes('Start chatting'))) {
    return (
      <div className="absolute inset-0 flex flex-col bg-background">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/50 shrink-0">
          <span className="text-sm font-medium">Live Preview</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <h3 className="text-lg font-semibold mb-2">No Code to Preview</h3>
            <p className="text-muted-foreground">
              Chat with AI to generate code that will appear here as a live preview
            </p>
          </div>
        </div>
      </div>
    );
  }

  const Toolbar = () => (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-background/50 shrink-0 z-20">
      <span className="text-xs font-medium">Live Preview</span>
      <div className="flex gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleCopyForGHL} className="h-6 w-6">
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[220px] text-xs">
            Copies self-contained HTML ready to paste into GoHighLevel's Custom Code block.
          </TooltipContent>
        </Tooltip>
        <Button variant="ghost" size="icon" onClick={handleDownloadHTML} className="h-6 w-6">
          <Download className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleRefresh} className="h-6 w-6">
          <RefreshCw className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleFullscreen} className="h-6 w-6">
          <Maximize2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  // Static/vanilla: use iframe srcdoc directly (no Sandpack)
  if (isStatic || useFallback) {
    return (
      <div className="absolute inset-0 flex flex-col bg-background">
        <Toolbar />
        <div className="flex-1 relative">
          <iframe
            key={key}
            ref={iframeRef}
            srcDoc={buildCombinedHTML()}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title="Preview"
          />
        </div>
      </div>
    );
  }

  // React template: try Sandpack with fallback
  return (
    <div className="absolute inset-0 flex flex-col bg-background">
      <Toolbar />
      <div className="flex-1 relative">
        <SandpackWithFallback
          key={key}
          files={files}
          mainFile={mainFile}
          template="react-ts"
          buildHTML={buildCombinedHTML}
          onFallback={() => setUseFallback(true)}
        />
      </div>
    </div>
  );
};

export default CodePreview;
