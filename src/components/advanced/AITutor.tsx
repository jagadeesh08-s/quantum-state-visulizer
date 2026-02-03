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
import { useTutorial, LearningGoal, LearningStep } from '@/contexts/TutorialContext';

// Using types from TutorialContext

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

// Using types from TutorialContext

interface AITutorProps {
  onGoalComplete?: (goalId: string) => void;
  // circuitState prop is no longer needed as we use the global context
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
    steps: [
      {
        id: 'basics_intro',
        title: 'Welcome to Quantum Basics',
        description: 'Start your journey into quantum computing',
        instruction: 'Click on the "Circuit" tab to start building your first basic circuit.',
        expectedAction: {
          type: 'switch_tab',
          tab: 'circuit'
        },
        hints: ['The Circuit tab is where all quantum magic starts'],
        successMessage: 'Welcome to the lab!'
      },
      {
        id: 'basics_x_gate',
        title: 'The NOT Gate',
        description: 'Flip a qubit from 0 to 1',
        instruction: 'Add an X (NOT) gate to qubit 0.',
        expectedAction: {
          type: 'add_gate',
          gate: { name: 'X', qubits: [0] }
        },
        hints: ['The X gate represents a 180-degree rotation around the X-axis'],
        successMessage: 'Qubit 1 is now |1⟩!'
      }
    ]
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
  onGoalComplete
}) => {
  const { startSession, session: interactiveSession, selectedGoal: activeSessionGoal } = useTutorial();
  const activeGoalTitle = activeSessionGoal?.title || '';

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

  const startInteractiveSession = (goal: LearningGoal) => {
    startSession(goal);
    setActiveTab('goals');
  };

  const completeGoal = (goalId: string) => {
    setUserProgress(prev => ({
      ...prev,
      completedGoals: [...prev.completedGoals, goalId],
      experience: prev.experience + 50,
      currentStreak: prev.currentStreak + 1
    }));

    onGoalComplete?.(goalId);
  };
  const [userProgress, setUserProgress] = useState<UserProgress>({
    level: 1,
    experience: 0,
    experienceToNext: 100,
    completedGoals: [],
    currentStreak: 0,
    totalStudyTime: 0,
    achievements: INITIAL_ACHIEVEMENTS
  });

  const [previewGoal, setPreviewGoal] = useState<LearningGoal | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [activeTab, setActiveTab] = useState<'goals' | 'progress' | 'achievements'>('goals');

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

  // Circuit monitoring is now handled in TutorialContext.tsx

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
            {interactiveSession ? `Guiding you through: ${activeGoalTitle}` : "Your personal guide to mastering quantum computing"}
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
          {/* Interactive Tutoring Session Info moved to Overlay */}

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
                      onClick={() => canStart && !isCompleted && setPreviewGoal(goal)}
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
                {previewGoal ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold mb-2">{previewGoal.title}</h3>
                      <p className="text-muted-foreground mb-4">{previewGoal.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Difficulty:</span>
                        <div className="font-medium capitalize">{previewGoal.difficulty}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Estimated Time:</span>
                        <div className="font-medium">{previewGoal.estimatedTime} minutes</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Topics Covered:</h4>
                      <div className="flex flex-wrap gap-2">
                        {previewGoal.topics.map((topic, index) => (
                          <Badge key={index} variant="outline">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {previewGoal.steps.length > 0 ? (
                        <Button
                          onClick={() => startInteractiveSession(previewGoal)}
                          className="w-full"
                          disabled={userProgress.completedGoals.includes(previewGoal.id)}
                        >
                          {userProgress.completedGoals.includes(previewGoal.id) ? (
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
                          onClick={() => completeGoal(previewGoal.id)}
                          className="w-full"
                          disabled={userProgress.completedGoals.includes(previewGoal.id)}
                        >
                          {userProgress.completedGoals.includes(previewGoal.id) ? (
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

                      {previewGoal.steps.length > 0 && !userProgress.completedGoals.includes(previewGoal.id) && (
                        <p className="text-xs text-muted-foreground text-center">
                          This goal includes {previewGoal.steps.length} interactive steps with real-time guidance
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