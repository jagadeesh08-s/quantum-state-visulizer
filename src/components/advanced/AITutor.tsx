import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Brain,
  MessageCircle,
  Lightbulb,
  Target,
  Trophy,
  Star,
  HelpCircle,
  CheckCircle,
  AlertCircle,
  Sparkles,
  BookOpen,
  TrendingUp,
  Award,
  Zap
} from 'lucide-react';

interface LearningStep {
  id: string;
  title: string;
  description: string;
  instruction: string;
  expectedAction: {
    type: 'switch_tab' | 'add_gate' | 'run_simulation' | 'check_result';
    tab?: 'circuit' | 'code' | 'visualization';
    gate?: {
      name: string;
      qubits: number[];
      parameters?: number[];
    };
    circuitCheck?: {
      requiredGates: Array<{
        name: string;
        qubits: number[];
        position?: number;
      }>;
    };
    resultCheck?: {
      expectedProbabilities?: number[];
      expectedEntanglement?: boolean;
    };
  };
  hints: string[];
  successMessage: string;
}

interface LearningGoal {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  prerequisites: string[];
  topics: string[];
  steps: LearningStep[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface ConversationMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface UserProgress {
  level: number;
  experience: number;
  experienceToNext: number;
  completedGoals: string[];
  currentStreak: number;
  totalStudyTime: number;
  achievements: Achievement[];
}

interface InteractiveSession {
  goalId: string;
  currentStepIndex: number;
  completedSteps: string[];
  isActive: boolean;
  startTime: Date;
  lastActivity: Date;
}

interface CircuitState {
  currentCircuit: any; // QuantumCircuit
  simulationResults: any; // Simulation results
  activeTab: string;
}

interface AITutorProps {
  onGoalComplete?: (goalId: string) => void;
  onRequestTabSwitch?: (tab: string, reason: string) => void;
  circuitState?: CircuitState;
  onStepComplete?: (goalId: string, stepId: string) => void;
}

const LEARNING_GOALS: LearningGoal[] = [
  {
    id: 'bell_state',
    title: 'Create a Bell State',
    description: 'Learn to create quantum entanglement with a Bell state circuit',
    difficulty: 'beginner',
    estimatedTime: 15,
    prerequisites: [],
    topics: ['Superposition', 'Entanglement', 'Bell States'],
    steps: [
      {
        id: 'switch_to_circuit',
        title: 'Switch to Circuit Tab',
        description: 'Navigate to the circuit builder to start building',
        instruction: 'Click on the "Circuit" tab to begin building your quantum circuit.',
        expectedAction: {
          type: 'switch_tab',
          tab: 'circuit'
        },
        hints: ['Look for the tab labeled "Circuit" at the top', 'The circuit tab has a palette icon'],
        successMessage: 'Great! Now you\'re in the circuit builder.'
      },
      {
        id: 'add_hadamard',
        title: 'Add Hadamard Gate',
        description: 'Apply a Hadamard gate to create superposition',
        instruction: 'Add a Hadamard (H) gate to qubit 0. This creates a superposition state.',
        expectedAction: {
          type: 'add_gate',
          gate: {
            name: 'H',
            qubits: [0]
          }
        },
        hints: ['Drag the H gate from the gate palette onto qubit 0', 'The Hadamard gate creates |+⟩ = (|0⟩ + |1⟩)/√2'],
        successMessage: 'Perfect! The Hadamard gate creates superposition on qubit 0.'
      },
      {
        id: 'add_cnot',
        title: 'Add CNOT Gate',
        description: 'Create entanglement with a controlled-NOT gate',
        instruction: 'Add a CNOT gate with qubit 0 as control and qubit 1 as target.',
        expectedAction: {
          type: 'add_gate',
          gate: {
            name: 'CNOT',
            qubits: [0, 1]
          }
        },
        hints: ['Connect qubit 0 (control) to qubit 1 (target)', 'The CNOT gate creates the entangled Bell state'],
        successMessage: 'Excellent! Now you have a Bell state circuit.'
      },
      {
        id: 'run_simulation',
        title: 'Run Simulation',
        description: 'Execute the circuit to see the entangled results',
        instruction: 'Click the "Run Local Simulation" button to see your Bell state results.',
        expectedAction: {
          type: 'run_simulation'
        },
        hints: ['Look for the blue "Run Local Simulation" button', 'The simulation will show entangled probabilities'],
        successMessage: 'Amazing! You\'ve created a Bell state with perfect entanglement.'
      }
    ]
  },
  {
    id: 'quantum_basics',
    title: 'Quantum Computing Basics',
    description: 'Master the fundamental concepts of quantum computing',
    difficulty: 'beginner',
    estimatedTime: 60,
    prerequisites: [],
    topics: ['Qubits', 'Superposition', 'Entanglement', 'Measurement'],
    steps: []
  },
  {
    id: 'quantum_gates',
    title: 'Quantum Gates & Circuits',
    description: 'Learn about quantum gates and circuit construction',
    difficulty: 'beginner',
    estimatedTime: 90,
    prerequisites: ['quantum_basics'],
    topics: ['Pauli Gates', 'Hadamard Gate', 'CNOT Gate', 'Circuit Diagrams'],
    steps: []
  },
  {
    id: 'quantum_algorithms',
    title: 'Quantum Algorithms',
    description: 'Explore famous quantum algorithms and their applications',
    difficulty: 'intermediate',
    estimatedTime: 120,
    prerequisites: ['quantum_gates'],
    topics: ['Deutsch-Jozsa', 'Grover Search', 'Shor Factoring', 'Quantum Fourier Transform'],
    steps: []
  },
  {
    id: 'vqe_mastery',
    title: 'VQE & Molecular Chemistry',
    description: 'Master Variational Quantum Eigensolver for quantum chemistry',
    difficulty: 'advanced',
    estimatedTime: 180,
    prerequisites: ['quantum_algorithms'],
    topics: ['VQE Theory', 'UCC Ansätze', 'Molecular Orbitals', 'Energy Calculations'],
    steps: []
  },
  {
    id: 'qaoa_optimization',
    title: 'QAOA for Optimization',
    description: 'Learn Quantum Approximate Optimization Algorithm',
    difficulty: 'advanced',
    estimatedTime: 150,
    prerequisites: ['quantum_algorithms'],
    topics: ['Max-Cut Problem', 'QAOA Ansätze', 'Parameter Optimization', 'Approximation Ratios'],
    steps: []
  }
];

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_circuit',
    title: 'First Circuit',
    description: 'Create your first quantum circuit',
    icon: '⚡',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    rarity: 'common'
  },
  {
    id: 'quantum_explorer',
    title: 'Quantum Explorer',
    description: 'Complete 5 different quantum algorithms',
    icon: '🧭',
    unlocked: false,
    progress: 0,
    maxProgress: 5,
    rarity: 'rare'
  },
  {
    id: 'vqe_virtuoso',
    title: 'VQE Virtuoso',
    description: 'Successfully run VQE on 3 different molecules',
    icon: '🧪',
    unlocked: false,
    progress: 0,
    maxProgress: 3,
    rarity: 'epic'
  },
  {
    id: 'optimization_master',
    title: 'Optimization Master',
    description: 'Solve 10 different optimization problems with QAOA',
    icon: '🎯',
    unlocked: false,
    progress: 0,
    maxProgress: 10,
    rarity: 'legendary'
  }
];

export const AITutor: React.FC<AITutorProps> = ({
  onGoalComplete,
  onRequestTabSwitch,
  circuitState,
  onStepComplete
}) => {
  const [userProgress, setUserProgress] = useState<UserProgress>({
    level: 1,
    experience: 0,
    experienceToNext: 100,
    completedGoals: [],
    currentStreak: 0,
    totalStudyTime: 0,
    achievements: INITIAL_ACHIEVEMENTS
  });

  const [selectedGoal, setSelectedGoal] = useState<LearningGoal | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [activeTab, setActiveTab] = useState<'goals' | 'progress' | 'achievements'>('goals');

  // Interactive tutoring state
  const [interactiveSession, setInteractiveSession] = useState<InteractiveSession | null>(null);
  const [currentStepFeedback, setCurrentStepFeedback] = useState<string>('');
  const [showHint, setShowHint] = useState(false);

  const askQuestion = async () => {
    if (!currentQuestion.trim()) return;

    const userMessage: ConversationMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: currentQuestion,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMessage]);
    setCurrentQuestion('');
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:8000/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage.content })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: ConversationMessage = {
          id: `assistant_${Date.now()}`,
          type: 'assistant',
          content: data.answer,
          timestamp: new Date(data.timestamp),
          suggestions: [
            "Can you explain that further?",
            "Give me an example.",
            "How does this relate to entanglement?"
          ]
        };
        setConversation(prev => [...prev, assistantMessage]);

        // Award experience (Optimistic)
        setUserProgress(prev => ({
          ...prev,
          experience: prev.experience + 10,
          totalStudyTime: prev.totalStudyTime + 5
        }));

        // Optionally sync progress to backend here
      } else {
        console.error("Backend error");
      }
    } catch (e) {
      console.error("Failed to call AI Tutor backend", e);
    } finally {
      setIsTyping(false);
    }
  };

  // Circuit monitoring and step completion detection
  const checkStepCompletion = (step: LearningStep): boolean => {
    if (!circuitState) {
      console.log('checkStepCompletion: No circuitState available');
      return false;
    }

    console.log('checkStepCompletion called for step:', step.id, 'type:', step.expectedAction.type);

    switch (step.expectedAction.type) {
      case 'switch_tab':
        const isTabCorrect = circuitState.activeTab === step.expectedAction.tab;
        console.log('Tab switch check:', {
          currentTab: circuitState.activeTab,
          expectedTab: step.expectedAction.tab,
          isCorrect: isTabCorrect
        });
        return isTabCorrect;

      case 'add_gate':
        if (!circuitState.currentCircuit?.gates) {
          console.log('Add gate check: No circuit or gates');
          return false;
        }
        const hasGate = circuitState.currentCircuit.gates.some(gate =>
          gate.name === step.expectedAction.gate?.name &&
          JSON.stringify(gate.qubits) === JSON.stringify(step.expectedAction.gate?.qubits)
        );
        console.log('Add gate check:', {
          expectedGate: step.expectedAction.gate,
          currentGates: circuitState.currentCircuit.gates,
          hasGate
        });
        return hasGate;

      case 'run_simulation':
        const hasResults = circuitState.simulationResults !== null;
        console.log('Run simulation check:', {
          hasSimulationResults: hasResults,
          simulationResults: circuitState.simulationResults
        });
        return hasResults;

      case 'check_result':
        if (!circuitState.simulationResults) {
          console.log('Check result: No simulation results');
          return false;
        }
        // Check if results match expected outcomes
        if (step.expectedAction.resultCheck?.expectedProbabilities) {
          const actualProbs = circuitState.simulationResults.probabilities || [];
          const matches = step.expectedAction.resultCheck.expectedProbabilities.every(
            (expected, index) => Math.abs(actualProbs[index] - expected) < 0.01
          );
          console.log('Check result probabilities:', {
            expected: step.expectedAction.resultCheck.expectedProbabilities,
            actual: actualProbs,
            matches
          });
          return matches;
        }
        console.log('Check result: No specific checks, returning true');
        return true;

      default:
        console.log('Unknown step type:', step.expectedAction.type);
        return false;
    }
  };

  const startInteractiveSession = (goal: LearningGoal) => {
    console.log('🎯 Starting interactive session for goal:', goal.id);
    console.log('📊 Current circuitState:', circuitState);

    setSelectedGoal(goal);
    setInteractiveSession({
      goalId: goal.id,
      currentStepIndex: 0,
      completedSteps: [],
      isActive: true,
      startTime: new Date(),
      lastActivity: new Date()
    });

    // Set initial feedback for the first step
    const firstStep = goal.steps[0];
    if (firstStep) {
      console.log('📝 Setting initial feedback for first step:', firstStep.id);
      if (firstStep.expectedAction.type === 'switch_tab' &&
        circuitState?.activeTab !== firstStep.expectedAction.tab) {
        setCurrentStepFeedback(`Please switch to the ${firstStep.expectedAction.tab} tab to continue.`);
      } else {
        setCurrentStepFeedback(firstStep.instruction);
      }
    }

    setShowHint(false);
    setActiveTab('goals');
  };

  const completeCurrentStep = () => {
    if (!interactiveSession || !selectedGoal) return;

    const currentStep = selectedGoal.steps[interactiveSession.currentStepIndex];
    const stepId = currentStep.id;
    const isLastStep = interactiveSession.currentStepIndex >= selectedGoal.steps.length - 1;

    // Mark step as completed
    setInteractiveSession(prev => prev ? {
      ...prev,
      completedSteps: [...prev.completedSteps, stepId],
      lastActivity: new Date()
    } : null);

    // Notify parent about step completion
    onStepComplete?.(interactiveSession.goalId, stepId);

    // Show success message
    setCurrentStepFeedback(currentStep.successMessage);

    // Award experience
    setUserProgress(prev => ({
      ...prev,
      experience: prev.experience + 25,
      totalStudyTime: prev.totalStudyTime + 2
    }));

    // Auto-advance to next step or complete goal
    setTimeout(() => {
      if (!isLastStep) {
        // Move to next step
        setInteractiveSession(prev => prev ? {
          ...prev,
          currentStepIndex: prev.currentStepIndex + 1
        } : null);
        setCurrentStepFeedback('');
        setShowHint(false);
      } else {
        // Complete the goal
        completeGoal(interactiveSession.goalId);
        setInteractiveSession(null);
        setCurrentStepFeedback('🎉 Congratulations! You\'ve completed this learning goal!');
      }
    }, 2000);
  };

  const completeGoal = (goalId: string) => {
    setUserProgress(prev => ({
      ...prev,
      completedGoals: [...prev.completedGoals, goalId],
      experience: prev.experience + 50,
      currentStreak: prev.currentStreak + 1
    }));

    // Notify parent component about goal completion
    onGoalComplete?.(goalId);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-300 text-gray-600';
      case 'rare': return 'border-blue-300 text-blue-600';
      case 'epic': return 'border-purple-300 text-purple-600';
      case 'legendary': return 'border-yellow-300 text-yellow-600';
      default: return 'border-gray-300 text-gray-600';
    }
  };

  // Level up logic
  useEffect(() => {
    let newLevel = userProgress.level;
    let remainingExp = userProgress.experience;
    let expToNext = 100;

    while (remainingExp >= expToNext) {
      remainingExp -= expToNext;
      newLevel++;
      expToNext = newLevel * 100;
    }

    if (newLevel !== userProgress.level) {
      setUserProgress(prev => ({
        ...prev,
        level: newLevel,
        experienceToNext: expToNext - remainingExp
      }));
    }
  }, [userProgress.experience, userProgress.level]);

  // Real-time circuit monitoring for interactive tutoring
  useEffect(() => {
    console.log('🔍 Circuit monitoring useEffect triggered:', {
      hasInteractiveSession: !!interactiveSession,
      hasSelectedGoal: !!selectedGoal,
      hasCircuitState: !!circuitState,
      circuitState: circuitState ? {
        activeTab: circuitState.activeTab,
        hasCircuit: !!circuitState.currentCircuit,
        hasSimulationResults: !!circuitState.simulationResults
      } : null
    });

    if (!interactiveSession || !selectedGoal || !circuitState) {
      console.log('❌ Skipping step check - missing required state');
      return;
    }

    const currentStep = selectedGoal.steps[interactiveSession.currentStepIndex];
    if (!currentStep) {
      console.log('❌ No current step found');
      return;
    }

    console.log('📋 Current step:', {
      id: currentStep.id,
      title: currentStep.title,
      type: currentStep.expectedAction.type,
      expectedTab: currentStep.expectedAction.tab
    });

    // Check if current step is completed
    const isCompleted = checkStepCompletion(currentStep);

    console.log('✅ Step completion check:', {
      stepId: currentStep.id,
      isCompleted,
      alreadyCompleted: interactiveSession.completedSteps.includes(currentStep.id)
    });

    if (isCompleted && !interactiveSession.completedSteps.includes(currentStep.id)) {
      console.log('🚀 Auto-completing step:', currentStep.id);
      completeCurrentStep();
    } else if (!isCompleted) {
      console.log('⏳ Step not completed, checking for feedback...');

      // Check if user is in wrong tab and needs redirect
      if (currentStep.expectedAction.type === 'switch_tab' &&
        currentStep.expectedAction.tab &&
        circuitState.activeTab !== currentStep.expectedAction.tab) {
        const feedback = `Please switch to the ${currentStep.expectedAction.tab} tab to continue.`;
        console.log('📢 Setting tab switch feedback:', feedback);
        setCurrentStepFeedback(feedback);
        onRequestTabSwitch?.(currentStep.expectedAction.tab, `Required for: ${currentStep.title}`);
      } else if (currentStep.expectedAction.type !== 'switch_tab') {
        // Provide contextual feedback based on current state
        const feedback = getContextualFeedback(currentStep, circuitState);
        if (feedback) {
          console.log('💬 Setting contextual feedback:', feedback);
          setCurrentStepFeedback(feedback);
        } else {
          console.log('🤔 No contextual feedback available');
        }
      } else {
        console.log('✅ User is already on correct tab for step:', currentStep.id);
        // If user is on correct tab but step isn't completed, provide instruction
        if (currentStep.expectedAction.type === 'switch_tab') {
          setCurrentStepFeedback(currentStep.successMessage);
        }
      }
    }
  }, [circuitState, interactiveSession, selectedGoal]);

  const getContextualFeedback = (step: LearningStep, circuitState: CircuitState): string => {
    switch (step.expectedAction.type) {
      case 'add_gate':
        if (!circuitState.currentCircuit?.gates?.length) {
          return "Start by adding the required gate to your circuit.";
        }
        const hasGate = circuitState.currentCircuit.gates.some(gate =>
          gate.name === step.expectedAction.gate?.name
        );
        if (!hasGate) {
          return `Add a ${step.expectedAction.gate?.name} gate to continue.`;
        }
        return "You're on the right track! Make sure the gate is connected correctly.";

      case 'run_simulation':
        if (!circuitState.simulationResults) {
          return "Run a simulation to see your circuit's behavior.";
        }
        return "Great! Check the results to see if they match the expected outcome.";

      default:
        return step.instruction;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-500" />
          </div>
          {interactiveSession && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse">
              <div className="w-full h-full bg-green-400 rounded-full animate-ping"></div>
            </div>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-bold">
            AI Quantum Tutor
            {interactiveSession && (
              <Badge className="ml-2 bg-green-500/20 text-green-700 border-green-500/30">
                Interactive Session Active
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground">
            {interactiveSession
              ? `Guiding you through: ${selectedGoal?.title}`
              : "Your personal guide to mastering quantum computing"
            }
          </p>
        </div>
      </div>

      {/* Progress Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">Level {userProgress.level}</div>
                <div className="text-sm text-muted-foreground">Quantum Scholar</div>
              </div>
              <div className="flex-1 max-w-xs">
                <div className="flex justify-between text-sm mb-1">
                  <span>Experience</span>
                  <span>{userProgress.experience} XP</span>
                </div>
                <Progress
                  value={(userProgress.experience % 100) / 100 * 100}
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {userProgress.experienceToNext} XP to next level
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-green-600">{userProgress.currentStreak}</div>
                <div className="text-muted-foreground">Day Streak</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-600">{Math.floor(userProgress.totalStudyTime / 60)}h</div>
                <div className="text-muted-foreground">Study Time</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-purple-600">{userProgress.completedGoals.length}</div>
                <div className="text-muted-foreground">Goals Completed</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Learning Goals
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Achievements
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-6">
          {/* Interactive Tutoring Session */}
          {interactiveSession && selectedGoal && (() => {
            console.log('Rendering interactive session UI:', {
              session: interactiveSession,
              goal: selectedGoal.id,
              currentStepIndex: interactiveSession.currentStepIndex,
              totalSteps: selectedGoal.steps.length
            });
            return true;
          })() && (
              <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Interactive Learning Session
                  </CardTitle>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-primary">
                      Step {interactiveSession.currentStepIndex + 1} of {selectedGoal.steps.length}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInteractiveSession(null);
                        setSelectedGoal(null);
                        setCurrentStepFeedback('');
                      }}
                    >
                      End Session
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const currentStep = selectedGoal.steps[interactiveSession.currentStepIndex];
                    return (
                      <div className="space-y-4">
                        <div className="text-center">
                          <h3 className="text-lg font-bold mb-2">{currentStep.title}</h3>
                          <p className="text-muted-foreground">{currentStep.description}</p>
                        </div>

                        <Alert className="border-blue-500/30 bg-blue-500/5">
                          <Lightbulb className="h-4 w-4 text-blue-500" />
                          <AlertDescription className="text-blue-700 dark:text-blue-300">
                            {currentStep.instruction}
                          </AlertDescription>
                        </Alert>

                        {/* Always show current status */}
                        <div className="text-sm text-muted-foreground">
                          Status: {interactiveSession.completedSteps.includes(currentStep.id) ?
                            '✅ Completed' :
                            checkStepCompletion(currentStep) ?
                              '🎯 Ready to complete' :
                              '⏳ In progress'}
                        </div>

                        {currentStepFeedback && (
                          <Alert className={`border-green-500/30 bg-green-500/5 ${currentStepFeedback.includes('Please switch') ? 'border-orange-500/30 bg-orange-500/5' : ''
                            }`}>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <AlertDescription className="text-green-700 dark:text-green-300">
                              {currentStepFeedback}
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowHint(!showHint)}
                          >
                            <HelpCircle className="w-4 h-4 mr-2" />
                            {showHint ? 'Hide' : 'Show'} Hint
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (interactiveSession && selectedGoal) {
                                const currentStep = selectedGoal.steps[interactiveSession.currentStepIndex];
                                const isCompleted = checkStepCompletion(currentStep);
                                if (isCompleted && !interactiveSession.completedSteps.includes(currentStep.id)) {
                                  completeCurrentStep();
                                } else {
                                  setCurrentStepFeedback('Step not yet completed. Follow the instructions above.');
                                }
                              }
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Check Progress
                          </Button>
                        </div>

                        {showHint && (
                          <Alert className="border-yellow-500/30 bg-yellow-500/5">
                            <HelpCircle className="h-4 w-4 text-yellow-500" />
                            <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                              {currentStep.hints[Math.floor(Math.random() * currentStep.hints.length)]}
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Progress Indicator */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Session Progress</span>
                            <span>{interactiveSession.completedSteps.length}/{selectedGoal.steps.length} steps</span>
                          </div>
                          <Progress
                            value={(interactiveSession.completedSteps.length / selectedGoal.steps.length) * 100}
                            className="h-2"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Available Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {LEARNING_GOALS.map((goal) => {
                  const isCompleted = userProgress.completedGoals.includes(goal.id);
                  const canStart = goal.prerequisites.every(prereq =>
                    userProgress.completedGoals.includes(prereq)
                  );

                  return (
                    <div
                      key={goal.id}
                      className={`p-4 border rounded-lg transition-all ${isCompleted
                          ? 'border-green-500 bg-green-500/5'
                          : canStart
                            ? 'border-primary/50 hover:border-primary cursor-pointer'
                            : 'border-gray-300 opacity-60'
                        }`}
                      onClick={() => canStart && !isCompleted && setSelectedGoal(goal)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{goal.title}</h4>
                        <div className="flex items-center gap-2">
                          <Badge className={getDifficultyColor(goal.difficulty)}>
                            {goal.difficulty}
                          </Badge>
                          {isCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{goal.estimatedTime} min</span>
                        <div className="flex gap-1">
                          {goal.topics.slice(0, 2).map((topic, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {!canStart && (
                        <div className="mt-2 text-xs text-orange-600">
                          Prerequisites: {goal.prerequisites.join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Goal Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedGoal ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold mb-2">{selectedGoal.title}</h3>
                      <p className="text-muted-foreground mb-4">{selectedGoal.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Difficulty:</span>
                        <div className="font-medium capitalize">{selectedGoal.difficulty}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Estimated Time:</span>
                        <div className="font-medium">{selectedGoal.estimatedTime} minutes</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Topics Covered:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedGoal.topics.map((topic, index) => (
                          <Badge key={index} variant="outline">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {selectedGoal.steps.length > 0 ? (
                        <Button
                          onClick={() => startInteractiveSession(selectedGoal)}
                          className="w-full"
                          disabled={userProgress.completedGoals.includes(selectedGoal.id)}
                        >
                          {userProgress.completedGoals.includes(selectedGoal.id) ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Completed
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Start Interactive Tutorial
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => completeGoal(selectedGoal.id)}
                          className="w-full"
                          disabled={userProgress.completedGoals.includes(selectedGoal.id)}
                        >
                          {userProgress.completedGoals.includes(selectedGoal.id) ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Completed
                            </>
                          ) : (
                            <>
                              <Target className="w-4 h-4 mr-2" />
                              Mark as Complete
                            </>
                          )}
                        </Button>
                      )}

                      {selectedGoal.steps.length > 0 && !userProgress.completedGoals.includes(selectedGoal.id) && (
                        <p className="text-xs text-muted-foreground text-center">
                          This goal includes {selectedGoal.steps.length} interactive steps with real-time guidance
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Select a Learning Goal</h3>
                    <p>Choose a goal from the list to view details and track your progress.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        <TabsContent value="progress" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Learning Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-primary/5 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{userProgress.completedGoals.length}</div>
                    <div className="text-sm text-muted-foreground">Goals Completed</div>
                  </div>
                  <div className="text-center p-4 bg-secondary/5 rounded-lg">
                    <div className="text-2xl font-bold text-secondary">{userProgress.experience}</div>
                    <div className="text-sm text-muted-foreground">Total XP</div>
                  </div>
                  <div className="text-center p-4 bg-accent/5 rounded-lg">
                    <div className="text-2xl font-bold text-accent">{Math.floor(userProgress.totalStudyTime / 60)}h</div>
                    <div className="text-sm text-muted-foreground">Study Time</div>
                  </div>
                  <div className="text-center p-4 bg-muted/5 rounded-lg">
                    <div className="text-2xl font-bold">{userProgress.currentStreak}</div>
                    <div className="text-sm text-muted-foreground">Day Streak</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skill Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {LEARNING_GOALS.map((goal) => {
                  const isCompleted = userProgress.completedGoals.includes(goal.id);
                  const progress = isCompleted ? 100 : 0;

                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{goal.title}</span>
                        <span className="text-sm text-muted-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userProgress.achievements.map((achievement) => (
              <Card
                key={achievement.id}
                className={`transition-all ${achievement.unlocked
                    ? 'border-yellow-500/50 bg-yellow-500/5'
                    : 'border-gray-200 opacity-75'
                  }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`text-2xl ${achievement.unlocked ? '' : 'grayscale'}`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{achievement.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge className={getRarityColor(achievement.rarity)}>
                          {achievement.rarity}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {achievement.progress}/{achievement.maxProgress}
                        </span>
                      </div>
                      <Progress
                        value={(achievement.progress / achievement.maxProgress) * 100}
                        className="h-1 mt-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};