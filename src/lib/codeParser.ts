import { Message } from '@/hooks/useChat';

export interface ParsedCode {
  files: Record<string, string>;
  mainFile: string;
  template: 'react-ts' | 'vanilla' | 'static';
}

export const parseCodeFromMessages = (messages: Message[]): ParsedCode => {
  const files: Record<string, string> = {};
  let mainFile = '/App.tsx';
  let template: 'react-ts' | 'vanilla' | 'static' = 'react-ts';
  let hasHtml = false;
  let hasCss = false;
  let hasJs = false;

  // Look for code blocks in assistant messages
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  
  for (const message of assistantMessages) {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      const language = match[1] || 'javascript';
      const code = match[2].trim();
      
      // Determine file name and type based on language and content
      if (language === 'html') {
        files['/index.html'] = code;
        hasHtml = true;
      } else if (language === 'css') {
        files['/styles.css'] = code;
        hasCss = true;
      } else if (language === 'javascript' || language === 'js') {
        files['/script.js'] = code;
        hasJs = true;
      } else if (language === 'typescript' || language === 'tsx') {
        if (code.includes('export default') || code.includes('function App')) {
          files['/App.tsx'] = code;
        }
      } else if (language === 'jsx') {
        if (code.includes('export default') || code.includes('function App')) {
          files['/App.jsx'] = code;
        }
      }
    }
  }

  // Determine template and main file
  if (hasHtml) {
    mainFile = '/index.html';
    template = 'vanilla';
  } else if (files['/App.tsx']) {
    mainFile = '/App.tsx';
    template = 'react-ts';
  } else if (files['/App.jsx']) {
    mainFile = '/App.jsx';
    template = 'react-ts';
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
    template = 'react-ts';
  }

  return { files, mainFile, template };
};
