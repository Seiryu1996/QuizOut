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
export interface JoinSessionRequest {
  displayName: string;
}

export interface SubmitAnswerRequest {
  questionId: string;
  selectedOption: number;
  responseTime: number;
}

export interface CreateSessionRequest {
  title: string;
  maxParticipants?: number;
  timeLimit?: number;
  revivalEnabled?: boolean;
  revivalCount?: number;
}

export interface ControlSessionRequest {
  action: 'start' | 'finish';
}

export interface StartRevivalRequest {
  count: number;
}