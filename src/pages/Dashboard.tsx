import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, MessageSquarePlus, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
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
import TaskHistory from "@/components/chat/TaskHistory";
import ProfileSelector from "@/components/chat/ProfileSelector";
import LiveBrowserView from "@/components/chat/LiveBrowserView";
import { useChat } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";
import { useBrowserTask } from "@/hooks/useBrowserTask";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { parseCodeFromMessages } from "@/lib/codeParser";
import { useState, useMemo } from "react";
import { PlanBadge } from "@/components/ui/plan-badge";
import { CommandPalette } from "@/components/ui/command-palette";
import { TaskTemplatesPanel } from "@/components/templates/TaskTemplatesPanel";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { ScheduledTasksPanel } from "@/components/scheduled/ScheduledTasksPanel";
import { WorkflowBuilder } from "@/components/workflow/WorkflowBuilder";
import { TaskPlanViewer } from "@/components/workflow/TaskPlanViewer";
import { useTaskPlanner } from "@/hooks/useTaskPlanner";
import { WebhookManager } from "@/components/webhooks/WebhookManager";

const Dashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const { messages, isLoading, isStreaming, sendMessage, stopStreaming } = useChat(activeConversationId || undefined);
  const { conversations, createConversation, deleteConversation, renameConversation } = useConversations();
  const { currentTask, isExecuting, executeTask, stopTask, pauseTask, resumeTask, isStopping, isPausing, isResuming } = useBrowserTask();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const { plan, isPlanning, generatePlan, updateStep, removeStep, addStep, reorderSteps, clearPlan } = useTaskPlanner();

  const handleSendWithPlanner = async (content: string) => {
    // If message starts with /plan, use the AI planner
    if (content.trimStart().startsWith("/plan ")) {
      const prompt = content.replace(/^\/plan\s+/, "");
      await generatePlan(prompt);
      return;
    }
    sendMessage(content);
  };

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

  const handleSignOut = async () => { await signOut(); navigate("/auth"); };

  const handleNewConversation = async () => {
    const newConv = await createConversation();
    if (newConv) setActiveConversationId(newConv.id);
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
      setTimeout(() => sendMessage(prompt), 300);
    }
  };

  const handleRerunTask = (taskDescription: string) => {
    if (taskDescription) executeTask(taskDescription, activeConversationId || undefined, selectedProfileId || undefined);
  };

  const handleSelectConversation = (id: string) => setActiveConversationId(id);

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    if (activeConversationId === id) setActiveConversationId(null);
  };

  const parsedCode = useMemo(() => parseCodeFromMessages(messages), [messages]);

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
        </div>
        <div className="flex items-center gap-1.5">
          <TaskTemplatesPanel onSelectTemplate={handleQuickStart} />
          <WorkflowBuilder onExecuteWorkflow={handleExecuteWorkflow} />
          <ScheduledTasksPanel />
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
        {!sidebarCollapsed && (
          <div className="absolute inset-0 z-20 bg-background">
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={(id) => { handleSelectConversation(id); setSidebarCollapsed(true); }}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onRenameConversation={renameConversation}
            />
          </div>
        )}
        {(activeConversationId || messages.length > 0) ? (
          <>
            <div className="px-4 py-2">
              <ProfileSelector onProfileSelect={setSelectedProfileId} />
            </div>
            <div className="flex-1 min-h-0">
              <ChatContainer
                messages={messages} isLoading={isLoading} isStreaming={isStreaming}
                onSendMessage={handleSendWithPlanner} onStopStreaming={stopStreaming}
                currentTask={currentTask} isExecutingTask={isExecuting}
                onExecuteTask={executeTask} onStopTask={stopTask} onPauseTask={pauseTask} onResumeTask={resumeTask}
                isStopping={isStopping} isPausing={isPausing} isResuming={isResuming}
                selectedProfileId={selectedProfileId} projectId={activeConversationId || undefined}
              />
            </div>
            <div className="flex-1 min-h-0 border-t border-border/50">
              {currentTask && currentTask.liveUrl ? (
                <LiveBrowserView
                  liveUrl={currentTask.liveUrl} status={currentTask.status}
                  screenshots={currentTask.screenshots} actions={currentTask.actions}
                  steps={currentTask.steps} taskId={currentTask.id}
                  onStopTask={stopTask} onPauseTask={pauseTask} onResumeTask={resumeTask}
                  isStopping={isStopping} isPausing={isPausing} isResuming={isResuming}
                  interventionReason={currentTask.interventionReason}
                  interventionMessage={currentTask.interventionMessage}
                  currentPhase={currentTask.currentPhase}
                  deliverables={currentTask.deliverables}
                  extractedData={currentTask.extractedData}
                  taskSummary={currentTask.taskSummary}
                />
              ) : (
                <CodePreview files={parsedCode.files} mainFile={parsedCode.mainFile} template={parsedCode.template} />
              )}
            </div>
          </>
        ) : (
          <EmptyState mobile />
        )}
      </div>

      {/* Desktop View */}
      <div className="flex-1 hidden md:flex min-h-0 overflow-hidden">
        {(activeConversationId || messages.length > 0) ? (
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
              <div className="h-full flex flex-col border-r border-border/50">
                <div className="border-b border-border/50">
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
                    messages={messages} isLoading={isLoading} isStreaming={isStreaming}
                    onSendMessage={handleSendWithPlanner} onStopStreaming={stopStreaming}
                    currentTask={currentTask} isExecutingTask={isExecuting}
                    onExecuteTask={executeTask} onStopTask={stopTask} onPauseTask={pauseTask} onResumeTask={resumeTask}
                    isStopping={isStopping} isPausing={isPausing} isResuming={isResuming}
                    selectedProfileId={selectedProfileId} projectId={activeConversationId || undefined}
                    hideTaskPreview={true}
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
              ) : currentTask && currentTask.liveUrl ? (
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
              ) : (
                <CodePreview files={parsedCode.files} mainFile={parsedCode.mainFile} template={parsedCode.template} />
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
