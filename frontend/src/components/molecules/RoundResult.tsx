import React from 'react';
import { Participant } from '@/types/quiz';

interface RoundResultProps {
  survivors: Participant[];
  eliminated: Participant[];
  currentUserId?: string;
  round: number;
  onContinue?: () => void;
  className?: string;
}

export const RoundResult: React.FC<RoundResultProps> = ({
  survivors,
  eliminated,
  currentUserId,
  round,
  onContinue,
  className = '',
}) => {
  const isUserSurvivor = survivors.some(p => p.userId === currentUserId);
  const isUserEliminated = eliminated.some(p => p.userId === currentUserId);

  return (
    <div className={`card text-center ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          ラウンド {round} 結果発表
        </h2>
        
        {isUserSurvivor && (
          <div className="text-success-600 font-semibold text-lg">
            🎉 おめでとうございます！次のラウンドに進出です！
          </div>
        )}
        
        {isUserEliminated && (
          <div className="text-danger-600 font-semibold text-lg">
            😞 残念！今回は脱落となりました
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* 勝ち残り */}
        <div className="bg-success-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-success-800 mb-3 flex items-center justify-center">
            <span className="mr-2">🏆</span>
            勝ち残り ({survivors.length}人)
          </h3>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {survivors.map((participant) => (
              <div
                key={participant.userId}
                className={`flex justify-between items-center p-2 rounded ${
                  participant.userId === currentUserId 
                    ? 'bg-success-200 font-semibold' 
                    : 'bg-white'
                }`}
              >
                <span className="text-sm">
                  {participant.displayName}
                  {participant.userId === currentUserId && ' (あなた)'}
                </span>
                <span className="text-xs text-success-700">
                  {participant.score}pt
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 脱落者 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center justify-center">
            <span className="mr-2">😔</span>
            脱落 ({eliminated.length}人)
          </h3>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {eliminated.map((participant) => (
              <div
                key={participant.userId}
                className={`flex justify-between items-center p-2 rounded ${
                  participant.userId === currentUserId 
                    ? 'bg-gray-200 font-semibold' 
                    : 'bg-white'
                }`}
              >
                <span className="text-sm">
                  {participant.displayName}
                  {participant.userId === currentUserId && ' (あなた)'}
                </span>
                <span className="text-xs text-gray-600">
                  {participant.score}pt
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="bg-primary-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary-600">
              {survivors.length}
            </div>
            <div className="text-sm text-primary-800">勝ち残り</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {eliminated.length}
            </div>
            <div className="text-sm text-gray-800">脱落</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round((survivors.length / (survivors.length + eliminated.length)) * 100)}%
            </div>
            <div className="text-sm text-blue-800">生存率</div>
          </div>
        </div>
      </div>

      {/* メッセージ */}
      <div className="text-gray-600 mb-4">
        {survivors.length <= 1 ? (
          <p>ゲーム終了！最終結果をお待ちください</p>
        ) : isUserEliminated ? (
          <p>敗者復活戦の機会があるかもしれません！</p>
        ) : (
          <p>次のラウンドに向けて準備してください</p>
        )}
      </div>

      {onContinue && (
        <button
          onClick={onContinue}
          className="btn-primary px-8 py-3"
        >
          続行
        </button>
      )}
    </div>
  );
};