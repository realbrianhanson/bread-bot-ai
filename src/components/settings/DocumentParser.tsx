import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileUp, FileText, Image, Table, Loader2, CheckCircle2, X, FileSpreadsheet, Presentation } from 'lucide-react';

interface ParsedDocument {
  fileName: string;
  fileType: string;
  pageCount: number;
  content: string;
  tables: number;
  images: number;
  parsedAt: string;
}

const fileTypeIcons: Record<string, React.ElementType> = {
  pdf: FileText,
  docx: FileText,
  xlsx: FileSpreadsheet,
  pptx: Presentation,
  default: FileText,
};

const fileTypeColors: Record<string, string> = {
  pdf: 'bg-red-500/20 text-red-500',
  docx: 'bg-blue-500/20 text-blue-500',
  xlsx: 'bg-green-500/20 text-green-500',
  pptx: 'bg-orange-500/20 text-orange-500',
  default: 'bg-gray-500/20 text-gray-400',
};

export function DocumentParser() {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parsedDoc, setParsedDoc] = useState<ParsedDocument | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|xlsx|pptx)$/i)) {
      return;
    }
    setSelectedFile(file);
    parseDocument(file);
  };

  const parseDocument = (file: File) => {
    setIsParsing(true);
    setParseProgress(0);
    setParsedDoc(null);

    // Simulate parsing progress
    const interval = setInterval(() => {
      setParseProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    // Simulate parsing complete
    setTimeout(() => {
      clearInterval(interval);
      setParseProgress(100);
      
      const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      
      setParsedDoc({
        fileName: file.name,
        fileType: extension,
        pageCount: Math.floor(Math.random() * 20) + 1,
        content: `# Document Content\n\nThis is the extracted content from "${file.name}".\n\n## Summary\n\nThe document contains various sections including an introduction, methodology, results, and conclusions.\n\n### Key Points\n- Point 1: Lorem ipsum dolor sit amet\n- Point 2: Consectetur adipiscing elit\n- Point 3: Sed do eiusmod tempor incididunt\n\n## Tables Found\n\nThe document includes ${Math.floor(Math.random() * 5)} data tables with structured information.\n\n## Images\n\n${Math.floor(Math.random() * 10)} images were extracted and saved.`,
        tables: Math.floor(Math.random() * 5),
        images: Math.floor(Math.random() * 10),
        parsedAt: new Date().toISOString(),
      });
      setIsParsing(false);
    }, 2500);
  };

  const clearDocument = () => {
    setSelectedFile(null);
    setParsedDoc(null);
    setParseProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (type: string) => {
    return fileTypeIcons[type] || fileTypeIcons.default;
  };

  const getFileColor = (type: string) => {
    return fileTypeColors[type] || fileTypeColors.default;
  };

  return (
    <Card className="glass-strong border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="h-5 w-5 text-primary" />
          Document Parser
        </CardTitle>
        <CardDescription>
          Extract content from PDFs, Word docs, Excel, and PowerPoint
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        {!selectedFile && !parsedDoc && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-secondary/30'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx,.pptx"
              onChange={handleFileInput}
              className="hidden"
            />
            <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">Drop a document here or click to upload</p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports PDF, DOCX, XLSX, PPTX (max 50 pages)
            </p>
          </div>
        )}

        {/* Parsing Progress */}
        {isParsing && (
          <div className="space-y-4 p-6 text-center">
            <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin" />
            <div>
              <p className="font-medium">Parsing {selectedFile?.name}</p>
              <p className="text-sm text-muted-foreground">Extracting content, tables, and images...</p>
            </div>
            <Progress value={parseProgress} className="max-w-xs mx-auto" />
          </div>
        )}

        {/* Parsed Result */}
        {parsedDoc && !isParsing && (
          <div className="space-y-4">
            {/* File Info */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = getFileIcon(parsedDoc.fileType);
                  return <Icon className="h-8 w-8" />;
                })()}
                <div>
                  <p className="font-medium">{parsedDoc.fileName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={getFileColor(parsedDoc.fileType)}>
                      {parsedDoc.fileType.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {parsedDoc.pageCount} pages
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={clearDocument}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Extraction Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-secondary/30 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto text-green-500 mb-1" />
                <p className="text-lg font-bold">{parsedDoc.pageCount}</p>
                <p className="text-xs text-muted-foreground">Pages</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 text-center">
                <Table className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                <p className="text-lg font-bold">{parsedDoc.tables}</p>
                <p className="text-xs text-muted-foreground">Tables</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30 text-center">
                <Image className="h-5 w-5 mx-auto text-purple-500 mb-1" />
                <p className="text-lg font-bold">{parsedDoc.images}</p>
                <p className="text-xs text-muted-foreground">Images</p>
              </div>
            </div>

            {/* Content Preview */}
            <div>
              <h4 className="text-sm font-medium mb-2">Extracted Content</h4>
              <ScrollArea className="h-[200px] rounded-lg border border-border bg-secondary/20 p-4">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {parsedDoc.content}
                </pre>
              </ScrollArea>
            </div>

            <Button className="w-full" onClick={clearDocument}>
              Parse Another Document
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
