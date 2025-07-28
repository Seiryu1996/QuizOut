import React from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  text,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} role="status" aria-live="polite">
      <div className={`animate-spin rounded-full border-b-2 border-primary-500 ${sizeClasses[size]}`} aria-hidden="true" />
      {text && (
        <p className="mt-3 text-sm text-gray-600">{text}</p>
      )}
      {!text && <span className="sr-only">読み込み中...</span>}
    </div>
  );
};