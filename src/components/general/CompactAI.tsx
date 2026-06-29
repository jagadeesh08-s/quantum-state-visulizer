import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, MessageCircle, Send, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const CompactAI: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const askQuestion = async () => {
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';
      const response = await fetch(`${baseUrl}/api/ai/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: question.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      setLastAnswer(data.answer);
      setQuestion('');
      toast.success('AI response received!');
    } catch (error) {
      console.error('AI request failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get AI response';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-primary/10"
        >
          <Brain className="h-4 w-4 text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">AI Quantum Assistant</span>
          </div>

          {error && (
            <Alert className="border-red-500/20 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-300 text-xs">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {lastAnswer && (
            <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-1">Last response:</p>
              <p className="text-sm">{lastAnswer}</p>
            </div>
          )}

          <div className="space-y-2">
            <Input
              placeholder="Ask about quantum computing..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  askQuestion();
                }
              }}
              className="text-sm"
              disabled={isLoading}
            />
            <Button
              onClick={askQuestion}
              disabled={!question.trim() || isLoading}
              size="sm"
              className="w-full"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  Thinking...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="h-3 w-3" />
                  Ask AI
                </div>
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Quick suggestions:</strong></p>
            <button
              onClick={() => setQuestion("What is quantum entanglement?")}
              className="block w-full text-left hover:text-primary transition-colors py-1"
              disabled={isLoading}
            >
              What is quantum entanglement?
            </button>
            <button
              onClick={() => setQuestion("How does a quantum computer work?")}
              className="block w-full text-left hover:text-primary transition-colors py-1"
              disabled={isLoading}
            >
              How does a quantum computer work?
            </button>
            <button
              onClick={() => setQuestion("What is superposition?")}
              className="block w-full text-left hover:text-primary transition-colors py-1"
              disabled={isLoading}
            >
              What is superposition?
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CompactAI;