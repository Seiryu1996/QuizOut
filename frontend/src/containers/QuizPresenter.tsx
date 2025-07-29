import React from 'react';
import { Game, Question, Participant } from '@/types/quiz';
import { GameHeader } from '@/components/organisms/GameHeader';
import { QuizBoard } from '@/components/organisms/QuizBoard';
import { QuestionList } from '@/components/organisms/QuestionList';
import { ParticipantsList } from '@/components/molecules/ParticipantsList';
import { RoundResult } from '@/components/molecules/RoundResult';
import { Loading } from '@/components/atoms/Loading';

interface QuizPresenterProps {
  game: Game;
  participants: Participant[];
  questions: Question[];
  currentQuestion: Question | null;
  timeRemaining: number;
  hasAnswered: boolean;
  roundResults: {
    survivors: Participant[];
    eliminated: Participant[];
    round: number;
  } | null;
  revivalInProgress: boolean;
  revivalCandidates: Participant[];
  revivedParticipants: Participant[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  currentUserId?: string;
  onAnswer: (selectedOption: number, responseTime: number) => void;
  onClearResults: () => void;
  onGoHome: () => void;
}

export const QuizPresenter: React.FC<QuizPresenterProps> = ({
  game,
  participants,
  questions,
  currentQuestion,
  timeRemaining,
  hasAnswered,
  roundResults,
  revivalInProgress,
  revivalCandidates,
  revivedParticipants,
  isConnected,
  isLoading,
  error,
  currentUserId,
  onAnswer,
  onClearResults,
  onGoHome,
}) => {
  const connectionStatus = isConnected ? 'connected' : 'disconnected';
  const activeParticipants = participants.filter(p => p.status === 'active' || p.status === 'revived');

  // エラー表示
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            エラーが発生しました
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={onGoHome} className="btn-primary">
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  // 敗者復活戦中
  if (revivalInProgress) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <GameHeader
            game={game}
            participantCount={participants.length}
            connectionStatus={connectionStatus}
            onGoHome={onGoHome}
            className="mb-6"
          />
          
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce-slow">🎲</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              敗者復活戦開催中！
            </h2>
            <p className="text-gray-600 mb-6">
              {revivalCandidates.length}人の中からランダムに選出中...
            </p>
            
            <div className="card max-w-md mx-auto">
              <h3 className="text-lg font-semibold mb-4">復活候補者</h3>
              <div className="space-y-2">
                {revivalCandidates.map((candidate) => (
                  <div
                    key={candidate.userId}
                    className="p-3 bg-gray-50 rounded-lg flex items-center justify-center"
                  >
                    <span className="font-medium">{candidate.displayName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 復活結果表示
  if (revivedParticipants.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <GameHeader
            game={game}
            participantCount={participants.length}
            connectionStatus={connectionStatus}
            onGoHome={onGoHome}
            className="mb-6"
          />
          
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              復活者決定！
            </h2>
            
            <div className="card max-w-md mx-auto">
              <h3 className="text-lg font-semibold mb-4 text-success-600">
                復活した参加者
              </h3>
              <div className="space-y-2">
                {revivedParticipants.map((participant) => (
                  <div
                    key={participant.userId}
                    className={`p-3 rounded-lg flex items-center justify-center ${
                      participant.userId === currentUserId
                        ? 'bg-success-100 font-bold'
                        : 'bg-success-50'
                    }`}
                  >
                    <span>{participant.displayName}</span>
                    {participant.userId === currentUserId && (
                      <span className="ml-2">（あなた）</span>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                onClick={onClearResults}
                className="btn-primary mt-4"
              >
                続行
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ラウンド結果表示
  if (roundResults) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <GameHeader
            game={game}
            participantCount={participants.length}
            connectionStatus={connectionStatus}
            onGoHome={onGoHome}
            className="mb-6"
          />
          
          <RoundResult
            survivors={roundResults.survivors}
            eliminated={roundResults.eliminated}
            currentUserId={currentUserId}
            round={roundResults.round}
            onContinue={onClearResults}
          />
        </div>
      </div>
    );
  }

  // ゲーム終了
  if (game.status === 'finished') {
    const winner = activeParticipants.length === 1 ? activeParticipants[0] : null;
    const isUserWinner = winner?.userId === currentUserId;

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <GameHeader
            game={game}
            participantCount={participants.length}
            connectionStatus={connectionStatus}
            onGoHome={onGoHome}
            className="mb-6"
          />
          
          <div className="text-center">
            <div className="text-6xl mb-4">
              {isUserWinner ? '🏆' : '🎊'}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              ゲーム終了
            </h2>
            
            {winner && (
              <div className="card max-w-md mx-auto mb-6">
                <h3 className="text-xl font-semibold mb-4">
                  {isUserWinner ? '🎉 おめでとうございます！' : '優勝者'}
                </h3>
                <div className="text-2xl font-bold text-primary-600 mb-2">
                  {winner.displayName}
                </div>
                <div className="text-gray-600">
                  最終スコア: {winner.score}pt
                </div>
              </div>
            )}
            
            <button onClick={onGoHome} className="btn-primary">
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // メインのクイズ画面
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <GameHeader
          game={game}
          participantCount={participants.length}
          connectionStatus={connectionStatus}
          className="mb-6"
        />

        <div className="grid lg:grid-cols-4 gap-6">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2">
            {game.status === 'waiting' ? (
              <div className="card text-center">
                <div className="text-6xl mb-4">⏳</div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  ゲーム開始をお待ちください
                </h2>
                <p className="text-gray-600">
                  管理者がゲームを開始するまでお待ちください
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <QuizBoard
                  question={currentQuestion}
                  timeRemaining={timeRemaining}
                  totalTime={game.settings.timeLimit}
                  onAnswer={onAnswer}
                  hasAnswered={hasAnswered}
                  showResults={false}
                  isLoading={isLoading}
                />
                
                {/* 問題一覧 */}
                {questions.length > 0 && (
                  <div className="card">
                    <QuestionList
                      questions={questions}
                      currentRound={game.currentRound}
                      showAnswers={false}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* サイドバー */}
          <div className="lg:col-span-2">
            <ParticipantsList
              participants={participants}
              currentUserId={currentUserId}
              maxDisplay={8}
            />
          </div>
        </div>
      </div>
    </div>
  );
};