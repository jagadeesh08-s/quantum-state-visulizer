import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, MessageCircle, Send, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';

export const FloatingAI: React.FC = () => {
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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/tutor/chat`, {
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
    <>
      {/* Floating AI Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-white/20 backdrop-blur-sm"
            >
              <Brain className="h-6 w-6 text-white" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 mr-4 mb-2" align="end" side="top">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">AI Quantum Assistant</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
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
      </motion.div>

      {/* Floating animation pulse */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            className="fixed bottom-6 right-6 z-40 pointer-events-none"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5]
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-500/30 to-purple-600/30 blur-sm" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingAI;