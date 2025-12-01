import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, MessageSquarePlus, ChevronLeft, ChevronRight } from "lucide-react";
import ChatContainer from "@/components/chat/ChatContainer";
import ConversationList from "@/components/chat/ConversationList";
import CodePreview from "@/components/chat/CodePreview";
import TaskHistory from "@/components/chat/TaskHistory";
import ProfileSelector from "@/components/chat/ProfileSelector";
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
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="h-8 w-8"
            >
              <LogOut className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
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
              <CodePreview
                files={parsedCode.files}
                mainFile={parsedCode.mainFile}
                template={parsedCode.template}
              />
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle className="text-lg">Welcome to AI Assistant</CardTitle>
                <CardDescription className="text-sm">
                  Start a new conversation or select an existing one from the sidebar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleNewConversation} className="w-full">
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  Start New Chat
                </Button>
              </CardContent>
            </Card>
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
                  />
                </div>
              </div>
            </ResizablePanel>

            {/* Resizable Handle */}
            <ResizableHandle withHandle />

            {/* Right Panel: Preview */}
            <ResizablePanel defaultSize={65} minSize={40} className="relative">
              <CodePreview
                files={parsedCode.files}
                mainFile={parsedCode.mainFile}
                template={parsedCode.template}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="h-full w-full flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle className="text-xl">Welcome to AI Assistant</CardTitle>
                <CardDescription>
                  Start a new conversation or select an existing one
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleNewConversation} className="w-full">
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  Start New Chat
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
