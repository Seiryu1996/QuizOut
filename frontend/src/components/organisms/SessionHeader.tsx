import React from 'react';
import { Session } from '@/types/quiz';
import { StatusBadge } from '@/components/atoms/StatusBadge';

interface SessionHeaderProps {
  session: Session;
  participantCount: number;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  className?: string;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  session,
  participantCount,
  connectionStatus,
  className = '',
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
        {/* セッション情報 */}
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {session.title}
            </h1>
            <StatusBadge status={session.status} />
          </div>
          
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
            <span>ラウンド {session.currentRound}</span>
            <span>参加者 {participantCount}人</span>
            <span>制限時間 {session.settings.timeLimit}秒</span>
          </div>
        </div>

        {/* 接続状態 */}
        <div className="flex items-center space-x-2">
          <span className="text-sm">
            {connectionConfig.icon}
          </span>
          <span className={`text-sm font-medium ${connectionConfig.className}`}>
            {connectionConfig.text}
          </span>
        </div>
      </div>

      {/* 敗者復活戦有効表示 */}
      {session.settings.revivalEnabled && (
        <div className="mt-3 p-2 bg-blue-50 rounded-md">
          <div className="text-sm text-blue-800">
            💫 敗者復活戦あり（最大{session.settings.revivalCount}人復活可能）
          </div>
        </div>
      )}
    </div>
  );
};