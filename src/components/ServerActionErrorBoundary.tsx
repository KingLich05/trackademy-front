'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ServerActionErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Специально обрабатываем ошибки Server Actions
    if (error.message.includes('Failed to find Server Action')) {
      return { hasError: true, error };
    }
    throw error; // Пробрасываем другие ошибки дальше
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (error.message.includes('Failed to find Server Action')) {
      console.warn('🔄 Server Action cache mismatch detected. Reloading...', error);
      
      // Очищаем кеш и перезагружаем
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Обновление приложения
            </h2>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
              Обнаружено несоответствие версий. Страница перезагружается для применения обновлений...
            </p>
            
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Перезагрузка...</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}