import React from 'react';
import { Participant } from '@/types/quiz';
import { StatusBadge } from '@/components/atoms/StatusBadge';

interface ParticipantsListProps {
  participants: Participant[];
  currentUserId?: string;
  maxDisplay?: number;
  className?: string;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  currentUserId,
  maxDisplay = 10,
  className = '',
}) => {
  const sortedParticipants = [...participants].sort((a, b) => {
    // ステータス順（active > revived > eliminated）
    const statusOrder = { active: 0, revived: 1, eliminated: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    // スコア順（降順）
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    // 名前順
    return a.displayName.localeCompare(b.displayName);
  });

  const displayParticipants = sortedParticipants.slice(0, maxDisplay);
  const remainingCount = participants.length - maxDisplay;

  return (
    <div className={`card ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          参加者一覧
        </h3>
        <span className="text-sm text-gray-500">
          {participants.length}人参加中
        </span>
      </div>
      
      <div className="space-y-2">
        {displayParticipants.map((participant) => (
          <div
            key={participant.userId}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              participant.userId === currentUserId 
                ? 'border-primary-200 bg-primary-50' 
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                  participant.userId === currentUserId
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {participant.displayName.charAt(0).toUpperCase()}
                </div>
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium truncate ${
                    participant.userId === currentUserId 
                      ? 'text-primary-900' 
                      : 'text-gray-900'
                  }`}>
                    {participant.displayName}
                    {participant.userId === currentUserId && (
                      <span className="ml-1 text-xs text-primary-600">(あなた)</span>
                    )}
                  </span>
                  <StatusBadge status={participant.status} />
                </div>
                
                {participant.score > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {participant.score}pt ({participant.correctAnswers}問正解)
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {remainingCount > 0 && (
          <div className="text-center py-2 text-sm text-gray-500">
            他 {remainingCount}人
          </div>
        )}
        
        {participants.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            参加者がいません
          </div>
        )}
      </div>
    </div>
  );
};