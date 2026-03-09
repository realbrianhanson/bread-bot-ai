import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, MessageSquarePlus, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { parseCodeFromMessages } from "@/lib/codeParser";
import { useState, useMemo } from "react";

const Dashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const { messages, isLoading, isStreaming, sendMessage, stopStreaming } = useChat(activeConversationId || undefined);
  const {
    conversations,
    createConversation,
    deleteConversation,
    renameConversation,
  } = useConversations();
  const { 
    currentTask, 
    isExecuting, 
    executeTask, 
    stopTask, 
    pauseTask, 
    resumeTask, 
    isStopping,
    isPausing,
    isResuming 
  } = useBrowserTask();
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleNewConversation = async () => {
    const newConv = await createConversation();
    if (newConv) {
      setActiveConversationId(newConv.id);
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
      // Small delay to let the conversation load, then send
      setTimeout(() => sendMessage(prompt), 300);
    }
  };

  const handleRerunTask = (taskDescription: string) => {
    if (taskDescription) {
      executeTask(taskDescription, activeConversationId || undefined, selectedProfileId || undefined);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  };

  // Parse code from messages for live preview
  const parsedCode = useMemo(() => parseCodeFromMessages(messages), [messages]);

  // Show something even if there are errors
  if (!user) {
    return null; // AuthContext will handle redirect
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-background via-background/95 to-background/90 overflow-hidden">
      {/* Header - Full Width */}
      <header className="shrink-0 border-b border-border/50 bg-background/80 backdrop-blur-sm z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="md:hidden h-8 w-8"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
            <span className="text-2xl">🧄</span>
          </div>
          <div className="flex items-center gap-2">
            <TaskHistory onRerunTask={handleRerunTask} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/settings")}
              className="h-8 w-8"
            >
              <Settings className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <LogOut className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to sign out of your account?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSignOut}>Sign out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Mobile View */}
      <div className="flex-1 flex flex-col md:hidden min-h-0 overflow-hidden">
        {/* Mobile Conversation Sidebar Overlay */}
        {!sidebarCollapsed && (
          <div className="absolute inset-0 z-20 bg-background">
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={(id) => {
                handleSelectConversation(id);
                setSidebarCollapsed(true);
              }}
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
                messages={messages}
                isLoading={isLoading}
                isStreaming={isStreaming}
                onSendMessage={sendMessage}
                onStopStreaming={stopStreaming}
                currentTask={currentTask}
                isExecutingTask={isExecuting}
                onExecuteTask={executeTask}
                onStopTask={stopTask}
                onPauseTask={pauseTask}
                onResumeTask={resumeTask}
                isStopping={isStopping}
                isPausing={isPausing}
                isResuming={isResuming}
                selectedProfileId={selectedProfileId}
                projectId={activeConversationId || undefined}
              />
            </div>
            <div className="flex-1 min-h-0 border-t">
              {currentTask && currentTask.liveUrl ? (
                <LiveBrowserView 
                  liveUrl={currentTask.liveUrl}
                  status={currentTask.status}
                  screenshots={currentTask.screenshots}
                  actions={currentTask.actions}
                  steps={currentTask.steps}
                  taskId={currentTask.id}
                  onStopTask={stopTask}
                  onPauseTask={pauseTask}
                  onResumeTask={resumeTask}
                  isStopping={isStopping}
                  isPausing={isPausing}
                  isResuming={isResuming}
                  interventionReason={currentTask.interventionReason}
                  interventionMessage={currentTask.interventionMessage}
                  currentPhase={currentTask.currentPhase}
                  deliverables={currentTask.deliverables}
                  extractedData={currentTask.extractedData}
                  taskSummary={currentTask.taskSummary}
                />
              ) : (
                <CodePreview
                  files={parsedCode.files}
                  mainFile={parsedCode.mainFile}
                  template={parsedCode.template}
                />
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center p-4">
            <div className="max-w-md w-full flex flex-col items-center text-center gap-6">
              <span className="text-6xl">🧄</span>
              <div>
                <h2 className="text-xl font-semibold text-foreground">What should I automate today?</h2>
                <p className="text-sm text-muted-foreground mt-1.5">Describe a browser task or ask me to build something — I'll handle the rest.</p>
              </div>
              <Button onClick={handleNewConversation} className="w-full">
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
              <div className="flex flex-col gap-2 w-full">
                {quickStartExamples.map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    className="w-full text-muted-foreground hover:text-foreground justify-start gap-2 text-sm"
                    onClick={() => handleQuickStart(example)}
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop View - Full Width Edge-to-Edge */}
      <div className="flex-1 hidden md:flex min-h-0 overflow-hidden">
        {(activeConversationId || messages.length > 0) ? (
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            {/* Left Panel: Conversation List + Chat */}
            <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
              <div className="h-full flex flex-col border-r border-border">
                {/* Conversation List */}
                <div className="border-b border-border">
                  <ConversationList
                    conversations={conversations}
                    activeConversationId={activeConversationId}
                    onSelectConversation={handleSelectConversation}
                    onNewConversation={handleNewConversation}
                    onDeleteConversation={handleDeleteConversation}
                    onRenameConversation={renameConversation}
                  />
                </div>

                {/* Profile Selector */}
                <div className="p-3 border-b border-border">
                  <ProfileSelector onProfileSelect={setSelectedProfileId} />
                </div>
                
                {/* Chat Container */}
                <div className="flex-1 min-h-0">
                  <ChatContainer
                    messages={messages}
                    isLoading={isLoading}
                    isStreaming={isStreaming}
                    onSendMessage={sendMessage}
                    onStopStreaming={stopStreaming}
                    currentTask={currentTask}
                    isExecutingTask={isExecuting}
                    onExecuteTask={executeTask}
                    onStopTask={stopTask}
                    onPauseTask={pauseTask}
                    onResumeTask={resumeTask}
                    isStopping={isStopping}
                    isPausing={isPausing}
                    isResuming={isResuming}
                    selectedProfileId={selectedProfileId}
                    projectId={activeConversationId || undefined}
                    hideTaskPreview={true}
                  />
                </div>
              </div>
            </ResizablePanel>

            {/* Resizable Handle */}
            <ResizableHandle withHandle />

            {/* Right Panel: Preview or Live Browser */}
            <ResizablePanel defaultSize={65} minSize={40} className="relative">
              {currentTask && currentTask.liveUrl ? (
              <LiveBrowserView 
                  liveUrl={currentTask.liveUrl}
                  status={currentTask.status}
                  screenshots={currentTask.screenshots}
                  actions={currentTask.actions}
                  steps={currentTask.steps}
                  taskId={currentTask.id}
                  onStopTask={stopTask}
                  onPauseTask={pauseTask}
                  onResumeTask={resumeTask}
                  isStopping={isStopping}
                  isPausing={isPausing}
                  isResuming={isResuming}
                  requiresLogin={currentTask.requiresLogin}
                  loginUrl={currentTask.loginUrl}
                  loginSite={currentTask.loginSite}
                  interventionReason={currentTask.interventionReason}
                  interventionMessage={currentTask.interventionMessage}
                  interventionType={currentTask.interventionType}
                  currentPhase={currentTask.currentPhase}
                  deliverables={currentTask.deliverables}
                  extractedData={currentTask.extractedData}
                  taskSummary={currentTask.taskSummary}
                  plannedSteps={currentTask.plannedSteps}
                  currentPlanStepId={currentTask.currentPlanStepId}
                  todoItems={currentTask.todoItems}
                  isPlanning={currentTask.isPlanning}
                  siteKnowledge={currentTask.siteKnowledge}
                  nextSteps={currentTask.nextSteps}
                  challenges={currentTask.challenges}
                  processReport={currentTask.processReport}
                  taskDescription={currentTask.taskDescription}
                  onSelectNextStep={(step) => step.prompt && executeTask(step.prompt, activeConversationId || undefined, selectedProfileId || undefined)}
                  // New feature props
                  suggestedTakeover={currentTask.suggestedTakeover}
                  takeoverMessage={currentTask.takeoverMessage}
                  shellSessions={currentTask.shellSessions}
                  activeShellSessionId={currentTask.activeShellSessionId}
                  deployments={currentTask.deployments}
                  notifications={currentTask.notifications}
                  onAcceptTakeover={pauseTask}
                  onDeclineTakeover={() => {}} // Continue automatically
                />
              ) : (
                <CodePreview
                  files={parsedCode.files}
                  mainFile={parsedCode.mainFile}
                  template={parsedCode.template}
                />
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="h-full w-full flex items-center justify-center p-4">
            <div className="max-w-md w-full flex flex-col items-center text-center gap-6">
              <span className="text-7xl">🧄</span>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">What should I automate today?</h2>
                <p className="text-muted-foreground mt-2">Describe a browser task or ask me to build something — I'll handle the rest.</p>
              </div>
              <Button onClick={handleNewConversation} size="lg" className="w-full">
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Start New Chat
              </Button>
              <div className="flex flex-col gap-2 w-full">
                {quickStartExamples.map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    className="w-full text-muted-foreground hover:text-foreground justify-start gap-2"
                    onClick={() => handleQuickStart(example)}
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
