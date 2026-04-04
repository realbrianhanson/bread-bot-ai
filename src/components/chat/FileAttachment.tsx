import { FileText, Image, Table, FileSpreadsheet, FileJson, File, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatFile {
  name: string;
  size: number;
  type: string;
  url?: string;
  preview?: string; // text preview or CSV rows
  thumbnailUrl?: string; // for images
}

interface FileAttachmentProps {
  file: ChatFile;
  variant?: 'chip' | 'message';
  onRemove?: () => void;
}

const FILE_ICONS: Record<string, typeof FileText> = {
  'text/csv': Table,
  'application/json': FileJson,
  'text/plain': FileText,
  'text/markdown': FileText,
  'application/pdf': FileText,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': FileSpreadsheet,
  'application/vnd.ms-excel': FileSpreadsheet,
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image;
  return FILE_ICONS[type] || File;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Chip variant — shown above chat input before sending
export const FileChip = ({ file, onRemove }: { file: File; onRemove: () => void }) => {
  const Icon = file.type.startsWith('image/') ? Image : getFileIcon(file.type);
  return (
    <div className="flex items-center gap-2 bg-muted/60 border border-border/50 rounded-lg px-3 py-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="truncate max-w-[140px] text-foreground">{file.name}</span>
      <span className="text-muted-foreground text-xs shrink-0">{formatSize(file.size)}</span>
      <button onClick={onRemove} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// Message variant — shown inside chat messages
const FileAttachment = ({ file }: FileAttachmentProps) => {
  const Icon = getFileIcon(file.type);
  const isImage = file.type.startsWith('image/');

  return (
    <div className="mt-2 rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
      {isImage && file.thumbnailUrl && (
        <img
          src={file.thumbnailUrl}
          alt={file.name}
          className="max-w-[300px] w-full object-contain bg-background"
        />
      )}
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm truncate flex-1 text-foreground">{file.name}</span>
        <span className="text-xs text-muted-foreground shrink-0">{formatSize(file.size)}</span>
        {file.url && (
          <a href={file.url} download={file.name} className="text-primary hover:text-primary/80 transition-colors">
            <Download className="h-4 w-4" />
          </a>
        )}
      </div>
      {/* Text/CSV preview snippet */}
      {file.preview && (
        <div className="px-3 pb-2">
          <pre className="text-xs text-muted-foreground font-mono bg-background/50 rounded-lg p-2 max-h-[120px] overflow-auto whitespace-pre-wrap">
            {file.preview}
          </pre>
        </div>
      )}
    </div>
  );
};

export default FileAttachment;
