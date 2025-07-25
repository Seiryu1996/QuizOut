export interface WebSocketMessage {
  type: string;
  sessionId?: string;
  data?: any;
  timestamp: number;
}

export type MessageType =
  | 'question_start'
  | 'question_end'
  | 'answer_submitted'
  | 'round_result'
  | 'participant_join'
  | 'participant_leave'
  | 'session_update'
  | 'revival_start'
  | 'revival_result'
  | 'error'
  | 'ping'
  | 'pong';

export interface QuestionStartMessage {
  question: {
    id: string;
    text: string;
    options: string[];
    round: number;
    category: string;
  };
  timeLimit: number;
}

export interface QuestionEndMessage {
  questionId: string;
  correctAnswer: number;
}

export interface RoundResultMessage {
  round: number;
  survivors: Array<{
    userId: string;
    displayName: string;
    score: number;
  }>;
  eliminated: Array<{
    userId: string;
    displayName: string;
    score: number;
  }>;
}

export interface ParticipantJoinMessage {
  userId: string;
  displayName: string;
}

export interface SessionUpdateMessage {
  status: string;
  currentRound: number;
  participantCount: number;
}

export interface RevivalStartMessage {
  candidates: Array<{
    userId: string;
    displayName: string;
  }>;
}

export interface RevivalResultMessage {
  revived: Array<{
    userId: string;
    displayName: string;
  }>;
}