import React from 'react';
import { Game } from '@/types/quiz';
import { StatusBadge } from '@/components/atoms/StatusBadge';

interface GameHeaderProps {
  game: Game;
  participantCount: number;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  className?: string;
  onGoHome?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  game,
  participantCount,
  connectionStatus,
  className = '',
  onGoHome,
}) => {
  const getConnectionStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: '🟢',
          text: '接続中',
          className: 'text-success-600',
        };
      case 'disconnected':
        return {
          icon: '🔴',
          text: '切断',
          className: 'text-danger-600',
        };
      case 'connecting':
        return {
          icon: '🟡',
          text: '接続中...',
          className: 'text-warning-600',
        };
    }
  };

  const connectionConfig = getConnectionStatusConfig();

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        {/* ゲーム情報 */}
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {game.title}
            </h1>
            <StatusBadge status={game.status} />
          </div>
          
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
            <span>ラウンド {game.currentRound}</span>
            <span>参加者 {participantCount}人</span>
            <span>制限時間 {game.settings.timeLimit}秒</span>
          </div>
        </div>

        {/* 接続状態とホームボタン */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm">
              {connectionConfig.icon}
            </span>
            <span className={`text-sm font-medium ${connectionConfig.className}`}>
              {connectionConfig.text}
            </span>
          </div>
          
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            >
              ホーム
            </button>
          )}
        </div>
      </div>

      {/* 敗者復活戦有効表示 */}
      {game.settings.revivalEnabled && (
        <div className="mt-3 p-2 bg-blue-50 rounded-md">
          <div className="text-sm text-blue-800">
            💫 敗者復活戦あり（最大{game.settings.revivalCount}人復活可能）
          </div>
        </div>
      )}
    </div>
  );
};