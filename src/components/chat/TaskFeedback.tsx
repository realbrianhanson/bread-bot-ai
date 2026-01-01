import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Star,
  Send,
  X
} from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

type Rating = 'positive' | 'negative' | null;
type StarRating = 1 | 2 | 3 | 4 | 5 | null;

interface TaskFeedbackProps {
  taskId: string;
  onSubmitFeedback?: (feedback: {
    taskId: string;
    rating: Rating;
    stars?: StarRating;
    comment?: string;
  }) => void;
}

const TaskFeedback = ({ taskId, onSubmitFeedback }: TaskFeedbackProps) => {
  const [rating, setRating] = useState<Rating>(null);
  const [stars, setStars] = useState<StarRating>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleRating = (newRating: Rating) => {
    setRating(newRating);
    if (newRating === 'negative') {
      setShowComment(true);
    }
  };

  const handleSubmit = () => {
    if (onSubmitFeedback) {
      onSubmitFeedback({
        taskId,
        rating,
        stars,
        comment: comment || undefined,
      });
    }
    
    setSubmitted(true);
    toast({
      title: 'Feedback submitted',
      description: 'Thank you for helping us improve!',
    });
  };

  if (submitted) {
    return (
      <Card className="p-3 bg-green-500/10 border-green-500/30">
        <div className="flex items-center gap-2 text-sm text-green-500">
          <ThumbsUp className="h-4 w-4" />
          <span>Thanks for your feedback!</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-muted/20 backdrop-blur-sm border-border/50">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-purple-500" />
            <h3 className="font-semibold text-sm">How did this task go?</h3>
          </div>
        </div>

        {/* Quick Rating */}
        <div className="flex items-center gap-2">
          <Button
            variant={rating === 'positive' ? 'default' : 'outline'}
            size="sm"
            className={`h-9 ${rating === 'positive' ? 'bg-green-500 hover:bg-green-600' : ''}`}
            onClick={() => handleRating('positive')}
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            Good
          </Button>
          <Button
            variant={rating === 'negative' ? 'default' : 'outline'}
            size="sm"
            className={`h-9 ${rating === 'negative' ? 'bg-red-500 hover:bg-red-600' : ''}`}
            onClick={() => handleRating('negative')}
          >
            <ThumbsDown className="h-4 w-4 mr-1" />
            Could be better
          </Button>
        </div>

        {/* Star Rating */}
        {rating && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-2">Rate quality:</span>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => setStars(value as StarRating)}
                className="p-0.5 hover:scale-110 transition-transform"
              >
                <Star 
                  className={`h-5 w-5 ${
                    stars && value <= stars 
                      ? 'text-yellow-500 fill-yellow-500' 
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
        )}

        {/* Comment Section */}
        {showComment && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">What could be improved?</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowComment(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <Textarea
              placeholder="Tell us what went wrong or could be better..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[80px] text-sm resize-none"
            />
          </div>
        )}

        {/* Toggle Comment */}
        {rating && !showComment && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2"
            onClick={() => setShowComment(true)}
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Add comment
          </Button>
        )}

        {/* Submit Button */}
        {rating && (
          <Button
            size="sm"
            className="w-full"
            onClick={handleSubmit}
          >
            <Send className="h-3 w-3 mr-1" />
            Submit Feedback
          </Button>
        )}
      </div>
    </Card>
  );
};

export default TaskFeedback;
