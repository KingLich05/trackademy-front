'use client';

import { useState } from 'react';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

interface AgreementModalProps {
  isOpen: boolean;
  onAgree: () => void;
  onDecline: () => void;
}

export default function AgreementModal({ isOpen, onAgree, onDecline }: AgreementModalProps) {
  const [agreementStates, setAgreementStates] = useState({
    publicOffer: false,
    privacyPolicy: false
  });

  if (!isOpen) return null;

  const handleCheckboxChange = (type: 'publicOffer' | 'privacyPolicy') => {
    setAgreementStates(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const canProceed = agreementStates.publicOffer && agreementStates.privacyPolicy;

  const handleAgree = () => {
    if (canProceed) {
      onAgree();
    }
  };

  const openDocument = (documentType: 'public-offer' | 'privacy-policy') => {
    const url = `/documents/${documentType}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />

        {/* Modal panel */}
        <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6" style={{ zIndex: 10000 }}>
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 sm:mx-0 sm:h-10 sm:w-10">
              <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white">
                СОГЛАСИЕ С ДОКУМЕНТАМИ
              </h3>
              <div className="mt-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Для продолжения работы с системой необходимо согласиться с следующими документами:
                </p>

                {/* Public Offer Agreement */}
                <div className="flex items-start space-x-3 mb-4">
                  <div className="flex items-center h-5">
                    <input
                      id="public-offer"
                      type="checkbox"
                      checked={agreementStates.publicOffer}
                      onChange={() => handleCheckboxChange('publicOffer')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  <div className="text-sm">
                    <label htmlFor="public-offer" className="font-medium text-gray-900 dark:text-white">
                      Согласен с{' '}
                      <button 
                        type="button"
                        onClick={() => openDocument('public-offer')}
                        className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 underline hover:no-underline cursor-pointer bg-transparent border-none p-0 font-medium"
                      >
                        Публичной офертой
                      </button>
                    </label>
                    <p className="text-gray-500 dark:text-gray-400">
                      Условия предоставления образовательных услуг
                    </p>
                  </div>
                </div>

                {/* Privacy Policy Agreement */}
                <div className="flex items-start space-x-3 mb-6">
                  <div className="flex items-center h-5">
                    <input
                      id="privacy-policy"
                      type="checkbox"
                      checked={agreementStates.privacyPolicy}
                      onChange={() => handleCheckboxChange('privacyPolicy')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  <div className="text-sm">
                    <label htmlFor="privacy-policy" className="font-medium text-gray-900 dark:text-white">
                      Согласен с{' '}
                      <button 
                        type="button"
                        onClick={() => openDocument('privacy-policy')}
                        className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 underline hover:no-underline cursor-pointer bg-transparent border-none p-0 font-medium"
                      >
                        Политикой конфиденциальности
                      </button>
                    </label>
                    <p className="text-gray-500 dark:text-gray-400">
                      Правила обработки персональных данных
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
            <button
              type="button"
              onClick={handleAgree}
              disabled={!canProceed}
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-3 text-base font-bold text-white sm:ml-3 sm:w-auto sm:text-sm ${
                canProceed
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  : 'bg-gray-400 cursor-not-allowed'
              } focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              ✓ ПРИНИМАЮ УСЛОВИЯ
            </button>
            <button
              type="button"
              onClick={onDecline}
              className="mt-3 w-full inline-flex justify-center rounded-md border-2 border-red-500 shadow-sm px-6 py-3 bg-white dark:bg-gray-700 text-base font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              ✗ ОТКЛОНИТЬ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}