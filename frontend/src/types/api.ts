export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
}

// Request/Response types
export interface JoinGameRequest {
  displayName: string;
}

// Legacy alias for backward compatibility
export interface JoinSessionRequest extends JoinGameRequest {}

export interface SubmitAnswerRequest {
  questionId: string;
  selectedOption: number;
  responseTime: number;
}

export interface CreateGameRequest {
  title: string;
  maxParticipants?: number;
  timeLimit?: number;
  revivalEnabled?: boolean;
  revivalCount?: number;
}

// Legacy alias for backward compatibility
export interface CreateSessionRequest extends CreateGameRequest {}

export interface ControlGameRequest {
  action: 'start' | 'finish';
}

// Legacy alias for backward compatibility
export interface ControlSessionRequest extends ControlGameRequest {}

export interface StartRevivalRequest {
  count: number;
}