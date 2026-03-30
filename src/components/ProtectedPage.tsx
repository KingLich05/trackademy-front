'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';

interface ProtectedPageProps {
  requiredRole?: string;
  children: React.ReactNode;
}

export function ProtectedPage({ requiredRole, children }: ProtectedPageProps) {
  const { user, isLoading } = useAuth();
  const { showError } = useToast();
  const router = useRouter();
  const hasShownError = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    // Проверяем права доступа для определенных ролей
    if (requiredRole && user.role !== requiredRole && user.role !== 'Administrator') {
      // Показываем ошибку только один раз
      if (!hasShownError.current) {
        hasShownError.current = true;
        showError('У вас нет прав доступа к этой странице. Обратитесь к администратору.');
        router.push('/'); // Перенаправляем на главную страницу
      }
      return;
    }
  }, [user, isLoading, requiredRole, router, showError]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'Administrator') {
    return null; // Не показываем контент, пока происходит перенаправление
  }

  return <>{children}</>;
}