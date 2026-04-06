import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { validateWebsite, hasCodeBlocks, extractCodeFromResponse } from '@/lib/validateWebsite';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  created_at: string;
}

const TEXT_TYPES = ['text/csv', 'application/json', 'text/plain', 'text/markdown'];

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function parseCSVPreview(file: File): Promise<{ preview: string; totalRows: number; totalColumns: number }> {
  const text = await readFileAsText(file);
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = result.data as Record<string, unknown>[];
  const columns = result.meta.fields || [];
  const previewRows = rows.slice(0, 20);
  const header = columns.join(' | ');
  const separator = columns.map(() => '---').join(' | ');
  const body = previewRows.map((r) => columns.map((c) => String(r[c] ?? '')).join(' | ')).join('\n');
  return {
    preview: `${header}\n${separator}\n${body}`,
    totalRows: rows.length,
    totalColumns: columns.length,
  };
}

async function parseXLSXPreview(file: File): Promise<{ preview: string; totalRows: number; totalColumns: number }> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as string[][];
  if (data.length === 0) return { preview: '(empty spreadsheet)', totalRows: 0, totalColumns: 0 };
  const columns = data[0].map(String);
  const rows = data.slice(1);
  const previewRows = rows.slice(0, 20);
  const header = columns.join(' | ');
  const separator = columns.map(() => '---').join(' | ');
  const body = previewRows.map((r) => columns.map((_, i) => String(r[i] ?? '')).join(' | ')).join('\n');
  return {
    preview: `${header}\n${separator}\n${body}`,
    totalRows: rows.length,
    totalColumns: columns.length,
  };
}

async function buildFileContext(files: File[], userId: string, conversationId: string): Promise<{ context: string; uploadedFiles: Array<{ name: string; size: number; type: string; url: string; preview?: string }> }> {
  const parts: string[] = [];
  const uploadedFiles: Array<{ name: string; size: number; type: string; url: string; preview?: string }> = [];

  for (const file of files) {
    const storagePath = `${userId}/${conversationId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('chat-uploads')
      .upload(storagePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from('chat-uploads')
      .getPublicUrl(storagePath);

    const url = urlData?.publicUrl || '';
    const sizeStr = formatSize(file.size);
    let preview: string | undefined;

    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      try {
        const csv = await parseCSVPreview(file);
        parts.push(`The user has uploaded a file called ${file.name} (CSV, ${sizeStr}). Here are the first 20 rows of the data:\n\n${csv.preview}\n\nThe full file has ${csv.totalRows} rows and ${csv.totalColumns} columns. The full file is available at ${url}`);
        preview = csv.preview;
      } catch {
        const text = await readFileAsText(file);
        parts.push(`The user has uploaded a file called ${file.name} (CSV, ${sizeStr}). Here is the content:\n\n${text.slice(0, 5000)}`);
        preview = text.slice(0, 200);
      }
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      try {
        const xlsx = await parseXLSXPreview(file);
        parts.push(`The user has uploaded a file called ${file.name} (XLSX, ${sizeStr}). Here are the first 20 rows of the data:\n\n${xlsx.preview}\n\nThe full file has ${xlsx.totalRows} rows and ${xlsx.totalColumns} columns. The full file is available at ${url}`);
        preview = xlsx.preview;
      } catch {
        parts.push(`The user has uploaded a file called ${file.name} (XLSX, ${sizeStr}). The file is available at ${url}`);
      }
    } else if (TEXT_TYPES.includes(file.type) || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.txt')) {
      const text = await readFileAsText(file);
      parts.push(`The user has uploaded a file called ${file.name} (${file.type || 'text'}, ${sizeStr}). Here is the content:\n\n${text.slice(0, 10000)}`);
      preview = text.slice(0, 200);
    } else if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|svg|gif)$/i.test(file.name)) {
      parts.push(`The user has uploaded an image called ${file.name} (${file.type}, ${sizeStr}).\n\nIMAGE URL FOR USE IN GENERATED CODE: ${url}\n\nWhen generating HTML, use this exact URL in <img> tags wherever this image should appear. Example: <img src="${url}" alt="${file.name}" class="..." />`);
      preview = url;
    } else {
      parts.push(`The user has uploaded a file called ${file.name} (${file.type}, ${sizeStr}). The file is available at ${url}`);
    }

    uploadedFiles.push({ name: file.name, size: file.size, type: file.type, url, preview });
  }

  return { context: parts.join('\n\n---\n\n'), uploadedFiles };
}

export const useChat = (projectId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInspirationLoading, setIsInspirationLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [activeCode, setActiveCode] = useState<{ html: string; css: string; js: string } | null>(null);
  const { user } = useAuth();
  const { canSendMessage, refreshSubscription } = useSubscription();
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const conversationCategoryRef = useRef<string | null>(null);

  // Load messages from database
  useEffect(() => {
    if (!user || !projectId) {
      setMessages([]);
      messagesRef.current = [];
      conversationCategoryRef.current = null;
      setIsHistoryLoading(false);
      return;
    }

    let isCancelled = false;
    setMessages([]);
    messagesRef.current = [];
    setIsHistoryLoading(true);

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        if (!isCancelled) {
          toast({
            title: 'Error',
            description: 'Failed to load chat history',
            variant: 'destructive',
          });
          setIsHistoryLoading(false);
        }
        return;
      }

      const loaded = (data || []) as Message[];

      if (isCancelled) return;

      setMessages(loaded);
      messagesRef.current = loaded;
      setIsHistoryLoading(false);
    };

    loadMessages();

    const channel = supabase
      .channel(`messages-changes-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          if (payload.eventType !== 'DELETE' && (payload.new as any).user_id !== user.id) return;

          if (payload.eventType === 'INSERT') {
            setMessages((prev) => {
              if (prev.some(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Message;
            setMessages((prev) => prev.map((m) => m.id === updated.id ? updated : m));
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, projectId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const executeCode = useCallback(
    async (code: string, userContent: string) => {
      if (!user) return;

      await supabase.from('messages').insert({
        user_id: user.id,
        project_id: projectId,
        role: 'user',
        content: userContent,
      });

      const runningId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: runningId,
          role: 'assistant',
          content: '⏳ Executing code in sandbox...',
          created_at: new Date().toISOString(),
        },
      ]);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No active session');

        const { data, error } = await supabase.functions.invoke('code-sandbox', {
          body: { code, language: 'python' },
        });

        if (error) throw error;

        const output = data?.output || data;
        const metadata = {
          type: 'code_execution',
          code,
          language: 'python',
          stdout: output?.stdout || '',
          stderr: output?.stderr || '',
          result: output?.result || '',
          executionTime: output?.executionTime,
          files: output?.files || [],
        };

        const summary = output?.stderr
          ? `Code execution completed with errors.\n\`\`\`\n${output.stderr}\n\`\`\``
          : `Code execution completed.${output?.stdout ? `\n\`\`\`\n${output.stdout}\n\`\`\`` : ''}`;

        const { data: savedMsg } = await supabase
          .from('messages')
          .insert({
            user_id: user.id,
            project_id: projectId,
            role: 'assistant',
            content: summary,
            metadata,
          })
          .select()
          .single();

        setMessages((prev) =>
          prev.map((m) => (m.id === runningId ? (savedMsg as Message) : m))
        );
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === runningId
              ? { ...m, content: `❌ Code execution failed: ${err.message}` }
              : m
          )
        );
      }
    },
    [user, projectId]
  );

  const sendInspirationMessage = useCallback(
    async (inspirationUrl: string, userContent: string, ghlMode: boolean) => {
      if (!user) return;
      if (!canSendMessage()) return;
      setIsInspirationLoading(true);
      setIsLoading(true);
      setIsStreaming(true);
      const statusId = crypto.randomUUID();
      setMessages((prev) => [...prev, { id: statusId, role: 'assistant' as const, content: `✨ **Building from inspiration**\nAnalyzing design patterns from \`${inspirationUrl}\`...`, created_at: new Date().toISOString() }]);
      try {
        await supabase.from('messages').insert({ user_id: user.id, project_id: projectId, role: 'user', content: `Build a page inspired by ${inspirationUrl}\n\nMy content: ${userContent}`, metadata: { type: 'inspiration', inspirationUrl } });
        const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke('firecrawl-scrape', { body: { url: inspirationUrl, options: { formats: ['markdown', 'html'], onlyMainContent: false } } });
        if (scrapeError) throw new Error(`Failed to analyze inspiration page: ${scrapeError.message}`);
        const html = scrapeData?.data?.html || scrapeData?.html || '';
        const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || '';
        const trimmedHtml = trimHtmlIntelligently(html, 15000);
        const trimmedMarkdown = markdown.slice(0, 5000);
        setIsInspirationLoading(false);
        setMessages((prev) => prev.map((m) => m.id === statusId ? { ...m, content: `✨ **Design analyzed.** Generating your page...` } : m));
        const inspirationPrompt = `INSPIRATION MODE: The user wants you to build a new page inspired by an existing design.\n\nINSPIRATION PAGE STRUCTURE (from ${inspirationUrl}):\n${trimmedHtml}\n\nINSPIRATION PAGE CONTENT SUMMARY:\n${trimmedMarkdown}\n\nDESIGN INSTRUCTIONS:\n- Analyze the inspiration page's visual design: layout structure, section order, color palette, typography, spacing, component styles\n- Create a NEW page that uses SIMILAR design patterns but with COMPLETELY DIFFERENT content\n- Match the inspiration's: section layout order, card/grid patterns, hero style, CTA placement, visual rhythm, color mood (warm/cool/neutral)\n- Do NOT copy any text, images, or branding from the inspiration page\n- Use the user's content below to fill the new page\n\nTHE USER'S CONTENT/BUSINESS:\n${userContent}\n\nBuild the page now using the design patterns from the inspiration, with the user's content.`;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No active session');
        abortControllerRef.current = new AbortController();
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ messages: [...messagesRef.current.slice(-4).map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: inspirationPrompt }], ghlMode }), signal: abortControllerRef.current.signal });
        if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || 'Failed to generate inspired page'); }
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        setMessages((prev) => prev.filter((m) => m.id !== statusId));
        const tempId = crypto.randomUUID();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              const d = line.slice(6);
              if (d === '[DONE]') continue;
              try { const parsed = JSON.parse(d); if (parsed.type === 'content_block_delta') { assistantContent += parsed.delta?.text || ''; setMessages((prev) => { const existing = prev.find((m) => m.id === tempId); if (existing) return prev.map((m) => m.id === tempId ? { ...m, content: assistantContent } : m); return [...prev, { id: tempId, role: 'assistant' as const, content: assistantContent, created_at: new Date().toISOString() }]; }); } } catch {}
            }
          }
          if (assistantContent) {
            const { data: savedMessage } = await supabase.from('messages').insert({ user_id: user.id, project_id: projectId, role: 'assistant', content: assistantContent, metadata: { type: 'inspiration_result', inspirationUrl } }).select().single();
            if (savedMessage) { setMessages((prev) => prev.map((m) => m.id === tempId ? { ...savedMessage as Message } : m)); }
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') { toast({ title: 'Inspiration Error', description: error.message || 'Failed to generate inspired page', variant: 'destructive' }); setMessages((prev) => prev.filter((m) => m.id !== statusId)); }
      } finally {
        setIsLoading(false); setIsStreaming(false); setIsInspirationLoading(false); abortControllerRef.current = null; refreshSubscription();
      }
    },
    [user, projectId, canSendMessage, refreshSubscription]
  );

  const sendMessage = useCallback(
    async (content: string, options?: { ghlMode?: boolean; files?: File[]; designTemplateId?: string | null; customDesignMd?: string; marketingMd?: string; marketingCategory?: string }) => {
      if (!user || (!content.trim() && !(options?.files?.length))) return;

      if (!canSendMessage()) {
        return;
      }

      // Handle /inspire command
      if (content.trim().startsWith('/inspire ')) {
        const rest = content.trim().slice(9).trim();
        const urlMatch = rest.match(/^(https?:\/\/\S+)\s*([\s\S]*)?$/i) || rest.match(/^(\S+\.\S+)\s*([\s\S]*)?$/);
        if (urlMatch) {
          const url = urlMatch[1].startsWith('http') ? urlMatch[1] : `https://${urlMatch[1]}`;
          const userContent = (urlMatch[2] || '').trim();
          if (userContent) {
            // Direct generation: /inspire URL content
            await sendInspirationMessage(url, userContent, options?.ghlMode || false);
          } else {
            // Just URL — user will be prompted via follow-up
            toast({ title: '✨ Inspiration Mode', description: `Got it! Now describe what your page should be about.` });
            // Store URL for next message (we'll handle via prefill or similar)
          }
          return;
        }
      }

      // Handle /audit command
      if (content.trim().startsWith('/audit ')) {
        const rest = content.trim().slice(7).trim();
        const auditUrlMatch = rest.match(/^(https?:\/\/\S+)/i) || rest.match(/^(\S+\.\S+)/);
        if (auditUrlMatch) {
          const auditUrl = auditUrlMatch[1].startsWith('http') ? auditUrlMatch[1] : `https://${auditUrlMatch[1]}`;
          setIsLoading(true);
          setIsStreaming(true);

          const statusId = crypto.randomUUID();
          setMessages((prev) => [...prev, { id: statusId, role: 'assistant' as const, content: `📈 **Analyzing page for conversion optimization...**\nScraping \`${auditUrl}\``, created_at: new Date().toISOString() }]);

          try {
            await supabase.from('messages').insert({ user_id: user.id, project_id: projectId, role: 'user', content: content.trim() });

            const { data: scrapeData, error: scrapeError } = await supabase.functions.invoke('firecrawl-scrape', {
              body: { url: auditUrl, options: { formats: ['markdown', 'html'], onlyMainContent: false } },
            });
            if (scrapeError) throw new Error(`Failed to scrape page: ${scrapeError.message}`);

            const html = scrapeData?.data?.html || scrapeData?.html || '';
            const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || '';
            const trimmedHtml = trimHtmlIntelligently(html, 15000);
            const trimmedMd = markdown.slice(0, 5000);

            setMessages((prev) => prev.map((m) => m.id === statusId ? { ...m, content: '📈 **Page scraped.** Running CRO analysis...' } : m));

            const auditPrompt = `You are a conversion rate optimization expert. Analyze the following marketing page and provide actionable recommendations to improve its conversion rate.

PAGE URL: ${auditUrl}

PAGE HTML:
${trimmedHtml}

PAGE CONTENT:
${trimmedMd}

Analyze across these 7 dimensions and score each 1-10:

1. VALUE PROPOSITION CLARITY (Score: X/10): Is it immediately clear what this product/service does and who it's for? Can a visitor understand the offer within 5 seconds?

2. HEADLINE EFFECTIVENESS (Score: X/10): Does the headline lead with a benefit? Is it specific? Does it speak to the target audience's desire or pain?

3. CTA PLACEMENT & COPY (Score: X/10): Is there a clear primary CTA above the fold? Is the button text action-oriented? Is there a logical CTA hierarchy?

4. VISUAL HIERARCHY (Score: X/10): Does the eye naturally flow from headline to supporting content to CTA? Are the most important elements the most visually prominent?

5. TRUST SIGNALS (Score: X/10): Are there testimonials, logos, ratings, guarantees, or credentials? Are they positioned near decision points?

6. OBJECTION HANDLING (Score: X/10): Does the page address common objections? Is there an FAQ section?

7. FRICTION POINTS (Score: X/10): Are there unnecessary form fields? Confusing navigation? Competing CTAs? Elements that might cause hesitation?

For each dimension provide:
- Current score with brief justification
- Specific recommendation to improve
- Example copy or layout change

Then provide:
- OVERALL CONVERSION SCORE: X/70
- TOP 3 QUICK WINS: Changes that can be implemented immediately with likely impact
- TOP 3 HIGH-IMPACT CHANGES: Bigger changes that will significantly improve conversions
- HEADLINE ALTERNATIVES: Write 3 alternative headlines that would likely convert better
- CTA ALTERNATIVES: Write 3 alternative CTA button texts

Format the output with clear headers, scores in bold, and specific actionable recommendations. Be direct and specific — avoid generic advice.`;

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No active session');

            abortControllerRef.current = new AbortController();
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ messages: [{ role: 'user', content: auditPrompt }] }),
              signal: abortControllerRef.current.signal,
            });

            if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'Failed to run audit'); }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let auditContent = '';
            setMessages((prev) => prev.filter((m) => m.id !== statusId));
            const tempId = crypto.randomUUID();

            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                for (const line of chunk.split('\n')) {
                  if (!line.startsWith('data: ')) continue;
                  const d = line.slice(6);
                  if (d === '[DONE]') continue;
                  try {
                    const parsed = JSON.parse(d);
                    if (parsed.type === 'content_block_delta') {
                      auditContent += parsed.delta?.text || '';
                      setMessages((prev) => {
                        const existing = prev.find((m) => m.id === tempId);
                        if (existing) return prev.map((m) => m.id === tempId ? { ...m, content: auditContent } : m);
                        return [...prev, { id: tempId, role: 'assistant' as const, content: auditContent, created_at: new Date().toISOString() }];
                      });
                    }
                  } catch {}
                }
              }

              if (auditContent) {
                const { data: savedMsg } = await supabase.from('messages').insert({
                  user_id: user.id, project_id: projectId, role: 'assistant', content: auditContent,
                  metadata: { type: 'cro_audit', auditUrl },
                }).select().single();
                if (savedMsg) setMessages((prev) => prev.map((m) => m.id === tempId ? { ...savedMsg as Message } : m));
              }
            }
          } catch (error: any) {
            if (error.name !== 'AbortError') {
              toast({ title: 'Audit Error', description: error.message || 'Failed to audit page', variant: 'destructive' });
              setMessages((prev) => prev.filter((m) => m.id !== statusId));
            }
          } finally {
            setIsLoading(false); setIsStreaming(false); abortControllerRef.current = null; refreshSubscription();
          }
          return;
        }
      }

      if (content.trim().startsWith('/code ')) {
        const code = content.trim().slice(6);
        setIsLoading(true);
        try {
          await executeCode(code, content);
        } finally {
          setIsLoading(false);
          refreshSubscription();
        }
        return;
      }

      // Handle /slides command — route to orchestrator with presentation hint
      if (content.trim().startsWith('/slides ')) {
        const topic = content.trim().slice(8);
        const orchestratorMessage = `Create a professional presentation about: ${topic}. Research the topic thoroughly, then generate slides using the generate_slides tool.`;
        setIsLoading(true);
        setIsStreaming(true);
        try {
          await supabase.from('messages').insert({
            user_id: user.id,
            project_id: projectId,
            role: 'user',
            content: content.trim(),
          });

          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('No active session');

          const { data, error } = await supabase.functions.invoke('orchestrate-task', {
            body: {
              message: orchestratorMessage,
              projectId,
              conversationHistory: messagesRef.current.slice(-6).map(m => ({ role: m.role, content: m.content })),
            },
          });

          if (error) throw error;

          const metadata: any = {
            type: 'slides_generation',
            title: topic,
            toolsUsed: data?.toolsUsed || [],
          };

          // Extract gamma URL from result
          const urlMatch = (data?.result || '').match(/https:\/\/gamma\.app\/[^\s)]+/);
          if (urlMatch) {
            metadata.gammaUrl = urlMatch[0];
          }

          await supabase.from('messages').insert({
            user_id: user.id,
            project_id: projectId,
            role: 'assistant',
            content: data?.result || 'Presentation generation completed.',
            metadata,
          });
        } catch (err: any) {
          toast({
            title: 'Error',
            description: err.message || 'Failed to generate slides',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
          setIsStreaming(false);
          refreshSubscription();
        }
      }

      // Detect conversational code execution patterns
      const codeBlockMatch = content.match(/(?:run this code|execute this|run this)[:.]?\s*```[\w]*\n?([\s\S]+?)```/i);
      if (codeBlockMatch) {
        const code = codeBlockMatch[1].trim();
        setIsLoading(true);
        try {
          await executeCode(code, content);
        } finally {
          setIsLoading(false);
          refreshSubscription();
        }
        return;
      }

      setIsLoading(true);
      setIsStreaming(true);

      try {
        // Process file attachments
        let fileContext = '';
        let fileMetadata: any[] | undefined;
        if (options?.files && options.files.length > 0) {
          const { context, uploadedFiles } = await buildFileContext(
            options.files,
            user.id,
            projectId || 'general'
          );
          fileContext = context;
          fileMetadata = uploadedFiles;
        }

        const displayContent = content.trim() || (fileMetadata ? `Uploaded ${fileMetadata.length} file(s)` : '');

        // Save user message
        const { data: userMessage, error: userMessageError } = await supabase
          .from('messages')
          .insert({
            user_id: user.id,
            project_id: projectId,
            role: 'user',
            content: displayContent,
            metadata: fileMetadata ? { files: fileMetadata } : undefined,
          })
          .select()
          .single();

        if (userMessageError) {
          console.error('Error saving user message:', userMessageError);
          throw new Error('Failed to save message');
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No active session');
        }

        abortControllerRef.current = new AbortController();

        // Build the enriched content for the API
        const enrichedContent = fileContext
          ? `${fileContext}\n\nUser's message: ${content.trim()}`
          : content.trim();

        const messagesForAPI = messagesRef.current
          .concat([{ ...(userMessage as Message), content: enrichedContent }])
          .map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));

        // Fetch design template content
        let designMd: string | undefined = options?.customDesignMd;
        let templateMarketingMd: string | undefined;
        if (!designMd) {
          const templateId = options?.designTemplateId;
          const query = templateId
            ? supabase.from('design_templates').select('design_md, marketing_md').eq('id', templateId).single()
            : supabase.from('design_templates').select('design_md, marketing_md').eq('is_default', true).single();
          const { data: tmpl } = await query;
          if (tmpl && typeof (tmpl as any).design_md === 'string') {
            designMd = (tmpl as any).design_md;
          }
          if (tmpl && typeof (tmpl as any).marketing_md === 'string') {
            templateMarketingMd = (tmpl as any).marketing_md;
          }
        }
        // Use marketing_md from design template if no separate marketing template selected
        const finalMarketingMd = options?.marketingMd || templateMarketingMd;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ messages: messagesForAPI, ghlMode: options?.ghlMode || false, designMd, marketingMd: finalMarketingMd, conversationCategory: conversationCategoryRef.current }),
            signal: abortControllerRef.current.signal,
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get response');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = '';
        const tempId = crypto.randomUUID();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              // Handle custom category SSE event for auto-detection caching
              if (line.startsWith('event: category')) continue;
              if (line.startsWith('data: ')) {
                const data = line.slice(6);

                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);

                  // Cache detected category from auto-detection
                  if (parsed.category && !conversationCategoryRef.current) {
                    conversationCategoryRef.current = parsed.category;
                    continue;
                  }

                  if (parsed.type === 'content_block_delta') {
                    const delta = parsed.delta?.text || '';
                    assistantContent += delta;

                    setMessages((prev) => {
                      const existing = prev.find((m) => m.id === tempId);
                      if (existing) {
                        return prev.map((m) => m.id === tempId ? { ...m, content: assistantContent } : m);
                      }
                      return [...prev, { id: tempId, role: 'assistant' as const, content: assistantContent, created_at: new Date().toISOString() }];
                    });
                  }
                } catch (e) {
                  console.error('Error parsing SSE data:', e);
                }
              }
            }
          }

          if (assistantContent) {
            let finalContent = assistantContent;
            let validationMeta: any = undefined;

            // Run validation if the response contains code blocks
            if (hasCodeBlocks(assistantContent)) {
              const { html, css, js } = extractCodeFromResponse(assistantContent);
              if (html) {
                const result = validateWebsite(html, css, js);
                const criticalIssues = result.issues.filter(i => i.severity === 'critical');

                if (criticalIssues.length > 0) {
                  // Auto-retry: ask Claude to fix critical issues
                  setMessages((prev) =>
                    prev.map((m) => m.id === tempId
                      ? { ...m, content: '✨ Auto-improving design quality...' }
                      : m)
                  );

                  const fixPrompt = `The website you just generated has these design quality issues that MUST be fixed:\n\n${criticalIssues.map(i => `- [${i.severity.toUpperCase()}] ${i.category}: ${i.message}\nFix: ${i.fix}`).join('\n\n')}\n\nPlease regenerate the COMPLETE website code with ALL of these issues fixed. Keep everything else the same, just fix the flagged problems.`;

                  try {
                    const retryResp = await fetch(
                      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                        body: JSON.stringify({
                          messages: [...messagesForAPI, { role: 'assistant', content: assistantContent }, { role: 'user', content: fixPrompt }],
                          ghlMode: options?.ghlMode || false,
                          designMd,
                        }),
                      }
                    );

                    if (retryResp.ok) {
                      const retryReader = retryResp.body?.getReader();
                      if (retryReader) {
                        let retryContent = '';
                        while (true) {
                          const { done: rd, value: rv } = await retryReader.read();
                          if (rd) break;
                          const rc = decoder.decode(rv);
                          for (const rl of rc.split('\n')) {
                            if (!rl.startsWith('data: ')) continue;
                            const rd2 = rl.slice(6);
                            if (rd2 === '[DONE]') continue;
                            try {
                              const rp = JSON.parse(rd2);
                              if (rp.type === 'content_block_delta') {
                                retryContent += rp.delta?.text || '';
                                setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, content: retryContent } : m));
                              }
                            } catch {}
                          }
                        }
                        if (retryContent) {
                          finalContent = retryContent;
                          const retryResult = validateWebsite(
                            ...Object.values(extractCodeFromResponse(retryContent)) as [string, string, string]
                          );
                          validationMeta = {
                            passed: retryResult.passed,
                            score: retryResult.score,
                            issues: retryResult.issues,
                            autoFixed: true,
                            retryPassed: retryResult.passed,
                          };
                        }
                      }
                    }
                  } catch (retryErr) {
                    console.error('Validation retry failed:', retryErr);
                    // Show original content with warning
                    validationMeta = {
                      passed: false,
                      score: result.score,
                      issues: result.issues,
                      autoFixed: false,
                    };
                  }
                } else {
                  validationMeta = {
                    passed: true,
                    score: result.score,
                    issues: result.issues,
                    autoFixed: false,
                  };
                }
              }
            }

            const { data: savedMessage } = await supabase
              .from('messages')
              .insert({
                user_id: user.id,
                project_id: projectId,
                role: 'assistant',
                content: finalContent,
                metadata: validationMeta ? { validation: validationMeta, codeType: 'website' } : undefined,
              })
              .select()
              .single();

            if (savedMessage) {
              setMessages((prev) =>
                prev.map((m) => m.id === tempId ? { ...savedMessage as Message } : m)
              );
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Request aborted');
        } else {
          console.error('Error sending message:', error);
          toast({
            title: 'Error',
            description: error.message || 'Failed to send message',
            variant: 'destructive',
          });
        }
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        abortControllerRef.current = null;
        refreshSubscription();
      }
    },
    [user, projectId, canSendMessage, refreshSubscription, executeCode, sendInspirationMessage]
  );

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setIsLoading(false);
    }
  }, []);


  return {
    messages,
    isHistoryLoading,
    isLoading,
    isStreaming,
    isInspirationLoading,
    sendMessage,
    sendInspirationMessage,
    stopStreaming,
  };
};

function trimHtmlIntelligently(html: string, maxLen: number): string {
  if (html.length <= maxLen) return html;

  const styleMatches = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  const styles = styleMatches.join('\n').slice(0, 3000);

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;

  let accumulated = styles + '\n';
  const budget = maxLen - styles.length - 200;

  const heroChunk = body.slice(0, 5000);
  accumulated += heroChunk;

  const rest = body.slice(5000);
  const remaining = budget - heroChunk.length;
  if (rest.length <= remaining) {
    accumulated += rest;
  } else {
    accumulated += rest.slice(0, remaining);
    accumulated += '\n<!-- [remaining sections follow similar patterns] -->';
  }

  return accumulated.slice(0, maxLen);
}
