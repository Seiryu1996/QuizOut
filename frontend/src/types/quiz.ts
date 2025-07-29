export interface Game {
  id: string;
  title: string;
  status: 'waiting' | 'active' | 'finished';
  currentRound: number;
  maxParticipants: number;
  createdAt: string;
  updatedAt: string;
  settings: GameSettings;
  participantCount?: number;
  activeCount?: number;
}

// Legacy alias for backward compatibility
export interface Session extends Game {}

export interface GameSettings {
  timeLimit: number;
  revivalEnabled: boolean;
  revivalCount: number;
}

// Legacy alias for backward compatibility
export interface SessionSettings extends GameSettings {}

export interface Question {
  id: string;
  text: string;
  options: string[];
  round: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: string;
  correctAnswer?: number; // 管理者のみ
}

export interface Answer {
  id: string;
  questionId: string;
  selectedOption: number;
  isCorrect: boolean;
  responseTime: number;
  answeredAt: string;
}

export interface Participant {
  id: string;
  userId: string;
  displayName: string;
  status: 'active' | 'eliminated' | 'revived';
  score: number;
  correctAnswers: number;
  joinedAt: string;
  eliminatedAt?: string;
  revivedAt?: string;
}

export interface User {
  id: string;
  displayName: string;
  email?: string;
  isAnonymous: boolean;
  createdAt: string;
  lastLoginAt: string;
}