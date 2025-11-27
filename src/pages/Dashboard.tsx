import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, MessageSquarePlus, ChevronLeft, ChevronRight } from "lucide-react";
import ChatContainer from "@/components/chat/ChatContainer";
import ConversationList from "@/components/chat/ConversationList";
import CodePreview from "@/components/chat/CodePreview";
import { useChat } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
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

      {/* Main Content */}
      <div className="container mx-auto px-2 md:px-4 py-2">
        <div className="flex gap-2 md:gap-4 h-[calc(100vh-80px)]">
          {/* Conversation Sidebar */}
          <div 
            className={`transition-all duration-300 ${
              sidebarCollapsed ? 'hidden md:block md:w-0' : 'absolute md:relative inset-0 z-20 md:z-0 w-full md:w-64'
            } overflow-hidden bg-background md:bg-transparent`}
          >
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={(id) => {
                handleSelectConversation(id);
                // Auto-collapse sidebar on mobile after selection
                if (window.innerWidth < 768) setSidebarCollapsed(true);
              }}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onRenameConversation={renameConversation}
            />
          </div>

          {/* Toggle Sidebar Button - Desktop only */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex self-start mt-2 h-8 w-8"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>

          {/* Main Content Area - Split View */}
          <div className="flex-1 min-w-0">
            {/* Mobile: Stack vertically */}
            <div className="h-full flex flex-col md:hidden">
              {(activeConversationId || messages.length > 0) ? (
                <>
                  <div className="flex-1 h-1/2">
                    <ChatContainer
                      messages={messages}
                      isLoading={isLoading}
                      isStreaming={isStreaming}
                      onSendMessage={sendMessage}
                      onStopStreaming={stopStreaming}
                    />
                  </div>
                  <div className="flex-1 h-1/2 border-t">
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
            
            {/* Desktop: Resizable split view */}
            <div className="h-full hidden md:block">
              {(activeConversationId || messages.length > 0) ? (
                <ResizablePanelGroup direction="horizontal" className="h-full">
                  {/* Chat Panel */}
                  <ResizablePanel defaultSize={50} minSize={30}>
                    <ChatContainer
                      messages={messages}
                      isLoading={isLoading}
                      isStreaming={isStreaming}
                      onSendMessage={sendMessage}
                      onStopStreaming={stopStreaming}
                    />
                  </ResizablePanel>

                  {/* Resizable Handle */}
                  <ResizableHandle withHandle />

                  {/* Preview Panel */}
                  <ResizablePanel defaultSize={50} minSize={30}>
                    <CodePreview
                      files={parsedCode.files}
                      mainFile={parsedCode.mainFile}
                      template={parsedCode.template}
                    />
                  </ResizablePanel>
                </ResizablePanelGroup>
              ) : (
                <div className="h-full flex items-center justify-center p-4">
                  <Card className="max-w-md w-full">
                    <CardHeader>
                      <CardTitle className="text-xl">Welcome to AI Assistant</CardTitle>
                      <CardDescription>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;