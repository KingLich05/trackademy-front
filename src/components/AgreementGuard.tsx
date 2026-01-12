'use client';

import { useAuth } from '../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import AgreementModal from './AgreementModal';

interface AgreementGuardProps {
  children: React.ReactNode;
}

export default function AgreementGuard({ children }: AgreementGuardProps) {
  const { isAuthenticated, needsAgreement, agreeToTerms, logout, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleAgree = async () => {
    await agreeToTerms();
  };

  const handleDecline = () => {
    logout();
    router.push('/login');
  };

  // Список страниц, где не нужно показывать модалку согласия
  const excludePaths = ['/documents/public-offer', '/documents/privacy-policy'];
  const isExcludedPath = excludePaths.includes(pathname);

  // Показываем модалку только если пользователь авторизован, есть пользователь, нужно согласие, и это не исключенная страница
  const showModal = isAuthenticated && !!user && needsAgreement && !isExcludedPath;

  return (
    <>
      {children}
      <AgreementModal 
        isOpen={showModal}
        onAgree={handleAgree}
        onDecline={handleDecline}
      />
    </>
  );
}