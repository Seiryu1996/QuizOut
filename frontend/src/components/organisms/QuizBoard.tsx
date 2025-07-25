import React from 'react';
import { Question } from '@/types/quiz';
import { QuestionCard } from '@/components/molecules/QuestionCard';
import { Timer } from '@/components/molecules/Timer';
import { Loading } from '@/components/atoms/Loading';

interface QuizBoardProps {
  question: Question | null;
  timeRemaining: number;
  totalTime: number;
  onAnswer: (selectedOption: number, responseTime: number) => void;
  hasAnswered: boolean;
  showResults: boolean;
  userAnswer?: number;
  isLoading?: boolean;
  className?: string;
}

export const QuizBoard: React.FC<QuizBoardProps> = ({
  question,
  timeRemaining,
  totalTime,
  onAnswer,
  hasAnswered,
  showResults,
  userAnswer,
  isLoading = false,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-96 ${className}`}>
        <Loading size="lg" text="問題を読み込み中..." />
      </div>
    );
  }

  if (!question) {
    return (
      <div className={`flex items-center justify-center min-h-96 ${className}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            問題の準備中
          </h2>
          <p className="text-gray-600">
            次の問題をお待ちください
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* タイマー */}
      <Timer 
        timeRemaining={timeRemaining}
        totalTime={totalTime}
        className="mx-auto max-w-xs"
      />
      
      {/* 問題カード */}
      <QuestionCard
        question={question}
        onAnswer={onAnswer}
        hasAnswered={hasAnswered}
        showResults={showResults}
        userAnswer={userAnswer}
        disabled={timeRemaining <= 0}
      />
      
      {/* 状態メッセージ */}
      {timeRemaining <= 0 && !hasAnswered && !showResults && (
        <div className="text-center p-4 bg-warning-50 rounded-lg">
          <div className="text-warning-800 font-semibold">
            ⏰ 時間切れです
          </div>
          <div className="text-warning-700 text-sm mt-1">
            結果発表をお待ちください
          </div>
        </div>
      )}
    </div>
  );
};