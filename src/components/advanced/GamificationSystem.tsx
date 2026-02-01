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
import {
  Trophy,
  Star,
  Target,
  Award,
  Zap,
  Flame,
  TrendingUp,
  Gift,
  Crown,
  Medal,
  Sparkles,
  Gamepad2,
  CheckCircle,
  Lock,
  Unlock
} from 'lucide-react';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'achievement' | 'milestone';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  reward: {
    experience: number;
    badges?: string[];
    title?: string;
  };
  requirements: {
    type: string;
    target: number;
    current: number;
  };
  timeLimit?: number; // minutes for time-limited challenges
  unlocked: boolean;
  completed: boolean;
  progress: number;
}

interface LeaderboardEntry {
  id: string;
  username: string;
  avatar?: string;
  score: number;
  level: number;
  badges: number;
  rank: number;
  change: number; // position change from last week
}

interface GamificationStats {
  totalExperience: number;
  currentLevel: number;
  experienceToNext: number;
  currentStreak: number;
  longestStreak: number;
  totalChallenges: number;
  completedChallenges: number;
  totalBadges: number;
  rareBadges: number;
  leaderboardRank: number;
  weeklyScore: number;
}

interface GamificationSystemProps {
  onChallengeComplete?: (challengeId: string) => void;
}

const SAMPLE_CHALLENGES: Challenge[] = [
  {
    id: 'first_circuit',
    title: 'First Quantum Circuit',
    description: 'Create and run your first quantum circuit',
    type: 'achievement',
    difficulty: 'easy',
    reward: { experience: 100, badges: ['circuit_creator'] },
    requirements: { type: 'circuits_created', target: 1, current: 0 },
    unlocked: true,
    completed: false,
    progress: 0
  },
  {
    id: 'vqe_expert',
    title: 'VQE Expert',
    description: 'Run VQE calculations on 5 different molecules',
    type: 'milestone',
    difficulty: 'hard',
    reward: { experience: 500, badges: ['chemistry_master'], title: 'Quantum Chemist' },
    requirements: { type: 'vqe_calculations', target: 5, current: 0 },
    unlocked: false,
    completed: false,
    progress: 0
  },
  {
    id: 'daily_circuits',
    title: 'Circuit Builder',
    description: 'Create 3 quantum circuits today',
    type: 'daily',
    difficulty: 'medium',
    reward: { experience: 50 },
    requirements: { type: 'circuits_today', target: 3, current: 0 },
    timeLimit: 1440, // 24 hours
    unlocked: true,
    completed: false,
    progress: 0
  },
  {
    id: 'speed_demon',
    title: 'Speed Demon',
    description: 'Complete a circuit simulation in under 30 seconds',
    type: 'achievement',
    difficulty: 'medium',
    reward: { experience: 75, badges: ['speed_runner'] },
    requirements: { type: 'fast_simulation', target: 1, current: 0 },
    unlocked: true,
    completed: false,
    progress: 0
  },
  {
    id: 'algorithm_master',
    title: 'Algorithm Master',
    description: 'Successfully run all major quantum algorithms',
    type: 'milestone',
    difficulty: 'expert',
    reward: { experience: 1000, badges: ['algorithm_master'], title: 'Quantum Algorithmist' },
    requirements: { type: 'algorithms_completed', target: 5, current: 0 },
    unlocked: false,
    completed: false,
    progress: 0
  }
];

const SAMPLE_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', username: 'QuantumMaster', score: 15420, level: 15, badges: 12, rank: 1, change: 0 },
  { id: '2', username: 'QubitWizard', score: 14850, level: 14, badges: 10, rank: 2, change: 1 },
  { id: '3', username: 'EntangleMe', score: 14200, level: 14, badges: 9, rank: 3, change: -1 },
  { id: '4', username: 'SuperPosition', score: 13890, level: 13, badges: 8, rank: 4, change: 2 },
  { id: '5', username: 'BlochSphere', score: 13500, level: 13, badges: 7, rank: 5, change: -1 }
];

export const GamificationSystem: React.FC<GamificationSystemProps> = ({ onChallengeComplete }) => {
  const [challenges, setChallenges] = useState<Challenge[]>(SAMPLE_CHALLENGES);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(SAMPLE_LEADERBOARD);
  const [stats, setStats] = useState<GamificationStats>({
    totalExperience: 1250,
    currentLevel: 3,
    experienceToNext: 750,
    currentStreak: 7,
    longestStreak: 12,
    totalChallenges: 24,
    completedChallenges: 8,
    totalBadges: 5,
    rareBadges: 2,
    leaderboardRank: 47,
    weeklyScore: 890
  });

  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showReward, setShowReward] = useState(false);
  const [lastReward, setLastReward] = useState<any>(null);

  const getUserId = () => localStorage.getItem('blochverse_user_id') || 'user_demo';

  useEffect(() => {
    const fetchGamificationData = async () => {
      try {
        const userId = getUserId();
        const [profileRes, leaderboardRes] = await Promise.all([
          fetch(`http://localhost:8000/gamification/profile/${userId}`),
          fetch('http://localhost:8000/gamification/leaderboard')
        ]);

        if (profileRes.ok) {
          const profile = await profileRes.json();
          setStats(prev => ({
            ...prev,
            totalExperience: profile.experience,
            currentLevel: profile.level,
            currentStreak: profile.currentStreak,
            // Map other fields as needed
          }));

          if (profile.completedChallenges) {
            setChallenges(prev => prev.map(c => ({
              ...c,
              completed: profile.completedChallenges.includes(c.id),
              progress: profile.completedChallenges.includes(c.id) ? 100 : c.progress
            })));
          }
        }

        if (leaderboardRes.ok) {
          const lbData = await leaderboardRes.json();
          // Map backend leaderboard to frontend interface if needed
          // Backend returns: { userId, experience, level, ... username, rank }
          // Frontend expects: { id, username, score, level, badges, rank, change }

          const mappedLb = lbData.map((p: any) => ({
            id: p.userId,
            username: p.username,
            score: p.experience,
            level: p.level,
            badges: p.achievements?.length || 0,
            rank: p.rank,
            change: 0 // Backend doesn't track change over time yet
          }));
          setLeaderboard(mappedLb);
        }
      } catch (e) {
        console.error("Failed to fetch gamification data", e);
      }
    };
    fetchGamificationData();
  }, []);

  const completeChallenge = async (challengeId: string) => {
    // 1. Optimistic UI update
    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge) return;

    setChallenges(prev => prev.map(c => {
      if (c.id === challengeId) {
        const updated = { ...c, completed: true, progress: 100 };
        setLastReward(updated.reward);
        setShowReward(true);

        setStats(prevStats => ({
          ...prevStats,
          totalExperience: prevStats.totalExperience + updated.reward.experience,
          completedChallenges: prevStats.completedChallenges + 1,
          totalBadges: prevStats.totalBadges + (updated.reward.badges?.length || 0)
        }));

        return updated;
      }
      return c;
    }));

    onChallengeComplete?.(challengeId);
    setTimeout(() => setShowReward(false), 3000);

    // 2. Backend update
    try {
      const userId = getUserId();
      await fetch(`http://localhost:8000/gamification/profile/${userId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experience: challenge.reward.experience,
          completedChallenge: challengeId
        })
      });
    } catch (e) {
      console.error("Failed to update progress on backend", e);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-orange-600 bg-orange-100';
      case 'expert': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'daily': return <Target className="w-4 h-4" />;
      case 'weekly': return <Trophy className="w-4 h-4" />;
      case 'achievement': return <Award className="w-4 h-4" />;
      case 'milestone': return <Crown className="w-4 h-4" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getRankChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
    return <div className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl flex items-center justify-center">
          <Gamepad2 className="w-5 h-5 text-yellow-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Quantum Quest</h2>
          <p className="text-muted-foreground">Level up your quantum computing skills through challenges and achievements</p>
        </div>
      </div>

      {/* Level Progress */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">Level {stats.currentLevel}</div>
                <div className="text-sm text-muted-foreground">Quantum Explorer</div>
              </div>
              <div className="flex-1 max-w-md">
                <div className="flex justify-between text-sm mb-2">
                  <span>Experience Progress</span>
                  <span>{stats.totalExperience} / {stats.totalExperience + stats.experienceToNext} XP</span>
                </div>
                <Progress
                  value={(stats.totalExperience / (stats.totalExperience + stats.experienceToNext)) * 100}
                  className="h-3"
                />
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-orange-500 flex items-center gap-1">
                  <Flame className="w-5 h-5" />
                  {stats.currentStreak}
                </div>
                <div className="text-muted-foreground">Day Streak</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-500">#{stats.leaderboardRank}</div>
                <div className="text-muted-foreground">Global Rank</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-500">{stats.totalBadges}</div>
                <div className="text-muted-foreground">Badges</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reward Notification */}
      <AnimatePresence>
        {showReward && lastReward && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50"
          >
            <Card className="border-yellow-500 bg-yellow-50 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-yellow-800">Challenge Completed!</div>
                    <div className="text-sm text-yellow-700">
                      +{lastReward.experience} XP
                      {lastReward.badges && ` • ${lastReward.badges.length} new badge${lastReward.badges.length > 1 ? 's' : ''}`}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs defaultValue="challenges" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="challenges" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Challenges
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Leaderboard
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Achievements
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Active Challenges
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {challenges.filter(c => c.unlocked && !c.completed).map((challenge) => (
                  <div
                    key={challenge.id}
                    className="p-4 border rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedChallenge(challenge)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(challenge.type)}
                        <h4 className="font-semibold">{challenge.title}</h4>
                      </div>
                      <Badge className={getDifficultyColor(challenge.difficulty)}>
                        {challenge.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{challenge.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{challenge.requirements.current} / {challenge.requirements.target}</span>
                      </div>
                      <Progress
                        value={(challenge.requirements.current / challenge.requirements.target) * 100}
                        className="h-2"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>Reward: {challenge.reward.experience} XP</span>
                      {challenge.timeLimit && (
                        <span>Time left: {Math.floor(challenge.timeLimit / 60)}h</span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Challenge Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedChallenge ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      {getTypeIcon(selectedChallenge.type)}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold mb-2">{selectedChallenge.title}</h3>
                        <p className="text-muted-foreground mb-4">{selectedChallenge.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <div className="font-medium capitalize">{selectedChallenge.type}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Difficulty:</span>
                        <div className="font-medium capitalize">{selectedChallenge.difficulty}</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Requirements:</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">{selectedChallenge.requirements.type.replace('_', ' ')}</span>
                          <span className="text-sm font-medium">
                            {selectedChallenge.requirements.current} / {selectedChallenge.requirements.target}
                          </span>
                        </div>
                        <Progress
                          value={(selectedChallenge.requirements.current / selectedChallenge.requirements.target) * 100}
                          className="h-2"
                        />
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Rewards:</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{selectedChallenge.reward.experience} XP</Badge>
                        {selectedChallenge.reward.badges?.map((badge, index) => (
                          <Badge key={index} variant="secondary">{badge}</Badge>
                        ))}
                        {selectedChallenge.reward.title && (
                          <Badge className="bg-yellow-500 text-yellow-900">{selectedChallenge.reward.title}</Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={() => completeChallenge(selectedChallenge.id)}
                      className="w-full"
                      disabled={selectedChallenge.completed}
                    >
                      {selectedChallenge.completed ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Completed
                        </>
                      ) : (
                        <>
                          <Trophy className="w-4 h-4 mr-2" />
                          Complete Challenge
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Select a Challenge</h3>
                    <p>Choose a challenge to view details and track progress.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Global Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center justify-between p-4 rounded-lg border ${index < 3 ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                            index === 2 ? 'bg-orange-600 text-white' :
                              'bg-muted text-muted-foreground'
                        }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold">{entry.username}</div>
                        <div className="text-sm text-muted-foreground">
                          Level {entry.level} • {entry.badges} badges
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold">{entry.score.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">points</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {getRankChangeIcon(entry.change)}
                        <span className={`text-sm ${entry.change > 0 ? 'text-green-600' :
                            entry.change < 0 ? 'text-red-600' : 'text-muted-foreground'
                          }`}>
                          {entry.change !== 0 && Math.abs(entry.change)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Your Rank</div>
                    <div className="text-sm text-muted-foreground">Keep climbing the leaderboard!</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">#{stats.leaderboardRank}</div>
                    <div className="text-sm text-muted-foreground">{stats.weeklyScore} weekly points</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.filter(c => c.completed).map((achievement) => (
              <Card key={achievement.id} className="border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                      {getTypeIcon(achievement.type)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{achievement.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={getDifficultyColor(achievement.difficulty)}>
                          {achievement.difficulty}
                        </Badge>
                        <Badge variant="outline">
                          {achievement.reward.experience} XP
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {challenges.filter(c => c.completed).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Achievements Yet</h3>
              <p>Complete challenges to unlock achievements and earn rewards!</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">{stats.totalExperience}</div>
                  <div className="text-sm text-muted-foreground">Total XP</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">{stats.completedChallenges}</div>
                  <div className="text-sm text-muted-foreground">Challenges Completed</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{stats.totalBadges}</div>
                  <div className="text-sm text-muted-foreground">Badges Earned</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">{stats.longestStreak}</div>
                  <div className="text-sm text-muted-foreground">Longest Streak</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Weekly Score</span>
                  <span className="text-sm text-muted-foreground">{stats.weeklyScore} points</span>
                </div>
                <Progress value={(stats.weeklyScore / 1000) * 100} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  {1000 - stats.weeklyScore} points to next milestone
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};