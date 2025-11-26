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

  console.log('Parsing messages:', messages.length);

  // Look for code blocks in assistant messages
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  console.log('Assistant messages:', assistantMessages.length);
  
  for (const message of assistantMessages) {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      const language = match[1] || 'javascript';
      const code = match[2].trim();
      
      console.log('Found code block:', language, 'length:', code.length);
      
      // Determine file name and type based on language and content
      if (language === 'html') {
        files['/index.html'] = code;
        hasHtml = true;
      } else if (language === 'css') {
        files['/src/styles.css'] = code;
        hasCss = true;
      } else if (language === 'javascript' || language === 'js') {
        files['/src/index.js'] = code;
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
    
    // Check if HTML contains any JS code that references an "app" element
    let html = files['/index.html'];
    const needsAppDiv = html && (
      html.includes('getElementById("app")') || 
      html.includes("getElementById('app')") ||
      html.includes('querySelector("#app")') ||
      html.includes("querySelector('#app')")
    );
    
    // Ensure HTML has required app div if it's referenced in the code
    if (needsAppDiv && !html.includes('id="app"')) {
      // Insert the app div right after the opening body tag, before any scripts
      if (html.includes('<body>')) {
        files['/index.html'] = html.replace(/<body([^>]*)>/, '<body$1>\n  <div id="app"></div>');
      } else {
        // If no body tag found, wrap everything in proper HTML structure
        files['/index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
</head>
<body>
  <div id="app"></div>
  ${html}
</body>
</html>`;
      }
    }
  } else if (files['/App.tsx']) {
    mainFile = '/App.tsx';
    template = 'react-ts';
  } else if (files['/App.jsx']) {
    mainFile = '/App.jsx';
    template = 'react-ts';
  }

  console.log('Parsed files:', Object.keys(files));
  console.log('Template:', template);
  console.log('Main file:', mainFile);

  // If no files found, return a default setup
  if (Object.keys(files).length === 0) {
    console.log('No files found, using default');
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
