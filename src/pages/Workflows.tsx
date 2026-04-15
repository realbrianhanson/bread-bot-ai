import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkflows, type Workflow } from '@/hooks/useWorkflows';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  GitBranch, Plus, Trash2, Play, ArrowLeft, Clock, Loader2,
} from 'lucide-react';
import { GarlicLogo } from '@/components/ui/logo-icon';
import { motion } from 'framer-motion';

const WorkflowsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { workflows, isLoading, createWorkflow, deleteWorkflow } = useWorkflows();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  if (!user) return null;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const wf = await createWorkflow(newName.trim(), newDesc.trim());
    setNewName('');
    setNewDesc('');
    setCreateOpen(false);
    if (wf) navigate(`/workflows/${wf.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-12 border-b border-border/50 bg-card/80 backdrop-blur-sm flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <GarlicLogo size={20} />
          <span className="text-sm font-semibold">Workflows</span>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New Workflow
        </Button>
      </header>

      <div className="max-w-3xl mx-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <GitBranch className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <h2 className="text-lg font-semibold">No workflows yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Create multi-step automation workflows. Each step runs in sequence, feeding its output to the next.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create your first workflow
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map((wf, i) => (
              <motion.div
                key={wf.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <button
                  onClick={() => navigate(`/workflows/${wf.id}`)}
                  className="w-full text-left p-4 rounded-xl border border-border/50 bg-card/50 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-primary shrink-0" />
                        <p className="text-sm font-semibold text-foreground truncate">{wf.name}</p>
                        <Badge variant="secondary" className="text-[10px]">
                          {(wf.steps || []).length} step{(wf.steps || []).length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {wf.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 pl-6">{wf.description}</p>
                      )}
                      {wf.last_run_at && (
                        <p className="text-[10px] text-muted-foreground mt-1 pl-6 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last run {new Date(wf.last_run_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); navigate(`/workflows/${wf.id}`); }}
                      >
                        <Play className="h-3 w-3" />
                        Open
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{wf.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteWorkflow(wf.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input placeholder="Workflow name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkflowsPage;
