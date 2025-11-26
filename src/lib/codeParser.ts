import { Message } from '@/hooks/useChat';

export interface ParsedCode {
  files: Record<string, string>;
  mainFile: string;
}

export const parseCodeFromMessages = (messages: Message[]): ParsedCode => {
  const files: Record<string, string> = {};
  let mainFile = '/App.tsx';

  // Look for code blocks in assistant messages
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  
  for (const message of assistantMessages) {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      const language = match[1] || 'javascript';
      const code = match[2].trim();
      
      // Determine file name and type based on language and content
      let fileName = '/App.tsx';
      
      if (language === 'typescript' || language === 'tsx') {
        fileName = '/App.tsx';
        mainFile = '/App.tsx';
      } else if (language === 'javascript' || language === 'jsx') {
        fileName = '/App.jsx';
        mainFile = '/App.jsx';
      } else if (language === 'css') {
        fileName = '/styles.css';
      } else if (language === 'html') {
        fileName = '/index.html';
        mainFile = '/index.html';
      }
      
      // Check if code looks like a complete component
      if (code.includes('export default') || code.includes('function App')) {
        files[fileName] = code;
      } else if (language === 'css') {
        files[fileName] = code;
      } else if (language === 'html') {
        files[fileName] = code;
      }
    }
  }

  // If no files found, return a default setup
  if (Object.keys(files).length === 0) {
    files['/App.tsx'] = `export default function App() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Preview</h1>
      <p className="text-muted-foreground mt-2">
        Start chatting with the AI to generate code that will appear here!
      </p>
    </div>
  );
}`;
    mainFile = '/App.tsx';
  }

  return { files, mainFile };
};
