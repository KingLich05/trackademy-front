'use client';

import { useAuth } from '../contexts/AuthContext';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AgreementGuard from './AgreementGuard';

interface LayoutContentProps {
  children: React.ReactNode;
}

export default function LayoutContent({ children }: LayoutContentProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const isLoginPage = pathname === '/login';

  return (
    <AgreementGuard>
      <div className="min-h-screen max-w-screen overflow-x-hidden bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-all duration-500">
        <TopBar />
        <div className="flex">
          <Sidebar />
          <main className={`flex-1 min-h-screen ${
            !isAuthenticated || isLoginPage
              ? 'p-0' 
              : 'lg:ml-64 p-2 sm:p-4 md:p-6 pb-20 lg:pb-6 pt-[84px]'
          }`}>
            <div className="max-w-full mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AgreementGuard>
  );
}