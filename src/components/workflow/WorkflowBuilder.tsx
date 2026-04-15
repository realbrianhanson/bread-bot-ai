import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GitBranch } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface WorkflowBuilderProps {
  onExecuteWorkflow?: (steps: { prompt: string }[]) => void;
}

export function WorkflowBuilder({ onExecuteWorkflow: _ }: WorkflowBuilderProps) {
  const navigate = useNavigate();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/workflows')}
        >
          <GitBranch className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">Workflows</p>
      </TooltipContent>
    </Tooltip>
  );
}
