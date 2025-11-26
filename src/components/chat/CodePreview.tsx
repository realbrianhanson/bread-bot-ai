import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';
import { Maximize2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface CodePreviewProps {
  files: Record<string, string>;
  mainFile: string;
  template?: 'react-ts' | 'vanilla' | 'static';
}

const CodePreview = ({ files, mainFile, template = 'react-ts' }: CodePreviewProps) => {
  const [key, setKey] = useState(0);

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  const handleFullscreen = () => {
    const previewFrame = document.querySelector('iframe[title="Sandpack Preview"]');
    if (previewFrame && previewFrame.requestFullscreen) {
      previewFrame.requestFullscreen();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border border-border/50 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background/50">
        <span className="text-sm font-medium">Live Preview</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="h-8 w-8"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFullscreen}
            className="h-8 w-8"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sandpack Preview */}
      <div className="flex-1 overflow-hidden bg-white">
        <SandpackProvider
          key={key}
          files={files}
          template={template}
          theme="light"
        >
          <SandpackPreview 
            showNavigator={false}
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
            style={{ 
              height: '100%',
              width: '100%',
            }}
          />
        </SandpackProvider>
      </div>
    </div>
  );
};

export default CodePreview;
