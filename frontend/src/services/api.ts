import { 
  APIResponse, 
  JoinSessionRequest, 
  SubmitAnswerRequest, 
  CreateSessionRequest,
  ControlSessionRequest,
  StartRevivalRequest 
} from '@/types/api';
import { Game, Question, Answer, Participant } from '@/types/quiz';

class APIClient {
  private baseURL: string;
  private getAuthToken: () => string | null;

  constructor(baseURL: string, getAuthToken: () => string | null) {
    this.baseURL = baseURL;
    this.getAuthToken = getAuthToken;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAuthToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Admin endpoints use session-based auth, so don't send Bearer token
    const isAdminEndpoint = endpoint.startsWith('/api/v1/admin/');
    if (token && !isAdminEndpoint) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        // Include credentials for admin endpoints to send session cookies
        credentials: isAdminEndpoint ? 'include' : 'same-origin',
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'HTTP_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred',
        },
      };
    }
  }

  // Game API
  async listAvailableGames(): Promise<APIResponse<Game[]>> {
    return this.request<Game[]>('/api/v1/sessions');
  }

  // Game methods (preferred)
  async getGameInfo(gameId: string): Promise<APIResponse<Game>> {
    return this.request<Game>(`/api/v1/sessions/${gameId}`);
  }

  // Legacy session methods (for backward compatibility)
  async getSessionInfo(sessionId: string): Promise<APIResponse<Game>> {
    return this.request<Game>(`/api/v1/sessions/${sessionId}/info`);
  }

  async getSessionStatus(sessionId: string): Promise<APIResponse<{
    sessionId: string;
    status: string;
    currentRound: number;
    activeCount: number;
    maxParticipants: number;
    timeLimit: number;
    revivalEnabled: boolean;
  }>> {
    return this.request(`/api/v1/sessions/${sessionId}/status`);
  }

  async joinSession(sessionId: string, request: JoinSessionRequest): Promise<APIResponse<{
    participantId: string;
    userId: string;
    sessionId: string;
    displayName: string;
    status: string;
    joinedAt: string;
  }>> {
    return this.request(`/api/v1/sessions/${sessionId}/join`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getParticipants(sessionId: string): Promise<APIResponse<Participant[]>> {
    return this.request<Participant[]>(`/api/v1/sessions/${sessionId}/participants`);
  }

  // Admin version of getParticipants
  async getAdminParticipants(sessionId: string): Promise<APIResponse<Participant[]>> {
    return this.request<Participant[]>(`/api/v1/admin/sessions/${sessionId}/participants`);
  }

  // Quiz API
  async getCurrentQuestion(sessionId: string): Promise<APIResponse<Question>> {
    return this.request<Question>(`/api/v1/sessions/${sessionId}/current-question`);
  }

  // Admin version of getCurrentQuestion
  async getAdminCurrentQuestion(sessionId: string): Promise<APIResponse<Question>> {
    return this.request<Question>(`/api/v1/admin/sessions/${sessionId}/current-question`);
  }

  async getAllQuestions(sessionId: string): Promise<APIResponse<Question[]>> {
    return this.request<Question[]>(`/api/v1/sessions/${sessionId}/questions`);
  }

  // Admin version of getAllQuestions
  async getAdminAllQuestions(sessionId: string): Promise<APIResponse<Question[]>> {
    return this.request<Question[]>(`/api/v1/admin/sessions/${sessionId}/questions`);
  }

  async submitAnswer(sessionId: string, request: SubmitAnswerRequest): Promise<APIResponse<Answer>> {
    return this.request<Answer>(`/api/v1/sessions/${sessionId}/answers`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Admin API
  async createSession(request: CreateSessionRequest): Promise<APIResponse<Game>> {
    return this.request<Game>('/api/v1/admin/sessions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async controlSession(sessionId: string, request: ControlSessionRequest): Promise<APIResponse<{
    message: string;
  }>> {
    return this.request(`/api/v1/admin/sessions/${sessionId}/control`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  async getSessionStats(sessionId: string): Promise<APIResponse<any>> {
    return this.request(`/api/v1/admin/sessions/${sessionId}/stats`);
  }

  async generateQuestion(sessionId: string, options?: {
    round?: number;
    difficulty?: string;
    category?: string;
  }): Promise<APIResponse<Question>> {
    const params = new URLSearchParams();
    if (options?.round) params.append('round', options.round.toString());
    if (options?.difficulty) params.append('difficulty', options.difficulty);
    if (options?.category) params.append('category', options.category);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    
    return this.request<Question>(`/api/v1/admin/sessions/${sessionId}/generate-question${query}`, {
      method: 'POST',
    });
  }

  async processRoundResults(sessionId: string, questionId: string): Promise<APIResponse<{
    survivors: Array<{ userId: string; displayName: string; score: number }>;
    eliminated: Array<{ userId: string; displayName: string; score: number }>;
  }>> {
    return this.request(`/api/v1/admin/sessions/${sessionId}/process-results?questionId=${questionId}`, {
      method: 'POST',
    });
  }

  async nextRound(sessionId: string): Promise<APIResponse<{ message: string }>> {
    return this.request(`/api/v1/admin/sessions/${sessionId}/next-round`, {
      method: 'POST',
    });
  }

  async startRevival(sessionId: string, request: StartRevivalRequest): Promise<APIResponse<{
    revived: Array<{ userId: string; displayName: string; revivedAt: string }>;
    count: number;
  }>> {
    return this.request(`/api/v1/admin/sessions/${sessionId}/revival`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getResults(sessionId: string): Promise<APIResponse<{
    session: any;
    participants: Participant[];
  }>> {
    return this.request(`/api/v1/admin/sessions/${sessionId}/results`);
  }

  async exportResults(sessionId: string): Promise<Blob | null> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/admin/sessions/${sessionId}/export`, {
        credentials: 'include', // Use session-based auth for admin endpoint
      });

      if (response.ok) {
        return await response.blob();
      }
      return null;
    } catch (error) {
      console.error('Export error:', error);
      return null;
    }
  }

  async skipQuestion(sessionId: string): Promise<APIResponse<{ message: string }>> {
    return this.request(`/api/v1/admin/sessions/${sessionId}/skip-question`, {
      method: 'POST',
    });
  }

  async deleteSession(sessionId: string): Promise<APIResponse<{ message: string }>> {
    return this.request(`/api/v1/admin/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }
}

// API client instance
export const createAPIClient = (getAuthToken: () => string | null) => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  return new APIClient(baseURL, getAuthToken);
};