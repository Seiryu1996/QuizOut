import React from 'react';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
  className?: string;
}

export const Timer: React.FC<TimerProps> = ({ 
  timeRemaining, 
  totalTime, 
  className = '' 
}) => {
  const percentage = totalTime > 0 ? (timeRemaining / totalTime) * 100 : 0;
  const isLowTime = timeRemaining <= 5 && timeRemaining > 0;
  const isTimeUp = timeRemaining <= 0;

  const getTimerColor = () => {
    if (isTimeUp) return 'text-danger-600';
    if (isLowTime) return 'text-warning-600';
    return 'text-primary-600';
  };

  const getProgressColor = () => {
    if (percentage <= 20) return 'bg-danger-500';
    if (percentage <= 40) return 'bg-warning-500';
    return 'bg-success-500';
  };

  return (
    <div className={`text-center ${className}`}>
      {/* 時間表示 */}
      <div className={`text-4xl font-bold mb-2 ${getTimerColor()} ${isLowTime ? 'animate-pulse' : ''}`}>
        {timeRemaining}
      </div>
      
      {/* プログレスバー */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ${getProgressColor()}`}
          style={{ width: `${Math.max(0, percentage)}%` }}
        />
      </div>
      
      {/* 状態テキスト */}
      <div className="text-sm text-gray-600">
        {isTimeUp ? '時間切れ' : '残り時間'}
      </div>
    </div>
  );
};