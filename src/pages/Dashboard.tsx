import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Settings, LogOut, MessageSquarePlus, ChevronLeft, ChevronRight, Sparkles, Brain, MessageCircle, Eye, RefreshCw, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ChatContainer from "@/components/chat/ChatContainer";
import ConversationList from "@/components/chat/ConversationList";
import CodePreview from "@/components/chat/CodePreview";
import GHLCodeOutput from "@/components/chat/GHLCodeOutput";
import TaskHistory from "@/components/chat/TaskHistory";
import ProfileSelector from "@/components/chat/ProfileSelector";
import LiveBrowserView from "@/components/chat/LiveBrowserView";
import { useChat } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";
import { useBrowserTask } from "@/hooks/useBrowserTask";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { parseCodeFromMessages } from "@/lib/codeParser";
import { hasCodeBlocks } from "@/lib/validateWebsite";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { PlanBadge } from "@/components/ui/plan-badge";
import { CommandPalette } from "@/components/ui/command-palette";
import { TaskTemplatesPanel } from "@/components/templates/TaskTemplatesPanel";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { ScheduledTasksPanel } from "@/components/scheduled/ScheduledTasksPanel";
import { WorkflowBuilder } from "@/components/workflow/WorkflowBuilder";
import { TaskPlanViewer } from "@/components/workflow/TaskPlanViewer";
import { useTaskPlanner } from "@/hooks/useTaskPlanner";
import { WebhookManager } from "@/components/webhooks/WebhookManager";
import { ResultsDashboard } from "@/components/results/ResultsDashboard";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

const Dashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const { messages, isHistoryLoading, isLoading, isStreaming, isInspirationLoading, sendMessage, sendInspirationMessage, stopStreaming } = useChat(activeConversationId || undefined);
  const { conversations, createConversation, deleteConversation, renameConversation } = useConversations();
  const { currentTask, isExecuting, executeTask, stopTask, pauseTask, resumeTask, isStopping, isPausing, isResuming } = useBrowserTask();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const { plan, isPlanning, generatePlan, updateStep, removeStep, addStep, reorderSteps, clearPlan } = useTaskPlanner();

  const [memoryActive, setMemoryActive] = useState(false);
  const [mobileView, setMobileView] = useState<'chat' | 'preview'>('chat');
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const lastAutoOpenedPreviewMessageId = useRef<string | null>(null);
  const [mobilePreviewKey, setMobilePreviewKey] = useState(0);

  useEffect(() => {
    supabase.functions.invoke('honcho-proxy', { body: { action: 'status' } })
      .then(({ data }) => setMemoryActive(data?.available ?? false))
      .catch(() => setMemoryActive(false));
  }, []);

  const handleSendWithPlanner = async (content: string, options?: { ghlMode?: boolean }) => {
    // If message starts with /plan, use the AI planner
    if (content.trimStart().startsWith("/plan ")) {
      const prompt = content.replace(/^\/plan\s+/, "");
      await generatePlan(prompt);
      return;
    }
    sendMessage(content, options);
  };

  const isGhlMode = typeof window !== 'undefined' && localStorage.getItem('ghl-mode') === 'true';

  // Extract GHL code (single HTML blob) from latest assistant message
  const ghlCode = useMemo(() => {
    if (!isGhlMode) return '';
    const assistantMsgs = messages.filter((m) => m.role === 'assistant');
    if (assistantMsgs.length === 0) return '';
    const last = assistantMsgs[assistantMsgs.length - 1].content;
    // Match a single html code block
    const match = last.match(/```html?\n([\s\S]*?)```/);
    return match ? match[1].trim() : '';
  }, [messages, isGhlMode]);

  const handleExecutePlan = async () => {
    if (!plan) return;
    for (const step of plan.steps) {
      updateStep(step.id, { status: "running" });
      await executeTask(step.prompt, activeConversationId || undefined, selectedProfileId || undefined);
      updateStep(step.id, { status: "done" });
    }
    clearPlan();
  };

  const handleExecuteWorkflow = async (steps: { prompt: string }[]) => {
    for (const step of steps) {
      await executeTask(step.prompt, activeConversationId || undefined, selectedProfileId || undefined);
    }
  };

  // Slash command handler — triggers UI panel opens via toast notifications
  const handleSlashCommand = useCallback((command: string) => {
    const messages: Record<string, string> = {
      "/schedule": "Open the ⏰ clock icon in the header to manage scheduled tasks",
      "/template": "Open the 📋 template icon in the header to browse templates",
      "/history": "Open the 📜 history icon in the header to view past tasks",
      "/workflow": "Open the 🔀 workflow icon in the header to build workflows",
      "/results": "Open the 📊 chart icon in the header to view results",
      "/webhooks": "Open the 🔗 webhook icon in the header to manage webhooks",
    };
    const msg = messages[command];
    if (msg) {
      import("@/hooks/use-toast").then(({ toast }) => {
        toast({ title: "Tip", description: msg });
      });
    }
  }, []);

  const handleSignOut = async () => { await signOut(); navigate("/auth"); };

  const handleNewConversation = async () => {
    const newConv = await createConversation();
    if (newConv) {
      setQueuedPrompt(null);
      setActiveConversationId(newConv.id);
      setMobileView('chat');
      if (isMobile) {
        setSidebarCollapsed(true);
      }
    }
  };

  const quickStartExamples = [
    "Scrape leads from a website",
    "Fill out a form automatically",
    "Build me a landing page",
  ];

  const handleQuickStart = async (prompt: string) => {
    const newConv = await createConversation();
    if (newConv) {
      setActiveConversationId(newConv.id);
      setQueuedPrompt(prompt);
      setMobileView('chat');
      if (isMobile) {
        setSidebarCollapsed(true);
      }
    }
  };

  const handleRerunTask = (taskDescription: string) => {
    if (taskDescription) executeTask(taskDescription, activeConversationId || undefined, selectedProfileId || undefined);
  };

  const handleSelectConversation = (id: string) => {
    setQueuedPrompt(null);
    setActiveConversationId(id);
    setMobileView('chat');
    lastAutoOpenedPreviewMessageId.current = null;

    if (isMobile) {
      setSidebarCollapsed(true);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    if (activeConversationId === id) setActiveConversationId(null);
  };

  const parsedCode = useMemo(() => parseCodeFromMessages(messages), [messages]);

  const hasPreviewContent = useMemo(() => {
    const keys = Object.keys(parsedCode.files);
    return keys.length > 0 && !(keys.length === 1 && parsedCode.files[parsedCode.mainFile]?.includes('Start chatting'));
  }, [parsedCode]);

  const latestGeneratedMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.role === 'assistant' && hasCodeBlocks(message.content)) {
        return message.id;
      }
    }

    return null;
  }, [messages]);

  useEffect(() => {
    if (!queuedPrompt || !activeConversationId) return;

    sendMessage(queuedPrompt);
    setQueuedPrompt(null);
  }, [queuedPrompt, activeConversationId, sendMessage]);

  useEffect(() => {
    if (!hasPreviewContent) {
      setMobileView('chat');
      return;
    }

    if (!isMobile || !latestGeneratedMessageId) return;
    if (lastAutoOpenedPreviewMessageId.current === latestGeneratedMessageId) return;

    setMobileView('preview');
    lastAutoOpenedPreviewMessageId.current = latestGeneratedMessageId;
  }, [hasPreviewContent, isMobile, latestGeneratedMessageId]);

  if (!user) return null;

  const EmptyState = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="h-full flex items-center justify-center p-6">
      <div className={`${mobile ? 'max-w-sm' : 'max-w-md'} w-full flex flex-col items-center text-center gap-6`}>
        {/* Animated logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse-glow" />
          <span className={`relative ${mobile ? 'text-5xl' : 'text-6xl'} block`}>🧄</span>
        </div>

        <div>
          <h2 className={`${mobile ? 'text-xl' : 'text-2xl'} font-bold tracking-tight text-foreground`}>
            What should I automate?
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Describe a browser task, ask me to scrape data, or generate an app.
          </p>
        </div>

        <Button onClick={handleNewConversation} size="lg" className="w-full shadow-glow hover:shadow-glow-lg transition-all duration-300">
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          Start New Chat
        </Button>

        <div className="flex flex-col gap-2 w-full">
          {quickStartExamples.map((example) => (
            <Button
              key={example}
              variant="outline"
              className="w-full text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 justify-start gap-2.5 text-sm transition-all"
              onClick={() => handleQuickStart(example)}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary/60" />
              {example}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      <CommandPalette onNewConversation={handleNewConversation} onQuickStart={handleQuickStart} />
      <OnboardingTour />
      {/* Header */}
      <header className="shrink-0 h-12 border-b border-border/50 bg-card/80 backdrop-blur-sm z-10 flex items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="md:hidden h-8 w-8"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <span className="text-xl">🧄</span>
          <span className="text-sm font-semibold tracking-tight text-foreground hidden sm:block">GarlicBread.ai</span>
          <PlanBadge size="sm" className="hidden sm:inline-flex" />
          {memoryActive && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative hidden sm:flex items-center">
                    <Brain className="h-4 w-4 text-purple-400" />
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-background" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Memory Active — Agent is learning from your conversations</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <TaskTemplatesPanel onSelectTemplate={handleQuickStart} />
          <WorkflowBuilder onExecuteWorkflow={handleExecuteWorkflow} />
          <ScheduledTasksPanel />
          <WebhookManager />
          <ResultsDashboard />
          <ThemeToggle />
          <TaskHistory onRerunTask={handleRerunTask} />
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out?</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to sign out?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSignOut}>Sign out</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {/* Mobile View */}
      <div className="flex-1 flex flex-col md:hidden min-h-0 overflow-hidden">
        {(activeConversationId || messages.length > 0) ? (
          <>
            {/* Mobile top bar with back arrow + Chat/Preview tabs */}
            <div className="shrink-0 flex items-center border-b border-border/50 bg-card/80">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setActiveConversationId(null); setSidebarCollapsed(false); }}
                className="h-10 w-10 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 flex">
                <button
                  onClick={() => setMobileView('chat')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                    mobileView === 'chat'
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Chat
                </button>
                {hasPreviewContent && (
                  <>
                    <button
                      onClick={() => setMobileView('preview')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                        mobileView === 'preview'
                          ? 'text-primary border-b-2 border-primary'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </button>
                    {mobileView === 'preview' && (
                      <button
                        onClick={() => setMobilePreviewKey(prev => prev + 1)}
                        className="flex items-center justify-center px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Refresh preview"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {mobileView === 'chat' || !hasPreviewContent ? (
              <div className="flex-1 min-h-0 flex flex-col">
                <ChatContainer
                  key={activeConversationId || 'mobile-chat'}
                  messages={messages} isLoading={isLoading || isHistoryLoading} isStreaming={isStreaming}
                  onSendMessage={handleSendWithPlanner} onStopStreaming={stopStreaming}
                  currentTask={currentTask} isExecutingTask={isExecuting}
                  onExecuteTask={executeTask} onStopTask={stopTask} onPauseTask={pauseTask} onResumeTask={resumeTask}
                  isStopping={isStopping} isPausing={isPausing} isResuming={isResuming}
                  selectedProfileId={selectedProfileId} projectId={activeConversationId || undefined}
                  onSlashCommand={handleSlashCommand}
                  onInspire={sendInspirationMessage}
                  isInspirationLoading={isInspirationLoading}
                />
              </div>
            ) : (
              <div className="flex-1 min-h-0 relative">
                <CodePreview key={`${activeConversationId || 'mobile-preview'}-${mobilePreviewKey}`} files={parsedCode.files} mainFile={parsedCode.mainFile} template={parsedCode.template} />
              </div>
            )}
          </>
        ) : (
          /* Chat list + empty state when no conversation is active */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="shrink-0 max-h-48 overflow-y-auto border-b border-border/50">
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onDeleteConversation={handleDeleteConversation}
                onRenameConversation={renameConversation}
              />
            </div>
            <EmptyState mobile />
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="flex-1 hidden md:flex min-h-0 overflow-hidden">
        {(activeConversationId || messages.length > 0) ? (
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
              <div className="h-full flex flex-col border-r border-border/50">
                <div className="border-b border-border/50 max-h-48 overflow-y-auto shrink-0">
                  <ConversationList
                    conversations={conversations}
                    activeConversationId={activeConversationId}
                    onSelectConversation={handleSelectConversation}
                    onNewConversation={handleNewConversation}
                    onDeleteConversation={handleDeleteConversation}
                    onRenameConversation={renameConversation}
                  />
                </div>
                <div className="p-3 border-b border-border/50">
                  <ProfileSelector onProfileSelect={setSelectedProfileId} />
                </div>
                <div className="flex-1 min-h-0">
                  <ChatContainer
                    key={activeConversationId || 'desktop-chat'}
                    messages={messages} isLoading={isLoading || isHistoryLoading} isStreaming={isStreaming}
                    onSendMessage={handleSendWithPlanner} onStopStreaming={stopStreaming}
                    currentTask={currentTask} isExecutingTask={isExecuting}
                    onExecuteTask={executeTask} onStopTask={stopTask} onPauseTask={pauseTask} onResumeTask={resumeTask}
                    isStopping={isStopping} isPausing={isPausing} isResuming={isResuming}
                    selectedProfileId={selectedProfileId} projectId={activeConversationId || undefined}
                    hideTaskPreview={true}
                    onSlashCommand={handleSlashCommand}
                    onInspire={sendInspirationMessage}
                    isInspirationLoading={isInspirationLoading}
                  />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={65} minSize={40} className="relative">
              {plan && plan.status === "reviewing" ? (
                <div className="h-full overflow-auto p-4">
                  <TaskPlanViewer
                    plan={plan}
                    onUpdateStep={updateStep}
                    onRemoveStep={removeStep}
                    onAddStep={addStep}
                    onReorderSteps={reorderSteps}
                    onExecute={handleExecutePlan}
                    onCancel={clearPlan}
                    isExecuting={isExecuting}
                  />
                </div>
              ) : currentTask ? (
                <LiveBrowserView
                  liveUrl={currentTask.liveUrl} status={currentTask.status}
                  screenshots={currentTask.screenshots} actions={currentTask.actions}
                  steps={currentTask.steps} taskId={currentTask.id}
                  onStopTask={stopTask} onPauseTask={pauseTask} onResumeTask={resumeTask}
                  isStopping={isStopping} isPausing={isPausing} isResuming={isResuming}
                  requiresLogin={currentTask.requiresLogin} loginUrl={currentTask.loginUrl} loginSite={currentTask.loginSite}
                  interventionReason={currentTask.interventionReason} interventionMessage={currentTask.interventionMessage}
                  interventionType={currentTask.interventionType} currentPhase={currentTask.currentPhase}
                  deliverables={currentTask.deliverables} extractedData={currentTask.extractedData}
                  taskSummary={currentTask.taskSummary} plannedSteps={currentTask.plannedSteps}
                  currentPlanStepId={currentTask.currentPlanStepId} todoItems={currentTask.todoItems}
                  isPlanning={currentTask.isPlanning} siteKnowledge={currentTask.siteKnowledge}
                  nextSteps={currentTask.nextSteps} challenges={currentTask.challenges}
                  processReport={currentTask.processReport} taskDescription={currentTask.taskDescription}
                  onSelectNextStep={(step) => step.prompt && executeTask(step.prompt, activeConversationId || undefined, selectedProfileId || undefined)}
                  suggestedTakeover={currentTask.suggestedTakeover} takeoverMessage={currentTask.takeoverMessage}
                  shellSessions={currentTask.shellSessions} activeShellSessionId={currentTask.activeShellSessionId}
                  deployments={currentTask.deployments} notifications={currentTask.notifications}
                  onAcceptTakeover={pauseTask} onDeclineTakeover={() => {}}
                />
              ) : isGhlMode && ghlCode ? (
                <GHLCodeOutput
                  code={ghlCode}
                  onExecuteTask={executeTask}
                  currentTaskScreenshots={currentTask?.screenshots}
                  isExecutingTask={isExecuting}
                  projectId={activeConversationId || undefined}
                />
              ) : (
                <CodePreview key={activeConversationId || 'desktop-preview'} files={parsedCode.files} mainFile={parsedCode.mainFile} template={parsedCode.template} />
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
