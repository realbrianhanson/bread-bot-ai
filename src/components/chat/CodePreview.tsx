import { SandpackProvider, SandpackPreview, useSandpack } from '@codesandbox/sandpack-react';
import { Maximize2, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface CodePreviewProps {
  files: Record<string, string>;
  mainFile: string;
  template?: 'react-ts' | 'vanilla' | 'static';
}

const PreviewContent = () => {
  const { sandpack } = useSandpack();
  const isLoading = sandpack.status === 'initial';

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Initializing preview...</p>
          </div>
        </div>
      )}
      <SandpackPreview 
        showNavigator={false}
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
        showOpenNewtab={false}
        showSandpackErrorOverlay={true}
        style={{ 
          height: '100%',
          width: '100%',
          border: 'none',
        }}
      />
    </>
  );
};

const CodePreview = ({ files, mainFile, template = 'react-ts' }: CodePreviewProps) => {
  const [key, setKey] = useState(0);

  console.log('CodePreview rendering:', { 
    filesCount: Object.keys(files).length, 
    files: Object.keys(files),
    mainFile, 
    template 
  });

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  const handleFullscreen = () => {
    const previewFrame = document.querySelector('iframe[title="Sandpack Preview"]');
    if (previewFrame && previewFrame.requestFullscreen) {
      previewFrame.requestFullscreen();
    }
  };

  // Show message if no valid code files
  if (Object.keys(files).length === 0 || (Object.keys(files).length === 1 && files[mainFile]?.includes('Start chatting'))) {
    return (
      <div className="flex flex-col h-full bg-background border border-border/50 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/50">
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

  return (
    <div className="flex flex-col h-full bg-background border border-border/50 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-border/50 bg-background/50">
        <span className="text-xs font-medium">Live Preview</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="h-6 w-6"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFullscreen}
            className="h-6 w-6"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Sandpack Preview */}
      <div className="flex-1 overflow-hidden relative">
        <SandpackProvider
          key={key}
          files={files}
          template={template}
          theme={{
            colors: {
              surface1: '#ffffff',
              surface2: '#f6f6f6',
              surface3: '#e4e4e4',
              clickable: '#999999',
              base: '#323232',
              disabled: '#C5C5C5',
              hover: '#4D4D4D',
              accent: '#0971f1',
              error: '#ff453a',
              errorSurface: '#ffeceb',
            },
            syntax: {
              plain: '#24292e',
              comment: '#6a737d',
              keyword: '#d73a49',
              tag: '#22863a',
              punctuation: '#24292e',
              definition: '#6f42c1',
              property: '#005cc5',
              static: '#032f62',
              string: '#032f62',
            },
            font: {
              body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              mono: '"Fira Mono", "DejaVu Sans Mono", Menlo, Consolas, "Liberation Mono", Monaco, "Lucida Console", monospace',
              size: '13px',
              lineHeight: '20px',
            },
          }}
          customSetup={template === 'react-ts' ? {
            dependencies: {
              'react': '^18.2.0',
              'react-dom': '^18.2.0',
              'lucide-react': 'latest',
            }
          } : undefined}
          options={{
            externalResources: [],
            recompileMode: 'delayed',
            recompileDelay: 300,
            autorun: true,
            autoReload: true,
            initMode: 'lazy',
          }}
        >
          <PreviewContent />
        </SandpackProvider>
      </div>
    </div>
  );
};

export default CodePreview;
