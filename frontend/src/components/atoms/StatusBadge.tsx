import React from 'react';

interface StatusBadgeProps {
  status: 'active' | 'eliminated' | 'revived' | 'waiting' | 'finished';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const statusConfig = {
    active: {
      label: '参加中',
      classes: 'bg-success-100 text-success-800',
    },
    eliminated: {
      label: '脱落',
      classes: 'bg-danger-100 text-danger-800',
    },
    revived: {
      label: '復活',
      classes: 'bg-warning-100 text-warning-800',
    },
    waiting: {
      label: '待機中',
      classes: 'bg-gray-100 text-gray-800',
    },
    finished: {
      label: '終了',
      classes: 'bg-blue-100 text-blue-800',
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.classes} ${className}`}>
      {config.label}
    </span>
  );
};