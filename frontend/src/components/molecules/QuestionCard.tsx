import React, { useState, useEffect } from 'react';
import { Question } from '@/types/quiz';
import { Button } from '@/components/atoms/Button';

interface QuestionCardProps {
  question: Question;
  onAnswer?: (selectedOption: number, responseTime: number) => void;
  hasAnswered?: boolean;
  showResults?: boolean;
  userAnswer?: number;
  disabled?: boolean;
  className?: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onAnswer,
  hasAnswered = false,
  showResults = false,
  userAnswer,
  disabled = false,
  className = '',
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [startTime] = useState<number>(Date.now());

  useEffect(() => {
    setSelectedOption(null);
  }, [question.id]);

  const handleOptionSelect = (optionIndex: number) => {
    if (disabled || hasAnswered || showResults) return;
    setSelectedOption(optionIndex);
  };

  const handleSubmit = () => {
    if (selectedOption === null || disabled || hasAnswered) return;
    
    const responseTime = Date.now() - startTime;
    onAnswer?.(selectedOption, responseTime);
  };

  const getOptionClassName = (optionIndex: number) => {
    const baseClasses = 'quiz-option';
    
    if (showResults) {
      // 結果表示時
      if (optionIndex === question.correctAnswer) {
        return `${baseClasses} correct`;
      }
      if (optionIndex === userAnswer && optionIndex !== question.correctAnswer) {
        return `${baseClasses} incorrect`;
      }
      return `${baseClasses} opacity-60`;
    }
    
    if (selectedOption === optionIndex) {
      return `${baseClasses} selected`;
    }
    
    if (disabled || hasAnswered) {
      return `${baseClasses} opacity-60 cursor-not-allowed`;
    }
    
    return baseClasses;
  };

  const difficultyColors = {
    easy: 'bg-success-100 text-success-800',
    medium: 'bg-warning-100 text-warning-800',
    hard: 'bg-danger-100 text-danger-800',
  };

  return (
    <div className={`card ${className}`}>
      {/* 問題ヘッダー */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">
            ラウンド {question.round}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[question.difficulty]}`}>
            {question.difficulty === 'easy' ? '初級' : 
             question.difficulty === 'medium' ? '中級' : '上級'}
          </span>
        </div>
        <span className="text-sm text-gray-500">
          {question.category}
        </span>
      </div>
      
      {/* 問題文 */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
          {question.text}
        </h2>
      </div>
      
      {/* 選択肢 */}
      <div className="space-y-3 mb-6">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleOptionSelect(index)}
            className={getOptionClassName(index)}
            disabled={disabled || hasAnswered || showResults}
          >
            <div className="flex items-center">
              <span className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-left">{option}</span>
              {showResults && index === question.correctAnswer && (
                <span className="ml-auto text-success-600">✓</span>
              )}
            </div>
          </button>
        ))}
      </div>
      
      {/* 回答ボタン */}
      {!hasAnswered && !showResults && onAnswer && (
        <Button
          onClick={handleSubmit}
          disabled={selectedOption === null || disabled}
          variant="primary"
          size="lg"
          className="w-full"
        >
          回答する
        </Button>
      )}
      
      {/* 回答済み表示 */}
      {hasAnswered && !showResults && (
        <div className="text-center py-4">
          <div className="text-success-600 font-semibold">
            回答を送信しました
          </div>
          <div className="text-gray-500 text-sm mt-1">
            結果をお待ちください...
          </div>
        </div>
      )}
    </div>
  );
};