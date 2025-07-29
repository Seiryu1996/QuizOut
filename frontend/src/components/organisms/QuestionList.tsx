import React from 'react';
import { Question } from '@/types/quiz';

interface QuestionListProps {
  questions: Question[];
  currentRound?: number;
  className?: string;
  showAnswers?: boolean;
  onQuestionClick?: (question: Question) => void;
}

export const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  currentRound,
  className = '',
  showAnswers = false,
  onQuestionClick,
}) => {
  if (!questions || questions.length === 0) {
    return (
      <div className={`text-center p-6 text-gray-500 ${className}`}>
        <div className="text-4xl mb-2">📋</div>
        <p>まだ問題が作成されていません</p>
      </div>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return '易';
      case 'medium':
        return '中';
      case 'hard':
        return '難';
      default:
        return '？';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          出題された問題 ({questions.length}問)
        </h3>
        {currentRound && (
          <span className="text-sm text-gray-600">
            現在: ラウンド {currentRound}
          </span>
        )}
      </div>
      
      {questions.map((question, index) => (
        <div
          key={question.id}
          className={`bg-white rounded-lg border p-4 transition-all ${
            onQuestionClick 
              ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' 
              : ''
          } ${
            currentRound && question.round === currentRound
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200'
          }`}
          onClick={() => onQuestionClick?.(question)}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">
                問{index + 1} (R{question.round})
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                {getDifficultyLabel(question.difficulty)}
              </span>
              {question.category && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {question.category}
                </span>
              )}
              {currentRound && question.round === currentRound && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  現在の問題
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(question.createdAt).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          <div className="mb-3">
            <p className="text-gray-900 font-medium leading-relaxed">
              {question.text}
            </p>
          </div>

          <div className="space-y-2">
            {question.options.map((option, optionIndex) => (
              <div
                key={optionIndex}
                className={`flex items-center p-2 rounded-md text-sm ${
                  showAnswers && question.correctAnswer === optionIndex
                    ? 'bg-green-100 border border-green-300 text-green-800'
                    : 'bg-gray-50 text-gray-700'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-xs font-medium mr-3">
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <span className="flex-1">{option}</span>
                {showAnswers && question.correctAnswer === optionIndex && (
                  <span className="text-green-600 font-medium ml-2">✓ 正解</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};