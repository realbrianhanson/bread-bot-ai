import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: 'hsl(262, 83%, 58%)',
    primaryTextColor: '#fff',
    primaryBorderColor: 'hsl(262, 83%, 48%)',
    lineColor: 'hsl(220, 100%, 65%)',
    secondaryColor: 'hsl(240, 10%, 15%)',
    tertiaryColor: 'hsl(240, 10%, 20%)',
  },
  flowchart: {
    curve: 'basis',
  },
});

const MermaidDiagram = ({ chart }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;
      
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError('Failed to render diagram');
      }
    };

    renderDiagram();
  }, [chart]);

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="my-4 p-4 bg-card/50 rounded-lg border border-border/50 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default MermaidDiagram;
