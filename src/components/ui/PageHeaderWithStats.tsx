import React from 'react';

interface StatItem {
  label: string;
  value: number | string;
  color: 'blue' | 'purple' | 'indigo' | 'teal' | 'cyan' | 'green' | 'red' | 'yellow' | 'pink' | 'emerald' | 'lime' | 'orange' | 'violet' | 'rose';
}

interface PageHeaderWithStatsProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  gradientFrom: string;
  gradientTo: string;
  actionLabel?: string;
  onAction?: () => void;
  stats: StatItem[];
  extraActions?: React.ReactNode; // Новый пропс для дополнительных действий
}

const getColorClasses = (color: string) => {
  const colorMap = {
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    teal: 'text-teal-600 dark:text-teal-400',
    cyan: 'text-cyan-600 dark:text-cyan-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    pink: 'text-pink-600 dark:text-pink-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    lime: 'text-lime-600 dark:text-lime-400',
    orange: 'text-orange-600 dark:text-orange-400',
    violet: 'text-violet-600 dark:text-violet-400',
    rose: 'text-rose-600 dark:text-rose-400',
  };
  return colorMap[color as keyof typeof colorMap] || 'text-gray-600 dark:text-gray-400';
};

const getGradientClasses = (from: string, to: string) => {
  // Предопределенные градиенты для избежания проблем с динамической генерацией
  const gradientMap: { [key: string]: string } = {
    'emerald-500_lime-600': 'bg-gradient-to-r from-emerald-500 to-lime-600',
    'teal-500_cyan-600': 'bg-gradient-to-r from-teal-500 to-cyan-600',
    'violet-500_purple-600': 'bg-gradient-to-r from-violet-500 to-purple-600',
    'blue-500_indigo-600': 'bg-gradient-to-r from-blue-500 to-indigo-600',
    'red-500_pink-600': 'bg-gradient-to-r from-red-500 to-pink-600',
  };
  
  const key = `${from}_${to}`;
  return gradientMap[key] || `bg-gradient-to-r from-${from} to-${to}`;
};

export const PageHeaderWithStats: React.FC<PageHeaderWithStatsProps> = ({
  title,
  subtitle,
  icon: Icon,
  gradientFrom,
  gradientTo,
  actionLabel,
  onAction,
  stats,
  extraActions
}) => {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-lg md:rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      <div className={`${getGradientClasses(gradientFrom, gradientTo)} px-3 sm:px-4 md:px-6 py-3 md:py-4`}>
        <div className="flex justify-between items-start md:items-center gap-2">
          <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
            <div className="p-1.5 md:p-2 bg-white/20 rounded-lg flex-shrink-0">
              <Icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-white truncate">{title}</h1>
              <p className="text-white/80 text-xs sm:text-sm truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
            {extraActions}
            {actionLabel && onAction && (
              <button 
                onClick={onAction}
                className="bg-white/20 hover:bg-white/30 text-white px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 flex items-center backdrop-blur-sm border border-white/20 hover:scale-105 shadow-lg whitespace-nowrap"
              >
                <svg className="h-3 w-3 md:h-4 md:w-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">{actionLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats Section */}
      <div className="p-3 sm:p-4 md:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
        <div className={`grid gap-4 ${
          stats.length === 1 ? 'grid-cols-1' :
          stats.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
          stats.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
          stats.length === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' :
          'grid-cols-1 md:grid-cols-3 lg:grid-cols-5'
        }`}>
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`text-lg sm:text-xl md:text-2xl font-bold ${getColorClasses(stat.color)}`}>{stat.value}</div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};