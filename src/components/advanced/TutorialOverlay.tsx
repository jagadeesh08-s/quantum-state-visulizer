import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    X,
    Lightbulb,
    ChevronRight,
    CheckCircle,
    HelpCircle,
    Sparkles,
    Info
} from 'lucide-react';
import { useTutorial } from '@/contexts/TutorialContext';

export const TutorialOverlay: React.FC = () => {
    const { session, selectedGoal, endSession, activeFeedback } = useTutorial();
    const [showHint, setShowHint] = useState(false);

    if (!session || !selectedGoal) return null;

    const currentStep = selectedGoal.steps[session.currentStepIndex];
    if (!currentStep) return null;

    const progress = (session.completedSteps.length / selectedGoal.steps.length) * 100;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                className="fixed top-24 right-6 z-[100] w-80 pointer-events-auto"
            >
                <Card className="border-primary/40 bg-card/80 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                    {/* Animated background glow */}
                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/20 rounded-full blur-2xl animate-pulse" />

                    <CardHeader className="p-4 pb-2 border-b border-border/20">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                                    Tutorial Mode
                                </Badge>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={endSession}
                                className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <CardTitle className="text-sm font-bold truncate">
                            {selectedGoal.title}
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="p-4 space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                <span>Step {session.currentStepIndex + 1} of {selectedGoal.steps.length}</span>
                                <span>{Math.round(progress)}% Complete</span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                        </div>

                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-foreground">
                                {currentStep.title}
                            </h4>

                            <Alert className="border-primary/20 bg-primary/5 p-3">
                                <Info className="h-4 w-4 text-primary" />
                                <AlertDescription className="text-xs leading-relaxed">
                                    {currentStep.instruction}
                                </AlertDescription>
                            </Alert>

                            {activeFeedback && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <Alert className={`p-2 border-green-500/20 bg-green-500/5 ${activeFeedback.includes('Please switch') ? 'border-orange-500/20 bg-orange-500/5' : ''}`}>
                                        <div className="flex gap-2 items-center">
                                            <CheckCircle className={`h-3 w-3 ${activeFeedback.includes('Please switch') ? 'text-orange-500' : 'text-green-500'}`} />
                                            <span className={`text-[11px] font-medium ${activeFeedback.includes('Please switch') ? 'text-orange-600' : 'text-green-600'}`}>
                                                {activeFeedback}
                                            </span>
                                        </div>
                                    </Alert>
                                </motion.div>
                            )}
                        </div>

                        <div className="pt-2 flex flex-col gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs h-8 border-primary/20 hover:bg-primary/5"
                                onClick={() => setShowHint(!showHint)}
                            >
                                <HelpCircle className="w-3 h-3 mr-2" />
                                {showHint ? 'Hide' : 'Need a hint?'}
                            </Button>

                            <AnimatePresence>
                                {showHint && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mt-1">
                                            <div className="flex gap-2">
                                                <Lightbulb className="w-3 h-3 text-yellow-500 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-yellow-700 dark:text-yellow-400 italic">
                                                    {currentStep.hints[0]}
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </AnimatePresence>
    );
};
